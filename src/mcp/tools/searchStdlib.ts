import { ToolCtx, Tool } from './types';

export const searchStdlibTool: Tool = {
  name: 'search_stdlib',
  description:
    'Search through the Effekt standard library documentation for functions, types, and other definitions',
  inputSchema: {
    type: 'object',
    properties: {
      query: {
        type: 'string',
        description: 'The search query to find in the standard library',
      },
      maxResults: {
        type: 'number',
        description: 'Maximum number of results to return (default: 10)',
      },
    },
    required: ['query'],
  },
  async call(ctx: ToolCtx, args: Record<string, any>): Promise<any> {
    const query = args.query as string;
    const maxResults = (args.maxResults as number) ?? 10;

    try {
      const results = await ctx.docIndexer.search(query, maxResults);

      if (results.length === 0) {
        return {
          content: [
            {
              type: 'text',
              text: `No results found for query: "${query}"`,
            },
          ],
        };
      }

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(results, null, 2),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Error searching stdlib: ${error instanceof Error ? error.message : 'Unknown error'}`,
          },
        ],
        isError: true,
      };
    }
  },
};
