import { EffektHoleInfo } from '../effektHoleInfo';
import { Location as LSPLocation } from 'vscode-languageserver-protocol';

export type OutgoingMessage =
  | { command: 'jumpToHole'; holeId?: string }
  | { command: 'jumpToDefinition'; definitionLocation: LSPLocation }
  | { command: 'openCopilotChat'; holeId: string };

export type IncomingMessage =
  | { command: 'highlightHole'; holeId: string }
  | { command: 'updateHoles'; holes: EffektHoleInfo[] }
  | { command: 'setShowHoles'; show: boolean }
  | { command: 'focusPanel' };
