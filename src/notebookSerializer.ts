import { TextDecoder, TextEncoder } from "util";
import * as vscode from 'vscode';
  
interface RawNotebookCell {
    kind: vscode.NotebookCellKind;
    value: string;
    language: string;
    //outputs: RawCellOutput[];
}

export class NotebookSerializer implements vscode.NotebookSerializer {
    // Data from file to notebook data
    async deserializeNotebook(content: Uint8Array, _token: vscode.CancellationToken): Promise<vscode.NotebookData> {
        const jsString = new TextDecoder().decode(content);
        let raw: RawNotebookCell[] = [];
        try {
            raw = JSON.parse(jsString);
        } catch {
            raw = [];
        }
    
        // create array of cells from file content
        const cells = raw.map(item => 
            new vscode.NotebookCellData(
                item.kind, 
                item.value,
                item.language
            )
        );
        console.log(cells)
        return new vscode.NotebookData(cells);
    }

    // notebook data to file data
    async serializeNotebook(data: vscode.NotebookData, _token: vscode.CancellationToken): Promise<Uint8Array> {
        let contents: RawNotebookCell[] = [];

        for (const cell of data.cells) {
        contents.push({
            language: cell.languageId,
            kind: cell.kind, 
            value: cell.value
        });
        }

        return new TextEncoder().encode(JSON.stringify(contents));
    }
}