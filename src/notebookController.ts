import { ChildProcessWithoutNullStreams, spawn } from 'child_process';
import * as vscode from 'vscode';
import { LanguageClient, /*ExecuteCommandRequest*/ } from 'vscode-languageclient/node';

let replSession: ChildProcessWithoutNullStreams | null = null;

function startREPL(): Promise<void>{
    // spawn new repl
    replSession = spawn('effekt.sh', [], { stdio:'pipe', shell: true });
    console.log("REPL session started");

    // ignore welcome banner
    let initBuffer = '';
    return new Promise(resolve => {
        const onInit = (data: Buffer) => {
            initBuffer += data.toString();
            if(initBuffer.includes('\n>')){
                replSession?.stdout.off('data', onInit);
                console.log("Swallowed welcome banner: \n"+initBuffer.trim());
                resolve();
            }
        };
        replSession!.stdout.on('data', onInit);

        replSession!.on('close', (code) => {
            console.log(`REPL process exited with code ${code}`);
        });
        replSession!.on('error', (error) => {
            console.error(`Error starting REPL process: ${error}`);
        });
    });
}
function stopREPL(){
    if(replSession) {
        replSession.kill();
        replSession = null;
        console.log("REPL session stopped");
    }
}

function exeCellREPL(cellCode: string): Promise<string> {
    return new Promise((resolve, reject) => {
        if (!replSession) {
            reject("REPL session not started");
            return;
        }

        // flat out the cell code
        const flatCode = cellCode
         .split('\n')
         .map(line => line.trim())
         .filter(line => line)
         .join(' ');

        // Buffer the output until we see ">"
        let outputBuffer = '';
       
        const onData = (chunk: Buffer) => {
            const text = chunk.toString();
            outputBuffer += text;

            // check if REPL has finished processing => buffer ends with ">"
            if(outputBuffer.trim().endsWith('>')){
                const lines = outputBuffer.split('\n');
                
                //filter out any lines 
                const resultLines = lines
                    .filter(l => {
                    const t = l.trim();
                    
                    // ignore next promt line
                    if (t === ">" || t.startsWith(">")) return false;

                    //ignore input content , so it will not be shown in output cell
                    if (t === flatCode.trim()) return false;

                    // keep non-empty lines
                    return t.length > 0;
                    });
                
                // join the filtered lines back into on string
                const result = resultLines.join("\n").trim();
                
                // remove listeners so future REPL output doesn't trigger again
                cleanup();
                outputBuffer = '';
                
                // return executed cell content
                resolve(result);
            }

        };

        // Handler for stderr
        const onStderr = (error: Buffer) => {
            cleanup();
            reject(new Error(error.toString()));
        };

        // Remove listeners when REPL sends output or error
        const cleanup = () => {
            replSession?.stdout.off('data', onData);
            replSession?.stderr.off('data', onStderr);
        };

        // Attach listeners to the REPL process
        replSession.stdout.on('data', onData);
        replSession.stderr.on('data', (buf: Buffer) => {
            // ignore "Debugger attached" message
            const text = buf.toString();
            if(text.includes('ebugger')) {
                return;
            }
            console.error("stderr:" + text);
        });
        
        // Send cell content to REPL
        replSession.stdin.write(flatCode + '\n');
    });
}

// check if REPL already started
function isREPLActive(): boolean {
    return replSession !== null;
}

export class Controller {
    readonly controllerId = 'notebook-controller_id';
    readonly notebookType = 'effekt-notebook';
    readonly label = 'My Effekt Notebook';
    readonly supportedLanguages = ['effekt'];

    private readonly _controller: vscode.NotebookController;
    private _executionOrder = 0;
    //private readonly client: LanguageClient;

    constructor(client: LanguageClient) {
        this._controller = vscode.notebooks.createNotebookController(
            this.controllerId,
            this.notebookType,
            this.label
        );

        //this.client = client;
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

    // runs the content of a cell when user clicks Run, and updates the cell output
    private async _doExecution(cell: vscode.NotebookCell): Promise<void> {
        const execution = this._controller.createNotebookCellExecution(cell);
        execution.executionOrder = ++this._executionOrder;
        execution.start(Date.now()); // Keep track of elapsed time to execute cell.

        /* Do execution here */
        try {            
            const cellContent = cell.document.getText();
    
            var result = "";

            //start REPL session
            if(!isREPLActive()) {
                await startREPL();
            } 

            //send cell content to REPL
            result = (await exeCellREPL(cellContent)).toString();

            execution.replaceOutput(new vscode.NotebookCellOutput([
                vscode.NotebookCellOutputItem.text(result)
            ]));         
        } catch (error: any) {
            execution.replaceOutput([
                new vscode.NotebookCellOutput([
                    vscode.NotebookCellOutputItem.error(error)
                ])
            ]);
            stopREPL();
        }
        execution.end(true, Date.now());
    }
}
