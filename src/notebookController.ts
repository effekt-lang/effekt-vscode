import * as vscode from 'vscode';
import { LanguageClient, ExecuteCommandRequest } from 'vscode-languageclient/node';
import { exec } from 'child_process';
import * as util from 'util';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { EffektManager } from './effektManager';

// convert callback-based method exec to promise-based 
const execPromise = util.promisify(exec); 

export class Controller {
    readonly controllerId = 'notebook-controller_id';
    readonly notebookType = 'effekt-notebook';
    readonly label = 'My Effekt Notebook';
    readonly supportedLanguages = ['effekt'];

    private readonly _controller: vscode.NotebookController;
    private _executionOrder = 0;
    private readonly client: LanguageClient;
    private readonly effektManager: EffektManager;

    constructor(client: LanguageClient, effektManager: EffektManager) {
        this._controller = vscode.notebooks.createNotebookController(
            this.controllerId,
            this.notebookType,
            this.label
        );

        this.client = client;
        this.effektManager = effektManager;
        this._controller.supportedLanguages = this.supportedLanguages;
        this._controller.supportsExecutionOrder = true;
        this._controller.executeHandler = this._execute.bind(this);
    }

    dispose(): void{
        this._controller.dispose();
    }

    private _execute(
        cells: vscode.NotebookCell[],
        _notebook: vscode.NotebookDocument,
        _controller: vscode.NotebookController
    ): void {
        for (let cell of cells) {
            this._doExecution(cell);
        }
    }

    // Executes a temporary file generated from the cell content, using Effekt CLI (similar to runEffektFile)
    private async runEffektCLI(tmpUri: vscode.Uri): Promise<string> {
        const effektExecutable = await this.effektManager.locateEffektExecutable();
        const args = [tmpUri.fsPath, ...this.effektManager.getEffektArgs()];

        const command = `${effektExecutable.path} ${args.join(' ')}`;
        console.log('Running command:', command);

        const { stdout, stderr } = await execPromise(command);

        if (stderr) {
            console.error('Effekt Error:', stderr);
            return stderr;
        }

        return stdout;
    }

    // runs the content of a cell when user clicks Run, and updates the cell output
    private async _doExecution(cell: vscode.NotebookCell): Promise<void> {
        const execution = this._controller.createNotebookCellExecution(cell);
        execution.executionOrder = ++this._executionOrder;
        execution.start(Date.now()); // Keep track of elapsed time to execute cell.

        /* Do execution here */
        try {            
            // Syntax check request to server
            // TODO: move this to main file ? 
            const cellClient = await this.client.sendRequest(ExecuteCommandRequest.type, 
                { command: "compileCell", arguments: [{
                uri: cell.document.uri.toString()
            }]})

            // Create a temporary file with cell content, which will be deleted afterwards
            const cellContent = cell.document.getText();
            const tmpDir = os.tmpdir();
            const tmpFilePath = path.join(tmpDir, `effekt_cell.effekt`);

            await fs.promises.writeFile(tmpFilePath, cellContent);
            
            const tmpUri = vscode.Uri.file(tmpFilePath);
            
            // execute temporary file 
            const result = await this.runEffektCLI(tmpUri);

            execution.replaceOutput(new vscode.NotebookCellOutput([
                vscode.NotebookCellOutputItem.text(result, 'text/plain')
            ]));
        } catch (error: any) {
            execution.replaceOutput([
                new vscode.NotebookCellOutput([
                    vscode.NotebookCellOutputItem.error(error)
                ])
            ])
        }
        execution.end(true, Date.now());
    }
}
