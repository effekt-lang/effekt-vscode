import { EffektHoleInfo, BindingInfo } from '../effektHoleInfo';

export type OutgoingMessage =
  | { command: 'jumpToHole'; holeId?: string }
  | { command: 'jumpToDefinition'; binding: BindingInfo };

export type IncomingMessage =
  | { command: 'highlightHole'; holeId: string }
  | { command: 'updateHoles'; holes: EffektHoleInfo[] }
  | { command: 'setShowHoles'; show: boolean }
  | { command: 'focusPanel' };
