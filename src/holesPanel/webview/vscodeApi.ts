import { EffektHoleInfo } from '../effektHoleInfo';

export interface VSCodeAPI {
  postMessage(msg: OutgoingMessage): void;
}

declare function acquireVsCodeApi(): VSCodeAPI;

export type OutgoingMessage =
  | { command: 'openCopilotChat'; holeId: string }
  | { command: 'jumpToHole'; holeId: string }
  | { command: 'solveAllHoles'; holeIds: string[] }
  | { command: 'createDraft' }
  | { command: 'explainHole'; holeId: string }
  | { command: 'suggestNextStep'; holeId: string }
  | { command: 'createTests'; holeId: string }
  | { command: 'writeTestFirst'; holeId: string }
  | { command: 'runTests'; holeId?: string }
  | { command: 'implementToPass'; holeId: string };

export interface JumpToHole {
  command: 'jumpToHole';
  holeId: string;
}

export interface SolveAllHoles {
  command: 'solveAllHoles';
  holeIds: string[];
}

export type IncomingMessage =
  | { command: 'highlightHole'; holeId: string }
  | { command: 'updateHoles'; holes: EffektHoleInfo[] }
  | { command: 'setShowHoles'; show: boolean };

export const vscode = acquireVsCodeApi();
