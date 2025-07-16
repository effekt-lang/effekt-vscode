import React, { useEffect, useRef, useState } from 'react';
import { EffektHoleInfo } from '../effektHoleInfo';
import { BindingsSection } from './BindingsSection';
import {
  MCPCompletionRequest,
  MCPCompletionResponse,
} from '../holesViewProvider';

// VS Code API for webview communication
declare const acquireVsCodeApi: () => any;

interface HoleCardProps {
  hole: EffektHoleInfo;
  highlighted: boolean;
  onJump: (id: string) => void;
}

// MCP server communication function
const solveHole = async (
  hole: EffektHoleInfo,
): Promise<MCPCompletionResponse> => {
  const vscode = acquireVsCodeApi();

  // Prepare the request payload
  const request: MCPCompletionRequest = {
    holeId: hole.id,
    expectedType: hole.expectedType,
    innerType: hole.innerType,
    scope: hole.scope,
    context: {
      // TODO: Add file context when available
      // file: hole.file,
      // line: hole.line,
      // column: hole.column
    },
  };

  // Send request to extension host
  vscode.postMessage({
    type: 'mcp-completion-request',
    payload: request,
  });

  // TODO: Once MCP server is ready, implement proper response handling
  // For now, return a promise that resolves with a simulated response
  return new Promise<MCPCompletionResponse>((resolve) => {
    // Set up a one-time message listener for the response
    const messageListener = (event: MessageEvent) => {
      const message = event.data;
      if (message.type === 'mcp-completion-response') {
        window.removeEventListener('message', messageListener);
        resolve(message.payload);
      }
    };

    window.addEventListener('message', messageListener);
  });
};

export const HoleCard: React.FC<HoleCardProps> = ({
  hole,
  highlighted,
  onJump,
}) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const [isSolving, setIsSolving] = useState(false);

  useEffect(() => {
    if (highlighted) {
      cardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [highlighted]);

  const handleSolve = async () => {
    setIsSolving(true);
    try {
      const response = await solveHole(hole);

      if (response.success) {
        // TODO: Handle successful completion
        // This could involve updating the editor, showing the completion, etc.
        console.log('Hole solved successfully:', response.completion);
      } else {
        // TODO: Handle error case
        console.error('Failed to solve hole:', response.error);
      }
    } catch (error) {
      console.error('Error solving hole:', error);
    } finally {
      setIsSolving(false);
    }
  };

  return (
    <section
      ref={cardRef}
      className={`hole-card${highlighted ? ' highlighted' : ''}`}
      id={`hole-${hole.id}`}
      onClick={highlighted ? undefined : () => onJump(hole.id)}
    >
      <div className="hole-header">
        <span className="hole-id">Hole: {hole.id}</span>
        <button
          className="solve-button"
          onClick={(e) => {
            e.stopPropagation();
            handleSolve();
          }}
          disabled={isSolving}
        >
          {isSolving ? 'Solving...' : 'Solve'}
        </button>
      </div>
      {hole.expectedType && (
        <div className="hole-field">
          <span className="field-label">Expected Type:</span>
          <span className="field-value">{hole.expectedType}</span>
        </div>
      )}
      {hole.innerType && (
        <div className="hole-field">
          <span className="field-label">Inner type:</span>
          <span className="field-value">{hole.innerType}</span>
        </div>
      )}
      <BindingsSection
        scope={hole.scope}
        holeId={hole.id}
        isActive={highlighted}
      />
    </section>
  );
};
