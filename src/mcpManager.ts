import { spawn, ChildProcess } from 'child_process';
import * as vscode from 'vscode';
import * as path from 'path';
import * as net from 'net';

let mcpProcess: ChildProcess | undefined;
const MCP_HOST = '127.0.0.1';
// We choose a static port that is unlikely to be used by other software (TODO: make this configurable if needed).
// Port computed as 40000 + crc32("org.effekt-lang.mcp") % 20000
const MCP_PORT = 49847;
const MCP_URL = `http://${MCP_HOST}:${MCP_PORT}/mcp`;

let outputChannel: vscode.OutputChannel | undefined;
function out() {
  if (!outputChannel) {
    outputChannel = vscode.window.createOutputChannel('Effekt MCP');
  }
  return outputChannel;
}

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

export function startMCPServer() {
  // Only start the MCP server if it is not already running
  const probe = net.createConnection({ host: MCP_HOST, port: MCP_PORT });
  let handled = false;

  probe.on('connect', () => {
    handled = true;
    probe.end();
    out().appendLine(
      `Another process seems to be using ${MCP_PORT}, not (re)starting MCP server.`,
    );
  });

  probe.on('error', () => {
    if (handled) {
      return;
    }

    const ext = vscode.extensions.getExtension('effekt-lang.effekt');
    const extPath = ext!.extensionPath;

    const serverPath = path.join(extPath, 'dist', 'mcp', 'server.js');

    mcpProcess = spawn('node', [serverPath, '--port', String(MCP_PORT)], {
      cwd: extPath,
      env: {
        ...process.env,
      },
      stdio: ['ignore', 'pipe', 'pipe'],
      detached: false,
    });

    out().appendLine(
      `Started MCP server on http://${MCP_HOST}:${MCP_PORT} (pid ${mcpProcess.pid}).`,
    );

    mcpProcess.stdout?.on('data', (buf) => out().append(buf.toString()));
    mcpProcess.stderr?.on('data', (buf) => out().append(buf.toString()));
    mcpProcess.on('exit', (code, signal) => {
      out().appendLine(
        `MCP server exited (code: ${code ?? 'n/a'}, signal: ${signal ?? 'none'}).`,
      );
      mcpProcess = undefined;
    });
  });
}

export function stopMCPServer() {
  if (mcpProcess) {
    mcpProcess.kill();
    mcpProcess = undefined;
    out().appendLine(`Stopped MCP server.`);
  }
}

export function installMCPServer() {
  const obj = {
    name: 'effekt',
    type: 'http',
    url: MCP_URL,
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
