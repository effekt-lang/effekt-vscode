import { HoleListener } from '../holeListener';

export interface ToolCtx {
  openEffektFileAndWaitForHoles(uri: string): Promise<void>;
  holeListener: HoleListener;
}

export interface Tool {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, { type: string; description?: string }>;
    required: string[];
  };
  call(ctx: ToolCtx, args: Record<string, any>): Promise<any>;
}
