import * as vscode from 'vscode';
import * as cp from 'child_process';
import * as https from 'https';
import * as semver from 'semver';
import { URL } from 'url';

export class EffektManager {
    private statusBarItem: vscode.StatusBarItem;
    private config: vscode.WorkspaceConfiguration;
    private serverStatus: 'starting' | 'running' | 'stopped' | 'error' = 'stopped';

    constructor() {
        this.statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
        this.statusBarItem.text = 'Ξ Effekt';
        this.statusBarItem.show();
        this.config = vscode.workspace.getConfiguration("effekt");
        this.updateStatusBar();
    }

    private async execCommand(command: string): Promise<string> {
        return new Promise<string>((resolve, reject) => {
            cp.exec(command, (error: Error, stdout: string, stderr: string) => {
                if (error) {
                    reject(error);
                } else {
                    resolve(stdout.toString().trim());
                }
            });
        });
    }

    private async getLatestNpmVersion(packageName: string): Promise<string> {
        return new Promise<string>((resolve, reject) => {
            const url = new URL(`https://registry.npmjs.org/${packageName}/latest`);
            https.get(url, (res: any) => {
                let data = '';
                res.on('data', (chunk: any) => data += chunk);
                res.on('end', () => {
                    try {
                        const json = JSON.parse(data);
                        resolve(json.version);
                    } catch (error) {
                        reject(new Error('Failed to parse npm registry response'));
                    }
                });
            }).on('error', reject);
        });
    }

    public async getEffektExecutable(): Promise<string> {
        const customPath = this.config.get<string>("executable");
        if (customPath) {
            try {
                await this.execCommand(`"${customPath}" --version`);
                return customPath;
            } catch (error) {
                vscode.window.showWarningMessage(`Custom Effekt executable not found or not working: ${customPath}`);
            }
        }

        const possibleNames = ['effekt', 'effekt.sh', 'effekt.cmd'];
        
        // Check in PATH
        for (const name of possibleNames) {
            try {
                await this.execCommand(`${name} --version`);
                return name;
            } catch (error) {
                // Command not found, try the next one
            }
        }

        throw new Error('Effekt executable not found');
    }

    public async checkAndInstallEffekt(): Promise<string> {
        try {
            const effektPath = await this.getEffektExecutable();
            const currentVersion = await this.execCommand(`"${effektPath}" --version`);
            
            // Check for updates
            const latestVersion = await this.getLatestNpmVersion('effekt');
            
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
            // Effekt not found, offer to install
            return this.offerInstallEffekt();
        }
    }

    private async updateEffekt(version: string): Promise<string> {
        return vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: "Updating Effekt",
            cancellable: false
        }, async (progress) => {
            try {
                await this.execCommand('npm install -g effekt@latest');
                vscode.window.showInformationMessage(`Effekt has been updated to version ${version}.`);
                this.updateStatusBar();
                return version;
            } catch (error) {
                vscode.window.showErrorMessage('Failed to update Effekt. Please try updating manually.');
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
            vscode.window.showErrorMessage('Node.js and npm are required to install Effekt. Please install them first.');
            this.updateStatusBar();
            return '';
        }

        const latestVersion = await this.getLatestNpmVersion('effekt');
        const install = await vscode.window.showInformationMessage(
            `Effekt ${latestVersion} is available. Would you like to install it?`,
            'Yes', 'No'
        );

        if (install === 'Yes') {
            return vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: "Installing Effekt",
                cancellable: false
            }, async (progress) => {
                try {
                    await this.execCommand('npm install -g effekt');
                    vscode.window.showInformationMessage(`Effekt ${latestVersion} has been installed successfully.`);
                    this.updateStatusBar();
                    return latestVersion;
                } catch (error) {
                    vscode.window.showErrorMessage('Failed to install Effekt. Please try installing it manually.');
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
        let text = 'Ξ Effekt';
        let tooltip = 'Effekt';
        let color: vscode.ThemeColor | undefined;

        switch (this.serverStatus) {
            case 'starting':
                text += ' (Starting)';
                tooltip += ' server is starting';
                color = new vscode.ThemeColor('statusBarItem.warningBackground');
                break;
            case 'running':
                tooltip += ' server is running';
                color = new vscode.ThemeColor('statusBarItem.foreground');
                break;
            case 'stopped':
                text += ' (Stopped)';
                tooltip += ' server is stopped';
                color = new vscode.ThemeColor('statusBarItem.warningBackground');
                break;
            case 'error':
                text += ' (Error)';
                tooltip += ' server encountered an error';
                color = new vscode.ThemeColor('statusBarItem.errorBackground');
                break;
        }

        this.statusBarItem.text = text;
        this.statusBarItem.tooltip = tooltip;
        this.statusBarItem.color = color;
    }

    public getEffektCommand(): string[] {
        const args: string[] = [];

        const effektBackend = this.config.get<string>("backend");
        if (effektBackend) {
            args.push("--backend", effektBackend);
        }

        const effektLib = this.config.get<string>("lib");
        if (effektLib) {
            args.push("--lib", effektLib);
        }

        // Add each workspace folder as an include
        const folders = vscode.workspace.workspaceFolders || [];
        folders.forEach(f => {
            args.push("--includes", f.uri.fsPath);
        });

        args.push("--server");

        return args;
    }
}