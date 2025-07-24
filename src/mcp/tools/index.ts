import { Tool, ToolCtx } from './types';
import { getHoleByIdTool } from './holeById';
import { searchStdlibTool } from './searchStdlib';

const TOOLS: Tool[] = [getHoleByIdTool, searchStdlibTool];

export function getAvailableTools() {
  return TOOLS.map((tool) => ({
    name: tool.name,
    description: tool.description,
    inputSchema: tool.inputSchema,
  }));
}

export async function dispatchToolCall(
  ctx: ToolCtx,
  name: string,
  args: Record<string, any>,
): Promise<any> {
  const tool = TOOLS.find((t) => t.name === name);
  if (!tool) {
    throw new Error(`Unknown tool: ${name}`);
  }
  return tool.call(ctx, args);
}

export { Tool, ToolCtx } from './types';
