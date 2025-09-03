import { ToolCtx, Tool } from './types';

export const listHolesTool: Tool = {
  name: 'list_holes',
  description: 'List all holes in a program with their IDs and ranges',
  inputSchema: {
    type: 'object',
    properties: {
      uri: {
        type: 'string',
        description: 'The URI of the Effekt file to list holes from',
      },
    },
    required: ['uri'],
  },
  async call(ctx: ToolCtx, args: Record<string, any>): Promise<any> {
    const uri = args.uri as string;
    return listHoles(ctx, uri);
  },
};

async function listHoles(ctx: ToolCtx, uri: string): Promise<any> {
  try {
    await ctx.openEffektFileAndWaitForHoles(uri);

    const holes = ctx.holeListener.getHoles(uri);

    const holesList = holes.map((hole) => ({
      id: hole.id,
      range: hole.range,
    }));

    const holesInfo = JSON.stringify(
      {
        uri,
        holes: holesList,
      },
      null,
      2,
    );

    return {
      content: [
        {
          type: 'text',
          text: `Holes in ${uri}:\n${holesInfo}`,
        },
      ],
    };
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: `Error listing holes: ${error}`,
        },
      ],
      isError: true,
    };
  }
}
