import * as vscode from 'vscode';
import * as cp from 'child_process';
import * as https from 'https';
import * as semver from 'semver';
import { URL } from 'url';

/**
 * Manages Effekt installation, updates, and status within VS Code.
 */
export class EffektManager {
    private statusBarItem: vscode.StatusBarItem;
    private config: vscode.WorkspaceConfiguration;
    private serverStatus: 'starting' | 'running' | 'stopped' | 'error' = 'stopped';
    private outputChannel: vscode.OutputChannel;
    private effektNPMPackage: string = '@effekt-lang/effekt';

    constructor() {
        this.statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left);
        this.statusBarItem.text = 'Ξ Effekt';
        this.statusBarItem.show();
        this.config = vscode.workspace.getConfiguration("effekt");
        this.outputChannel = vscode.window.createOutputChannel("Effekt Version Manager");
        this.updateStatusBar();
    }

    /**
     * Executes a shell command and returns the output.
     * @param command The command to execute.
     * @returns A promise that resolves with the command output.
     */
    private async execCommand(command: string): Promise<string> {
        return new Promise<string>((resolve, reject) => {
            cp.exec(command, (error, stdout, stderr) => {
                if (error) {
                    reject(error);
                } else {
                    resolve(stdout.trim());
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
    private async getLatestNpmVersion(packageName: string): Promise<string> {
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
     * Locates the Effekt executable.
     * @returns A promise that resolves with the path to the Effekt executable.
     */
    public async getEffektExecutable(): Promise<string> {
        const customPath = this.config.get<string>("executable");
        if (customPath) {
            try {
                await this.execCommand(`"${customPath}" --version`);
                return customPath;
            } catch (error) {
                this.showErrorWithLogs(`Custom Effekt executable not working: ${customPath}. ${error}`);
            }
        }

        for (const name of ['effekt', 'effekt.sh', 'effekt.cmd']) {
            try {
                await this.execCommand(`${name} --version`);
                return name;
            } catch {
                // Try next option
            }
        }

        throw new Error('Effekt executable not found');
    }

    /**
     * Checks for Effekt updates and offers to install/update if necessary.
     * @returns A promise that resolves with the current Effekt version.
     */
    public async checkAndInstallEffekt(): Promise<string> {
        try {
            const effektPath = await this.getEffektExecutable();
            const currentVersion = await this.execCommand(`"${effektPath}" --version`);
            const latestVersion = await this.getLatestNpmVersion(this.effektNPMPackage);

            if (semver.gt(latestVersion, semver.clean(currentVersion) || '')) {
                return this.promptForAction(latestVersion, 'update');
            }

            this.updateStatusBar();
            return currentVersion;
        } catch (error) {
            if (error instanceof Error && error.message.includes('Effekt executable not found')) {
                return this.promptForAction(await this.getLatestNpmVersion(this.effektNPMPackage), 'install');
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
            return this.installOrUpdateEffekt(version, action);
        }
        this.updateStatusBar();
        return '';
    }

    /**
     * Checks if Node.js and npm are installed and meet the minimum version requirements.
     * @returns A promise that resolves with a boolean indicating if the requirements are met.
     */
    private async checkNodeAndNpm(): Promise<boolean> {
        try {
            const nodeVersion = await this.execCommand('node --version');
            await this.execCommand('npm --version'); // Note: if needed, we could also check npm version.

            const minNodeVersion = 'v12.0.0'; // Minimum supported Node.js version

            if (semver.lt(semver.clean(nodeVersion) || '', minNodeVersion)) {
                this.showErrorWithLogs(`Node.js version ${minNodeVersion} or higher is required. You have ${nodeVersion}.`);
                return false;
            }

            return true;
        } catch (error) {
            this.showErrorWithLogs(
                "Node.js and npm are required to install Effekt automatically. " +
                "Please install Node.js (which includes npm) from https://nodejs.org, then restart VSCode."
            );
            return false;
        }
    }

    /**
     * Installs or updates Effekt.
     * @param version The version to install or update to.
     * @param action The action being performed ('install' or 'update').
     * @returns A promise that resolves with the installed/updated version or an empty string.
     */
    private async installOrUpdateEffekt(version: string, action: 'install' | 'update'): Promise<string> {
        // We can only install or update Effekt if node&npm are installed!
        if (!(await this.checkNodeAndNpm())) {
            return '';
        }
 
        return vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: `${action === 'update' ? 'Updating' : 'Installing'} Effekt`,
            cancellable: false
        }, async (progress) => {
            try {
                progress.report({ increment: 0, message: 'Preparing...' });
                await this.execCommand(`npm install -g ${this.effektNPMPackage}@latest`);
                progress.report({ increment: 100, message: 'Completed' });
                
                const message = `Effekt has been ${action}d to version ${version}.`;
                vscode.window.showInformationMessage(message);
                this.logMessage('INFO', message);
                this.updateStatusBar();
                return version;
            } catch (error) {
                this.showErrorWithLogs(`Failed to ${action} Effekt: ${error}`);
                this.updateStatusBar();
                return '';
            }
        });
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
        this.statusBarItem.tooltip = config.tooltip;
        this.statusBarItem.color = config.color ? new vscode.ThemeColor(config.color) : undefined;
        this.statusBarItem.backgroundColor = config.bgColor ? new vscode.ThemeColor(config.bgColor) : undefined;
        this.statusBarItem.show();
    }

    /**
     * Gets the command arguments for starting the Effekt server.
     * @returns An array of command arguments.
     */
    public getEffektCommand(): string[] {
        const args: string[] = [];
        const effektBackend = this.config.get<string>("backend");
        const effektLib = this.config.get<string>("lib");

        if (effektBackend) args.push("--backend", effektBackend);
        if (effektLib) args.push("--lib", effektLib);

        const folders = vscode.workspace.workspaceFolders || [];
        folders.forEach(folder => args.push("--includes", folder.uri.fsPath));

        args.push("--server");
        return args;
    }
}