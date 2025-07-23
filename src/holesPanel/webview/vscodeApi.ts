import { EffektHoleInfo } from '../effektHoleInfo';

export interface VSCodeAPI {
  postMessage(msg: OutgoingMessage): void;
}

declare function acquireVsCodeApi(): VSCodeAPI;

export type OutgoingMessage =
  | { command: 'openCopilotChat'; holeId: string }
  | { command: 'jumpToHole'; holeId: string };

export type IncomingMessage =
  | { command: 'highlightHole'; holeId: string }
  | { command: 'updateHoles'; holes: EffektHoleInfo[] }
  | { command: 'setShowHoles'; show: boolean };

export const vscode = acquireVsCodeApi();
