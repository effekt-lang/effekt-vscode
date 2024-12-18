import * as vscode from 'vscode';
import * as vm from 'node:vm'; 
import { LanguageClient, ExecuteCommandRequest} from 'vscode-languageclient';

export class Controller {
    readonly controllerId = 'notebook-controller_id';
    readonly notebookType = 'effekt-notebook';
    readonly label = 'My Effekt Notebook';
    readonly supportedLanguages = ['effekt', 'javascript'];

    private readonly _controller: vscode.NotebookController;
    private _executionOrder = 0;
    //private executionContext: vm.Context;
    private readonly client: LanguageClient;

    constructor(client: LanguageClient) {
        this._controller = vscode.notebooks.createNotebookController(
            this.controllerId,
            this.notebookType,
            this.label
        );

        this.client = client;
        //this.executionContext = vm.createContext();
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

    private async _doExecution(cell: vscode.NotebookCell): Promise<void> {
        const execution = this._controller.createNotebookCellExecution(cell);
        execution.executionOrder = ++this._executionOrder;
        execution.start(Date.now()); // Keep track of elapsed time to execute cell.

        /* Do some execution here */
        try {
            //const outputData = eval(cell.document.getText());
            
            const cellContent = cell.document.getText();
            console.log(cellContent);
            console.log(cell.document.uri.toString());
            // request to server 
            const result = await this.client.sendRequest(ExecuteCommandRequest.type, 
                { command: "compileCell", arguments: [{
                uri: cell.document.uri.toString(),
                content: cellContent
            }]})
            console.log("Result:" + result);
        

            //create virtual machine of Node.js to interpret js
            //const script = new vm.Script(result);
            //const outputData = script.runInContext(this.executionContext);

            execution.replaceOutput([
                new vscode.NotebookCellOutput([
                        vscode.NotebookCellOutputItem.text(result)
                        //vscode.NotebookCellOutputItem.json(result)
                    ])
            ]);
        } catch (error: any) {
            execution.replaceOutput([
                new vscode.NotebookCellOutput([
                    //vscode.NotebookCellOutputItem.text("Error: "+ error.toString())
                    vscode.NotebookCellOutputItem.text("Error")
                ])
            ])
        }
        execution.end(true, Date.now());
    }
}
