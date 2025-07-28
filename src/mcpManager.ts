import * as vscode from 'vscode';

export function isMCPServerInstalled(): boolean {
  const mcpServers = vscode.workspace
    .getConfiguration('mcp')
    .get<any>('servers');
  return (
    mcpServers &&
    typeof mcpServers === 'object' &&
    Object.keys(mcpServers).some((key) => key === 'effekt')
  );
}

export function installMCPServer() {
  const extensionPath =
    vscode.extensions.getExtension('effekt-lang.effekt')?.extensionPath;
  const obj = {
    name: 'effekt',
    command: 'node',
    args: [`${extensionPath}/dist/mcp/server.js`],
  };
  const link = `vscode:mcp/install?${encodeURIComponent(JSON.stringify(obj))}`;
  vscode.env.openExternal(vscode.Uri.parse(link));
}

export function hasEffektInstructions(): PromiseLike<boolean> {
  const workspace = vscode.workspace.workspaceFolders?.[0];
  if (!workspace) {
    return Promise.resolve(false);
  }
  const instructionsPath = vscode.Uri.joinPath(
    workspace.uri,
    '.github/instructions/effekt.instructions.md',
  );

  return vscode.workspace.fs.stat(instructionsPath).then(
    () => true,
    () => false,
  );
}

export function createEffektInstructions(context: vscode.ExtensionContext) {
  const source = vscode.Uri.joinPath(
    context.extensionUri,
    'dist/mcp/effekt.instructions.md',
  );
  const target = vscode.Uri.joinPath(
    vscode.workspace.workspaceFolders?.[0].uri || vscode.Uri.file('.'),
    '.github/instructions/effekt.instructions.md',
  );
  vscode.workspace.fs.copy(source, target, { overwrite: true });
}
