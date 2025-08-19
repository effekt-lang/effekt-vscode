import { Server as McpServer } from '@modelcontextprotocol/sdk/server/index.js';
import { LspClient } from './lspClient';
import { HoleListener } from './holeListener';
import { DocIndexer } from './docIndexer';
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
  CallToolRequest,
} from '@modelcontextprotocol/sdk/types.js';
import * as fs from 'fs/promises';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { ToolCtx, getAvailableTools, dispatchToolCall } from './tools';

export class App {
  private readonly mcpServer: McpServer;
  private readonly lspClient: LspClient;
  private readonly holeListener: HoleListener;
  private readonly docIndexer: DocIndexer;

  constructor() {
    this.mcpServer = new McpServer(
      {
        name: 'effekt',
        version: '0.1.0',
      },
      {
        capabilities: {
          tools: {},
        },
      },
    );
    this.holeListener = new HoleListener();
    this.docIndexer = new DocIndexer();

    const transport = new StdioServerTransport();
    this.mcpServer.connect(transport);

    const workspace = process.cwd();
    this.lspClient = new LspClient(workspace, this.holeListener);

    this.setupToolHandlers();
  }

  private setupToolHandlers(): void {
    this.mcpServer.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: getAvailableTools(),
      };
    });

    this.mcpServer.setRequestHandler(
      CallToolRequestSchema,
      async (request: CallToolRequest) => {
        return this.handleToolCall(request);
      },
    );
  }

  private async handleToolCall(request: CallToolRequest): Promise<any> {
    const { name, arguments: args } = request.params;

    if (!args) {
      throw new Error('Missing arguments');
    }

    return dispatchToolCall(this.toolCtx(), name, args);
  }

  private toolCtx(): ToolCtx {
    return {
      openEffektFileAndWaitForHoles:
        this.openEffektFileAndWaitForHoles.bind(this),
      holeListener: this.holeListener,
      docIndexer: this.docIndexer,
    };
  }

  private async openEffektFileAndWaitForHoles(uri: string): Promise<void> {
    await this.sendFileToLanguageServer(uri);
    await this.holeListener.waitForHoles(uri);
  }

  private async sendFileToLanguageServer(uri: string): Promise<void> {
    try {
      const filePath = uri.startsWith('file://') ? uri.slice(7) : uri;
      const contents = await fs.readFile(filePath, 'utf8');

      await this.lspClient.sendNotification('textDocument/didOpen', {
        textDocument: {
          uri: uri,
          languageId: 'effekt',
          version: 1,
          text: contents,
        },
      });
    } catch (error) {
      console.error(`Failed to open file ${uri}:`, error);
      throw error;
    }
  }
}
