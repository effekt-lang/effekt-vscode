import { EffektHoleInfo } from '../effektHoleInfo';
import { Location as LSPLocation } from 'vscode-languageserver-protocol';

export interface VSCodeAPI {
  postMessage(msg: OutgoingMessage): void;
}

declare function acquireVsCodeApi(): VSCodeAPI;

export type OutgoingMessage =
  | { command: 'jumpToHole'; holeId?: string }
  | { command: 'jumpToDefinition'; definitionLocation: LSPLocation }
  | { command: 'openCopilotChat'; holeId: string };

export type IncomingMessage =
  | { command: 'highlightHole'; holeId: string }
  | { command: 'updateHoles'; holes: EffektHoleInfo[] }
  | { command: 'setShowHoles'; show: boolean }
  | { command: 'focusPanel' };

export const vscode = acquireVsCodeApi();
