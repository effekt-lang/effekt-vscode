import express, { Request, Response } from 'express';
import { randomUUID } from 'crypto';
import { Server as McpServer } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { LspClient } from './lspClient';
import { HoleListener } from './holeListener';
import { DocIndexer } from './docIndexer';
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
  CallToolRequest,
} from '@modelcontextprotocol/sdk/types.js';
import * as fs from 'fs/promises';
import { ToolCtx, getAvailableTools, dispatchToolCall } from './tools';

interface SessionRec {
  transport: StreamableHTTPServerTransport;
}

export class App {
  private readonly mcpServer: McpServer;
  private readonly lspClient: LspClient;
  private readonly holeListener: HoleListener;
  private readonly docIndexer: DocIndexer;

  constructor(port?: number) {
    this.mcpServer = new McpServer(
      { name: 'effekt', version: '0.1.0' },
      { capabilities: { tools: {} } },
    );

    this.holeListener = new HoleListener();
    this.docIndexer = new DocIndexer();

    const workspace = process.cwd();
    this.lspClient = new LspClient(workspace, this.holeListener);

    this.setupToolHandlers();

    // If a port is given, we provide MCP over HTTP, otherwise we use stdio.
    if (port) {
      this.startHttpServer(port);
    } else {
      this.mcpServer.connect(new StdioServerTransport());
    }
  }

  private startHttpServer(port: number) {
    const app = express();
    app.use(express.json());

    const sessions = new Map<string, SessionRec>();

    const mkTransport = () => {
      const transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: () => randomUUID(),
        onsessioninitialized: async (sessionId) => {
          sessions.set(sessionId, { transport });
        },
        onsessionclosed: async (sessionId) => {
          sessions.delete(sessionId);
        },
      });
      return transport;
    };

    app.all('/mcp', async (req: Request, res: Response) => {
      try {
        const headerName = 'mcp-session-id';
        const sid = req.headers[headerName] as string | undefined;

        let rec = sid ? sessions.get(sid) : undefined;

        // If we don't have a known session, only allow an Initialize request to create one.
        if (!rec) {
          const isInitialize =
            req.method === 'POST' &&
            req.body &&
            typeof req.body === 'object' &&
            req.body.jsonrpc === '2.0' &&
            req.body.method === 'initialize';

          if (!isInitialize) {
            res.status(400).json({
              jsonrpc: '2.0',
              error: {
                code: -32000,
                message: 'Bad Request: No valid session ID provided',
              },
              id: null,
            });
            return;
          }

          const transport = mkTransport();
          rec = { transport };
          await this.mcpServer.connect(transport);
        }

        await rec.transport.handleRequest(req, res, req.body);
      } catch (err) {
        console.error('MCP HTTP error:', err);
        if (!res.headersSent) {
          res.status(500).json({ error: 'Internal Server Error' });
        }
      }
    });

    const server = app.listen(port, () => {
      console.log(`MCP HTTP server ready at http://localhost:${port}/mcp`);
    });

    // MCP sessions are usually longer lived, so we have to disable the default 5-minute request timeout.
    // We also use very generous keep-alive and headers timeouts.
    server.requestTimeout = 0;
    server.setTimeout(0);
    server.keepAliveTimeout = 75_000;
    server.headersTimeout = 80_000;
  }

  private setupToolHandlers(): void {
    this.mcpServer.setRequestHandler(ListToolsRequestSchema, async () => {
      return { tools: getAvailableTools() };
    });

    this.mcpServer.setRequestHandler(
      CallToolRequestSchema,
      async (request: CallToolRequest) => this.handleToolCall(request),
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
          uri,
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
