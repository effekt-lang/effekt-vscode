import { EffektHoleInfo } from '../effektHoleInfo';

export interface OutgoingMessage {
  command: 'jumpToHole';
  holeId?: string;
}

export type IncomingMessage =
  | { command: 'highlightHole'; holeId: string }
  | { command: 'updateHoles'; holes: EffektHoleInfo[] }
  | { command: 'setShowHoles'; show: boolean }
  | { command: 'focusPanel' };
