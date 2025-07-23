import { spawn, ChildProcess } from 'child_process';
import { createMessageConnection, MessageConnection } from 'vscode-jsonrpc';
import { StreamMessageReader, StreamMessageWriter } from 'vscode-jsonrpc/node';
import { InitializeRequest } from 'vscode-languageserver-protocol';
import { HoleListener } from './holeListener';

export class LspClient {
  private proc?: ChildProcess;
  private conn?: MessageConnection;

  private readonly cmd = 'effekt';
  private readonly args = ['--server'];

  constructor(
    private readonly workspace: string,
    private readonly holeListener: HoleListener,
  ) {}

  private log(direction: 'OUT' | 'IN', method: string, params?: any): void {
    const timestamp = new Date().toISOString();
    const message = params ? JSON.stringify(params, null, 2) : 'no params';
    console.error(`[${timestamp}] LSP ${direction}: ${method}\n${message}\n`);
  }

  async start(): Promise<void> {
    if (this.conn) {
      return;
    }

    this.proc = spawn(this.cmd, this.args);
    if (!this.proc.stdin || !this.proc.stdout) {
      throw new Error('Failed to start LSP process');
    }

    const reader = new StreamMessageReader(this.proc.stdout);
    const writer = new StreamMessageWriter(this.proc.stdin);
    this.conn = createMessageConnection(reader, writer);

    // Set up hole listener for notifications
    this.conn.onNotification('$/effekt/publishHoles', (params: any) => {
      this.log('IN', '$/effekt/publishHoles', params);
      if (this.holeListener) {
        this.holeListener.updateHoles(params.uri, params.holes);
      }
    });

    this.conn.onNotification((method: string, params: any) => {
      if (method !== '$/effekt/publishHoles') {
        this.log('IN', method, params);
      }
    });

    this.conn.onClose(() => this.dispose());
    this.conn.onError(() => this.dispose());

    this.conn.listen();

    this.log('OUT', 'initialize', {
      processId: process.pid,
      rootUri: `file://${this.workspace}`,
      capabilities: {},
    });

    await this.conn.sendRequest(InitializeRequest.type, {
      processId: process.pid,
      rootUri: `file://${this.workspace}`,
      capabilities: {},
      initializationOptions: {
        effekt: {
          showHoles: true,
        },
      },
    });
  }

  async sendRequest(method: string, params: any): Promise<any> {
    if (!this.conn) {
      await this.start();
    }
    this.log('OUT', method, params);
    return this.conn!.sendRequest(method, params);
  }

  async sendNotification(method: string, params: any): Promise<void> {
    if (!this.conn) {
      await this.start();
    }
    this.log('OUT', method, params);
    return this.conn!.sendNotification(method, params);
  }

  dispose(): void {
    this.conn?.dispose();
    this.proc?.kill();
    this.conn = undefined;
    this.proc = undefined;
  }
}
