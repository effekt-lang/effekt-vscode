import { OutgoingMessage, IncomingMessage } from './messages';

export interface VSCodeAPI {
  postMessage(msg: OutgoingMessage): void;
}

declare function acquireVsCodeApi(): VSCodeAPI;

export const vscode = acquireVsCodeApi();

// Re-export types
export type { OutgoingMessage, IncomingMessage };
