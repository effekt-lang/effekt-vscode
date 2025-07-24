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
