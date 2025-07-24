import { HoleListener } from '../holeListener';
import { DocIndexer } from '../docIndexer';

export interface ToolCtx {
  openEffektFileAndWaitForHoles(uri: string): Promise<void>;
  holeListener: HoleListener;
  docIndexer: DocIndexer;
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
