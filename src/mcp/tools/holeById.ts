import { ToolCtx, Tool } from './types';

export const getHoleByIdTool: Tool = {
  name: 'get_hole_by_id',
  description:
    'Get type information and available bindings in scope for a hole by its ID',
  inputSchema: {
    type: 'object',
    properties: {
      uri: {
        type: 'string',
        description: 'The URI of the Effekt file containing the hole',
      },
      holeId: {
        type: 'string',
        description: 'The ID of the hole',
      },
    },
    required: ['uri', 'holeId'],
  },
  async call(ctx: ToolCtx, args: Record<string, any>): Promise<any> {
    const uri = args.uri as string;
    const holeId = args.holeId as string;
    return getHoleById(ctx, uri, holeId);
  },
};

async function getHoleById(
  ctx: ToolCtx,
  uri: string,
  holeId: string,
): Promise<any> {
  try {
    await ctx.openEffektFileAndWaitForHoles(uri);

    const hole = ctx.holeListener.getHoleById(uri, holeId);
    if (!hole) {
      return {
        content: [
          {
            type: 'text',
            text: `Hole with ID ${holeId} not found in file ${uri}`,
          },
        ],
        isError: true,
      };
    }

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              uri,
              hole: {
                id: hole.id,
                range: hole.range,
                innerType: hole.innerType,
                expectedType: hole.expectedType,
                scope: hole.scope,
              },
            },
            null,
            2,
          ),
        },
      ],
    };
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: `Error getting hole: ${error}`,
        },
      ],
      isError: true,
    };
  }
}
