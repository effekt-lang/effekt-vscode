import React, { useCallback } from 'react';
import { HoleCard } from '../HoleCard';
import { useHolesPanelState } from './useHolesPanelState';
import { useHoleNavigation } from './useHoleNavigation';
import { useHoleActions } from './useHoleActions';
import { useKeyboardNavigation } from './useKeyboardNavigation';
import { KeyboardShortcutTutorial } from './KeyboardShortcutTutorial';
import { vscode } from '../vscodeApi';

interface HolesPanelProps {
  initShowHoles: boolean;
  agentSupport: boolean;
}

const Description: React.FC = () => (
  <div className="desc" data-holes-panel-desc>
    This panel shows information about the types and terms in scope for each
    typed hole. Holes are placeholders for missing code used for type-driven
    development. You can create a hole using the <code>&lt;&gt;</code> syntax.
    For example, you can write a definition without a right-hand side as
    follows:
    <pre>def foo() = &lt;&gt;</pre>
    Use{' '}
    <code>
      &lt;{'{'}x{'}'}&gt;
    </code>{' '}
    in order to fill in a hole with a statement or expression <code>x</code>,
    for example:
    <pre>
      def foo() = &lt;{'{'} println("foo"); 42 {'}'}&gt;
    </pre>
    <p>
      <strong>Tipp:</strong> Use "Create Draft" to generate function signatures
      with descriptive holes for your program structure, then use "Solve All" to
      implement them systematically.
    </p>
  </div>
);

const Warning: React.FC = () => (
  <div className="empty">
    <div className="warning">
      <b>Warning:</b> The Holes Panel requires the setting{' '}
      <b>Extension &gt; Effekt &gt; Show Holes</b> to be enabled to function.
    </div>
  </div>
);

export const HolesPanel: React.FC<HolesPanelProps> = ({
  initShowHoles,
  agentSupport,
}) => {
  const { state, actions } = useHolesPanelState(initShowHoles);

  const navigation = useHoleNavigation(state, {
    setSelectedHoleId: actions.setSelectedHoleId,
    setExpandedHoleId: actions.setExpandedHoleId,
  });

  const holeActions = useHoleActions(state, {
    setSelectedHoleId: actions.setSelectedHoleId,
    setExpandedHoleId: actions.setExpandedHoleId,
    handleJump: actions.handleJump,
    selectFirstHole: navigation.selectFirstHole,
  });

  const handleCreateDraft = useCallback(() => {
    vscode.postMessage({
      command: 'createDraft',
    });
  }, []);

  useKeyboardNavigation({
    Escape: holeActions.clearSelection,
    ArrowUp: navigation.navigateToPreviousHole,
    ArrowDown: navigation.navigateToNextHole,
    Enter: holeActions.expandSelectedHole,
    ' ': holeActions.expandSelectedHole,
    ArrowLeft: holeActions.expandSelectedHole,
    ArrowRight: holeActions.expandSelectedHole,
  });

  const renderContent = () => {
    if (!state.showHoles) {
      return <Warning />;
    }

    if (state.holes.length === 0) {
      return (
        <>
          <div className="empty">There are no holes in this file.</div>
          <Description />
          {agentSupport && (
            <div className="draft-container">
              <button
                className="solve-button draft-button"
                onClick={handleCreateDraft}
                title="Create function signatures with descriptive holes to draft your program structure"
              >
                Create Draft
              </button>
            </div>
          )}
          <KeyboardShortcutTutorial />
        </>
      );
    }

    return (
      <>
        {agentSupport && (
          <div className="draft-container">
            <button
              className="solve-button draft-button"
              onClick={handleCreateDraft}
              title="Create function signatures with descriptive holes to draft your program structure"
            >
              Create Draft
            </button>
          </div>
        )}
        {state.holes.map((hole) => (
          <HoleCard
            key={hole.id}
            hole={hole}
            expanded={hole.id === state.expandedHoleId}
            selected={hole.id === state.selectedHoleId}
            onJump={actions.handleJump}
            onJumpToDefinition={actions.handleJumpToDefinition}
            onDeselect={actions.handleDeselect}
            agentSupport={agentSupport}
          />
        ))}
      </>
    );
  };

  return <div className="holes-list">{renderContent()}</div>;
};
