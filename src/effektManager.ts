import * as vscode from 'vscode';
import * as cp from 'child_process';
import * as https from 'https';
import { compare as compareVersion } from 'compare-versions';
import { URL } from 'url';
import * as path from 'path';
import * as fs from 'fs/promises';

interface InstallationResult {
    success: boolean;
    executable?: string;
    message: string;
    version?: string;
}

interface EffektExecutableInfo {
    path: string;
    version: string;
}

/**
 * Manages Effekt installation, updates, and status within VS Code.
 */
export class EffektManager {
    private statusBarItem: vscode.StatusBarItem;
    private config: vscode.WorkspaceConfiguration;
    private serverStatus: 'starting' | 'running' | 'stopped' | 'error' = 'stopped';
    private outputChannel: vscode.OutputChannel;
    private effektVersion: string | null = null;

    private readonly effektNPMPackage: string = '@effekt-lang/effekt';
    private readonly possibleEffektExecutables =
        process.platform === 'win32'
            ? ['effekt.cmd', 'effekt', 'effekt.sh']  // On Windows, try 'effekt.cmd' first.
            : ['effekt', 'effekt.sh', 'effekt.cmd'];

    constructor() {
        this.statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left);
        this.statusBarItem.text = 'Ξ Effekt';
        this.statusBarItem.command = 'effekt.checkForUpdates';
        this.statusBarItem.show();
        this.config = vscode.workspace.getConfiguration("effekt");
        this.outputChannel = vscode.window.createOutputChannel("Effekt Version Manager");
        this.updateStatusBar();
    }

    /**
     * Get the Effekt version of the (assumed) Effekt binary in the `path` parameter.
     * Doesn't handle any errors, the *caller* is expected to do so.
     *
     * @returns a version number like '0.2.2' or '0.25.2.13' or '0.99.99+nightly.rev.abcdef', etc.
     */
    private async fetchEffektVersion(path: string): Promise<string> {
        /// Helper function to remove a generic prefix from a string
        const removePrefix = (value: string, prefix: string) =>
            value.startsWith(prefix) ? value.slice(prefix.length) : null;

        try {
            // First, try `effekt --version`:
            const versionOutput = await this.execCommand(`"${path}" --version`);

            const version = removePrefix(versionOutput.trim(), "Effekt "); // NOTE: the space is important here
            if (!version) {
                throw new Error(`Output of '${path} --version' is not in the correct format 'Effekt 0.1.2'; got '${versionOutput}' instead.`);
            }
            return version;
        } catch (versionError) {
            // Otherwise try `effekt --help`:
            try {
                const helpOutput = await this.execCommand(`"${path}" --help`);

                // Check if the output contains the word "Effekt" anywhere
                if (/\bEffekt\b/i.test(helpOutput)) {
                    return "0.2.2"; // XXX: Hardcoded, 0.2.2 is the last version of Effekt without `--version`.
                }
            } catch (helpError) {
                // If both `--version` and `--help` fail, throw an error
                throw new Error(`Failed to determine Effekt version: ${versionError}\nHelp command also failed: ${helpError}`);
            }
        }

        // If we reach this point, it means --help succeeded but didn't contain "Effekt"
        throw new Error("Unable to determine Effekt version");
    }

    /**
     * Executes a shell command and returns the output.
     * @param command The command to execute.
     * @param resolveWithStderr If true, the promise is resolved with combined stdout and stderr.
     * @returns A promise that resolves with the command output.
     */
    private async execCommand(command: string, resolveWithStderr?: boolean): Promise<string> {
        return new Promise<string>((resolve, reject) => {
            cp.exec(command, { encoding: 'utf8', maxBuffer: 1024 * 1024 }, (error, stdout, stderr) => {
                if (error) {
                    reject(error);
                } else {
                    const output = stdout.trim() + (resolveWithStderr ? stderr.trim() : '');
                    resolve(output);
                }
            });
        });
    }

    /**
     * Logs a message to the output channel.
     * @param level The log level ('INFO' or 'ERROR').
     * @param message The message to log.
     */
    private logMessage(level: 'INFO' | 'ERROR', message: string) {
        this.outputChannel.appendLine(`[${new Date().toISOString()}] ${level}: ${message}`);
    }

    /**
     * Fetches the latest version of a package from npm.
     * @param packageName The name of the npm package.
     * @returns A promise that resolves with the latest version string.
     */
    private async getLatestNPMVersion(packageName: string): Promise<string> {
        return new Promise<string>((resolve, reject) => {
            const url = new URL(`https://registry.npmjs.org/${packageName}/latest`);
            https.get(url, (res) => {
                let data = '';
                res.on('data', (chunk) => data += chunk);
                res.on('end', () => {
                    try {
                        const json = JSON.parse(data);
                        resolve(json.version);
                    } catch (error) {
                        reject(new Error(`Failed to parse npm registry response: ${error}`));
                    }
                });
            }).on('error', (error) => {
                reject(new Error(`Failed to fetch latest version from npm: ${error}`));
            });
        });
    }

    /**
     * Locates the Effekt executable: tries to look into user given path first, then tries 'possibleEffektExecutables' in PATH.
     */
    public async locateEffektExecutable(): Promise<EffektExecutableInfo> {
        const customEffektPath = this.config.get<string>("executable");
        if (customEffektPath) {
            try {
                const version = await this.fetchEffektVersion(customEffektPath);
                this.logMessage('INFO', `Located executable at custom path ${customEffektPath} with version ${version}`);
                return { path: customEffektPath, version };
            } catch (error) {
                this.showErrorWithLogs(`Custom Effekt executable not working: ${customEffektPath}. ${error}`);
            }
        }

        for (const effektPath of this.possibleEffektExecutables) {
            try {
                const version = await this.fetchEffektVersion(effektPath);
                this.logMessage('INFO', `Located executable at path ${effektPath} with version ${version}`);
                return { path: effektPath, version };
            } catch {
                // Try next option
            }
        }

        throw new Error('Effekt executable not found');
    }

    /**
     * Installs or updates Effekt.
     * @param version The version to install or update to.
     * @param action The action being performed ('install' or 'update').
     * @returns A promise that resolves with the installed/updated version or an empty string.
     */
    private async installOrUpdateEffekt(version: string, action: 'install' | 'update'): Promise<string> {
        if (!(await this.checkJava())) {
            this.logMessage('INFO', 'Java is not installed.');
            return '';
        }
        if (!(await this.checkNodeAndNpm())) {
            this.logMessage('INFO', 'Node / npm are not installed.');
            return '';
        }

        return vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: `${action === 'update' ? 'Updating' : 'Installing'} Effekt`,
            cancellable: false
        }, async (progress) => {
            try {
                progress.report({ increment: 0, message: 'Preparing...' });
                await this.runNpmInstall();
                progress.report({ increment: 50, message: 'Verifying installation...' });

                const verificationResult = await this.verifyEffektInstallation();
                progress.report({ increment: 100, message: 'Completed' });

                this.handleInstallationResult(verificationResult, action);
                return verificationResult.success ? verificationResult.version || '' : '';
            } catch (error) {
                this.showErrorWithLogs(`Failed to ${action} Effekt: ${error}`);
                this.updateStatusBar();
                return '';
            }
        });
    }

    private async runNpmInstall(): Promise<void> {
        // 1) Check if the npm root is managed by Nix in order to produce a better error
        const npmRoot = await this.execCommand('npm root -g');
        if (npmRoot.startsWith("/nix/store")) {
            this.logMessage('ERROR', 'NPM root is in the read-only Nix store. Installation is not possible.');
            throw new Error('Detected Nix environment: NPM global modules are stored in a read-only directory managed by Nix. Installation cannot proceed.');
        }

        // 2) Actually run `npm install -g ...`
        const npmInstallCommand = `npm install -g ${this.effektNPMPackage}@latest`;
        const npmOutput = await this.execCommand(npmInstallCommand);

        this.logMessage('INFO', `Ran '${npmInstallCommand}'; stdout: ${npmOutput}`);
    }

    private async verifyEffektInstallation(): Promise<InstallationResult> {
        try {
            const { path: execPath, version } = await this.locateEffektExecutable();
            return {
                success: true,
                executable: execPath,
                message: `Effekt found successfully in ${execPath}.`,
                version
            };
        } catch (error) {
            // If locateEffektExecutable fails, try to locate in global npm directory
            const npmRoot = await this.execCommand('npm root -g');

            for (const execName of this.possibleEffektExecutables) {
                const fullPath = path.join(npmRoot, execName);
                if (await this.fileExists(fullPath)) {
                    try {
                        const version = await this.fetchEffektVersion(fullPath);
                        return {
                            success: true,
                            executable: fullPath,
                            message: `Effekt found at ${fullPath}, but not in PATH.`,
                            version
                        };
                    } catch {
                        // Executable exists but doesn't work, continue to next
                    }
                }
            }

            return {
                success: false,
                message: "Effekt was installed but couldn't be located or executed. Please check your installation."
            };
        }
    }

    private async fileExists(filePath: string): Promise<boolean> {
        try {
            await fs.access(filePath);
            return true;
        } catch {
            return false;
        }
    }

    private handleInstallationResult(result: InstallationResult, action: 'install' | 'update'): void {
        if (result.success && result.version) {
            const baseMessage = `Effekt has been ${action === 'update' ? 'updated' : 'installed'} to version ${result.version}.`;

            if (result.executable && !result.executable.includes(path.sep)) {
                // Effekt is in PATH
                vscode.window.showInformationMessage(baseMessage);
                this.logMessage('INFO', baseMessage);
            } else {
                // Effekt is not in PATH
                const fullMessage = `${baseMessage}\n${result.message}\nConsider adding it to your PATH for easier access.`;
                vscode.window.showWarningMessage(fullMessage, 'View Logs')
                    .then(selection => {
                        if (selection === 'View Logs') {
                            this.outputChannel.show();
                        }
                    });
                this.logMessage('INFO', fullMessage);
            }
            this.effektVersion = result.version;
        } else {
            this.showErrorWithLogs(result.message);
        }

        this.updateStatusBar();
    }

    /**
     * Checks for Effekt updates and offers to install/update if necessary.
     * @returns A promise that resolves with the current Effekt version.
     */
    public async checkForUpdatesAndInstall(): Promise<string> {
        try {
            const effektPath = await this.locateEffektExecutable();
            if (!this.effektVersion) {
                const currentVersion = await this.fetchEffektVersion(effektPath.path);
                this.effektVersion = currentVersion;
            }

            const latestVersion = await this.getLatestNPMVersion(this.effektNPMPackage);

            // check if the latest version strictly newer than the current version
            if (!this.effektVersion || compareVersion(latestVersion, this.effektVersion, '>')) {
                return this.promptForAction(latestVersion, 'update');
            }

            this.updateStatusBar();
            return this.effektVersion || '';
        } catch (error) {
            if (error instanceof Error && error.message.includes('Effekt executable not found')) {
                const latestVersion = await this.getLatestNPMVersion(this.effektNPMPackage);
                return this.promptForAction(latestVersion, 'install');
            } else {
                this.showErrorWithLogs(`Failed to check Effekt: ${error}`);
                return '';
            }
        }
    }

    /**
     * Prompts the user to perform an action (install or update) and executes it if confirmed.
     * @param version The version to install or update to.
     * @param action The action to perform ('install' or 'update').
     * @returns A promise that resolves with the installed/updated version or an empty string.
     */
    private async promptForAction(version: string, action: 'install' | 'update'): Promise<string> {
        const message = action === 'update'
            ? `A new version of Effekt is available (${version}). Would you like to update?`
            : `Effekt ${version} is available. Would you like to install it?`;

        const response = await vscode.window.showInformationMessage(message, 'Yes', 'No');
        if (response === 'Yes') {
            const installedVersion = await this.installOrUpdateEffekt(version, action);
            if(installedVersion != ''){
                // After installation or update is complete, offer to open the changelog
                const changelogMessage = `Effekt ${installedVersion} has been updated. Would you like to view the changelog?`;
                const changelogResponse = await vscode.window.showInformationMessage(changelogMessage, 'Yes', 'No');

                if (changelogResponse === 'Yes') {
                    const changelogUrl = `https://github.com/effekt-lang/effekt/releases/tag/v${installedVersion}`;
                    vscode.env.openExternal(vscode.Uri.parse(changelogUrl));
                }
            }
        }
        this.updateStatusBar();
        return this.effektVersion || '';
    }

    /**
     * Checks if Node.js and npm are installed and meet the minimum version requirements.
     * @returns A promise that resolves with a boolean indicating if the requirements are met.
     */
    private async checkNodeAndNpm(): Promise<boolean> {
        try {
            const nodeVersion = await this.execCommand('node --version');
            await this.execCommand('npm --version'); // Note: if needed, we could also check npm version.

            const minNodeVersion = 'v16.0.0'; // Minimum supported Node.js version

            if (compareVersion(nodeVersion, minNodeVersion, '<')) {
                this.showErrorWithLogs(`Node.js version ${minNodeVersion} or higher is required. You have ${nodeVersion}.`);
                return false;
            }

            this.logMessage("INFO", `Found Node.js version ${nodeVersion}`);

            return true;
        } catch (error) {
            this.showErrorWithLogs(
                "Node.js and npm are required to install Effekt automatically. " +
                "Please install Node.js (which includes npm), then restart VSCode."
            );
            return false;
        }
    }

    /**
     * Checks if Java is installed and meets the minimum version requirement.
     * @returns A promise that resolves with a boolean indicating if the requirements are met.
     */
    private async checkJava(): Promise<boolean> {
        try {
            const javaVersion = await this.getJavaVersion();
            const minJavaVersion = '11.0.0'; // Minimum supported Java version

            if (compareVersion(javaVersion, minJavaVersion, '<')) {
                this.showErrorWithLogs(`Java version ${minJavaVersion} or higher is required. You have ${javaVersion}.`);
                return false;
            }

            this.logMessage("INFO", `Found Java version ${javaVersion}`);

            return true;
        } catch (error) {
            this.logMessage("ERROR", `When checking Java version got: ${error}`);

            this.showErrorWithLogs(
                "Java (JRE) is required to run Effekt. " +
                "Please install Java, then restart VSCode."
            );
            return false;
        }
    }

    /**
     * Extracts the Java version from the output of 'java -version' command.
     * @returns A promise that resolves with the Java version string.
     */
    private async getJavaVersion(): Promise<string> {
        try {
            const output = await this.execCommand('java -version', true);

            this.logMessage('INFO', `Got ${output} from 'java -version'`);

            // Regular expressions to match different Java version formats
            const versionRegexes = [
                /version "((\d+\.\d+\.\d+).*?)"/, // Standard format: "11.0.2" or "1.8.0_292"
                /version "((\d+).*?)"/, // OpenJDK format on some systems: "11" or "11-internal"
                /(\d+\.\d+\.\d+)/,  // Fallback for version without quotes
            ];

            let version = '';
            for (const regex of versionRegexes) {
                const match = output.match(regex);
                if (match) {
                    version = match[2] || match[1]; // Prefer the version number without extra info
                    break;
                }
            }

            if (!version) {
                throw new Error('Unable to extract Java version from output');
            }

            // Handle special cases like "1.8.0_292" for Java 8
            if (version.startsWith('1.')) {
                version = version.split('.')[1];
            }

            // Remove any additional info after the version number
            version = version.split('-')[0].split('_')[0];

            return version;
        } catch (error) {
            throw new Error(`Failed to execute 'java -version': ${error}`);
        }
    }

    /**
     * Shows an error message with an option to view logs.
     * @param message The error message to show.
     */
    private showErrorWithLogs(message: string) {
        const trimmedMessage = this.trimErrorMessage(message);
        this.logMessage('ERROR', message);  // Log the full message
        vscode.window.showErrorMessage(trimmedMessage, 'View Logs')
            .then(selection => {
                if (selection === 'View Logs') {
                    this.outputChannel.show();
                }
            });
    }

    /**
     * Trims an error message to a reasonable length.
     * @param message The message to trim.
     * @returns The trimmed message.
     */
    private trimErrorMessage(message: string): string {
        const maxLength = 160;
        if (message.length <= maxLength) return message;
        return message.substring(0, maxLength) + '... (see logs for full message)';
    }

    /**
     * Updates the server status.
     * @param status The new server status.
     */
    public updateServerStatus(status: 'starting' | 'running' | 'stopped' | 'error') {
        this.serverStatus = status;
        this.updateStatusBar();
    }

    /**
     * Updates the status bar item based on the current server status.
     */
    private updateStatusBar() {
        const statusConfig = {
            'starting': { icon: "$(loading~spin) ", tooltip: "Effekt server is starting...", color: undefined, bgColor: undefined },
            'running': { icon: "$(check) ", tooltip: "Effekt server is running.", color: undefined, bgColor: undefined },
            'stopped': { icon: "$(stop-circle) ", tooltip: "Effekt server is stopped.", color: "statusBarItem.warningForeground", bgColor: "statusBarItem.warningBackground" },
            'error': { icon: "$(error) ", tooltip: "Effekt server encountered an error.", color: "statusBarItem.errorForeground", bgColor: "statusBarItem.errorBackground" }
        };

        const config = statusConfig[this.serverStatus];
        this.statusBarItem.text = `Ξ Effekt ${config.icon}`;
        this.statusBarItem.tooltip = new vscode.MarkdownString(`${config.tooltip}\n\n`
            + `_Click to check for updates_\n\n`
            + `---\n`
            + `**Effekt Information:**\n`
            + `- Version: ${this.effektVersion || '<unknown>'}\n`
            + `- Status: ${this.serverStatus}\n`
            + `- Backend: ${this.config.get<string>("backend") || '<unknown>'}`);
        this.statusBarItem.tooltip.isTrusted = true;

        this.statusBarItem.color = config.color ? new vscode.ThemeColor(config.color) : undefined;
        this.statusBarItem.backgroundColor = config.bgColor ? new vscode.ThemeColor(config.bgColor) : undefined;
        this.statusBarItem.show();
    }

    /**
     * Gets the command arguments for starting Effekt.
     * @returns An array of command arguments.
     */
    public getEffektArgs(): string[] {
        const args: string[] = [];
        const effektBackend = this.config.get<string>("backend");
        const effektLib = this.config.get<string>("lib");

        if (effektBackend) args.push("--backend", effektBackend);
        if (effektLib) args.push("--lib", effektLib);

        const folders = vscode.workspace.workspaceFolders || [];
        folders.forEach(folder => args.push("--includes", folder.uri.fsPath));

        return args;
    }
}