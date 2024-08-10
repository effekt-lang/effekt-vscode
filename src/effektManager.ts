import * as vscode from 'vscode';
import * as cp from 'child_process';
import * as https from 'https';
import * as semver from 'semver';
import { URL } from 'url';

export class EffektManager {
    private statusBarItem: vscode.StatusBarItem;
    private config: vscode.WorkspaceConfiguration;
    private serverStatus: 'starting' | 'running' | 'stopped' | 'error' = 'stopped';
    private outputChannel: vscode.OutputChannel;
    private effektNPMPackage: string = '@effekt-lang/effekt'

    constructor() {
        this.statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left);
        this.statusBarItem.text = 'Ξ Effekt';
        this.statusBarItem.show();
        this.config = vscode.workspace.getConfiguration("effekt");
        this.outputChannel = vscode.window.createOutputChannel("Effekt Version Manager");
        this.updateStatusBar();
    }

    private execCommand(command: string): Promise<string> {
        return new Promise<string>((resolve, reject) => {
            cp.exec(command, (error, stdout, stderr) => {
                if (error) {
                    const errorMessage = `Failed to execute command: ${command}. Error: ${error.message}`;
                    this.logError(errorMessage);
                    reject(new Error(errorMessage));
                } else {
                    resolve(stdout.trim());
                }
            });
        });
    }    

    private logError(message: string) {
        this.outputChannel.appendLine(`[${new Date().toISOString()}] ERROR: ${message}`);
    }

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
                        const errorMessage = `Failed to parse npm registry response: ${error}`;
                        this.logError(errorMessage);
                        reject(new Error(errorMessage));
                    }
                });
            }).on('error', (error) => {
                const errorMessage = `Failed to fetch latest version from npm: ${error}`;
                this.logError(errorMessage);
                reject(new Error(errorMessage));
            });
        });
    }

    public async getEffektExecutable(): Promise<string> {
        const customPath = this.config.get<string>("executable");
        if (customPath) {
            try {
                await this.execCommand(`"${customPath}" --version`);
                return customPath;
            } catch (error) {
                const errorMessage = `Custom Effekt executable not found or not working: ${customPath}. Error: ${error}`;
                this.logError(errorMessage);
                vscode.window.showWarningMessage(errorMessage, 'View Logs')
                    .then(selection => {
                        if (selection === 'View Logs') {
                            this.outputChannel.show();
                        }
                    });
            }
        }

        const possibleNames = ['effekt', 'effekt.sh', 'effekt.cmd'];
        for (const name of possibleNames) {
            try {
                await this.execCommand(`${name} --version`);
                return name;
            } catch {
                // Try next option
            }
        }

        const errorMessage = 'Effekt executable not found';
        this.logError(errorMessage);
        throw new Error(errorMessage);
    }

    public async checkAndInstallEffekt(): Promise<string> {
        try {
            const effektPath = await this.getEffektExecutable();
            const currentVersion = await this.execCommand(`"${effektPath}" --version`);
            const latestVersion = await this.getLatestNpmVersion('@effekt-lang/effekt');

            if (semver.gt(latestVersion, currentVersion)) {
                const update = await vscode.window.showInformationMessage(
                    `A new version of Effekt is available (${latestVersion}). Would you like to update?`,
                    'Yes', 'No'
                );

                if (update === 'Yes') {
                    return this.updateEffekt(latestVersion);
                }
            }

            this.updateStatusBar();
            return currentVersion;
        } catch (error) {
            this.logError(`Failed to check or install Effekt: ${error}`);
            return this.offerInstallEffekt();
        }
    }

    // TODO: refactor, merge with offerInstallEffekt
    private async updateEffekt(version: string): Promise<string> {
        return vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: "Updating Effekt",
            cancellable: false
        }, async () => {
            try {
                await this.execCommand(`npm install -g ${this.effektNPMPackage}@latest`);
                vscode.window.showInformationMessage(`Effekt has been updated to version ${version}.`);
                this.updateStatusBar();
                return version;
            } catch (error) {
                const errorMessage = `Failed to update Effekt: ${error}`;
                this.logError(errorMessage);
                vscode.window.showErrorMessage(errorMessage, 'View Logs')
                    .then(selection => {
                        if (selection === 'View Logs') {
                            this.outputChannel.show();
                        }
                    });
                this.updateStatusBar();
                return '';
            }
        });
    }

    private async offerInstallEffekt(): Promise<string> {
        try {
            await this.execCommand('node --version');
            await this.execCommand('npm --version');
        } catch (error) {
            const errorMessage = `Node.js and npm are required to install Effekt. Please install them first. Error: ${error}`;
            this.logError(errorMessage);
            vscode.window.showErrorMessage(errorMessage, 'View Logs')
                .then(selection => {
                    if (selection === 'View Logs') {
                        this.outputChannel.show();
                    }
                });
            this.updateStatusBar();
            return '';
        }

        const latestVersion = await this.getLatestNpmVersion(this.effektNPMPackage);
        const install = await vscode.window.showInformationMessage(
            `Effekt ${latestVersion} is available. Would you like to install it?`,
            'Yes', 'No'
        );

        if (install === 'Yes') {
            return vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: "Installing Effekt",
                cancellable: false
            }, async () => {
                try {
                    await this.execCommand(`npm install -g ${this.effektNPMPackage}@latest`);
                    vscode.window.showInformationMessage(`Effekt ${latestVersion} has been installed successfully.`);
                    this.updateStatusBar();
                    return latestVersion;
                } catch (error) {
                    const errorMessage = `Failed to install Effekt: ${error}`;
                    this.logError(errorMessage);
                    vscode.window.showErrorMessage(errorMessage, 'View Logs')
                        .then(selection => {
                            if (selection === 'View Logs') {
                                this.outputChannel.show();
                            }
                        });
                    this.updateStatusBar();
                    return '';
                }
            });
        }

        this.updateStatusBar();
        return '';
    }

    public updateServerStatus(status: 'starting' | 'running' | 'stopped' | 'error') {
        this.serverStatus = status;
        this.updateStatusBar();
    }

    private updateStatusBar() {
        let icon = "";
        let tooltip = "";
    
        switch (this.serverStatus) {
            case 'starting':
                icon = "$(loading~spin) ";
                tooltip = "Effekt server is starting...";
                this.statusBarItem.color = undefined;
                this.statusBarItem.backgroundColor = undefined;
                break;
            case 'running':
                icon = "$(check) ";
                tooltip = "Effekt server is running.";
                this.statusBarItem.color = undefined;
                this.statusBarItem.backgroundColor = undefined;
                break;
            case 'stopped':
                icon = "$(debug-stop) ";
                tooltip = "Effekt server is stopped.";
                this.statusBarItem.color = new vscode.ThemeColor("statusBarItem.warningForeground");
                this.statusBarItem.backgroundColor = new vscode.ThemeColor("statusBarItem.warningBackground");
                break;
            case 'error':
                icon = "$(error) ";
                tooltip = "Effekt server encountered an error.";
                this.statusBarItem.color = new vscode.ThemeColor("statusBarItem.errorForeground");
                this.statusBarItem.backgroundColor = new vscode.ThemeColor("statusBarItem.errorBackground");
                break;
        }
    
        this.statusBarItem.text = `Ξ Effekt ${icon}`;
        this.statusBarItem.tooltip = tooltip;
        this.statusBarItem.show();
    }

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
