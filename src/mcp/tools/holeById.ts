import {
  BindingInfo,
  ScopeInfo,
  BINDING_ORIGIN_DEFINED,
} from '../../holesPanel/effektHoleInfo';
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

    const { bindings, truncated } = truncateScope(hole.scope);

    const holeInfo = JSON.stringify(
      {
        uri,
        hole: {
          id: hole.id,
          range: hole.range,
          innerType: hole.innerType,
          expectedType: hole.expectedType,
          bindings: bindings,
        },
      },
      null,
      2,
    );

    let text = `Hole Information:\n${holeInfo}`;

    if (truncated) {
      text += `\nOnly showing info for the closest 10 bindings.`;
    }

    return {
      content: [
        {
          type: 'text',
          text: text,
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

/**
 * Truncate the scope to only exclude imported bindings, up to a maximum of 10.
 */
function truncateScope(scope: ScopeInfo): {
  bindings: BindingInfo[];
  truncated: boolean;
} {
  const allBindings = flattenScope(scope);
  const filteredBindings = allBindings.filter(
    (binding) => binding.origin === BINDING_ORIGIN_DEFINED,
  );

  const bindings = filteredBindings.slice(0, 10);
  const truncated = filteredBindings.length > 10;

  return { bindings, truncated };
}

function flattenScope(scope: ScopeInfo): BindingInfo[] {
  const result: BindingInfo[] = [];

  result.push(...scope.bindings);

  if (scope.outer) {
    result.push(...flattenScope(scope.outer));
  }

  return result;
}
