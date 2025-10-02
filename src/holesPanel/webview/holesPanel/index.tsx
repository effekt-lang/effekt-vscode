import React, { useState, useCallback } from 'react';
import { HoleCard } from '../HoleCard';
import { useHolesPanelState } from './useHolesPanelState';
import { useHoleNavigation } from './useHoleNavigation';
import { useHoleActions } from './useHoleActions';
import { useKeyboardNavigation } from './useKeyboardNavigation';
import { useBindingNavigation } from './useBindingNavigation';
import { KeyboardShortcutTutorial } from './KeyboardShortcutTutorial';
import { BindingInfo } from '../../effektHoleInfo';
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
      <strong>Tip:</strong> Use "Create Draft" to generate function signatures
      with descriptive holes for your program structure.
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
  const [filteredBindings, setFilteredBindings] = useState<BindingInfo[]>([]);

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

  const bindingNavigation = useBindingNavigation(
    state,
    {
      setSelectedBindingIndex: actions.setSelectedBindingIndex,
      handleJumpToDefinition: actions.handleJumpToDefinition,
    },
    filteredBindings,
  );

  const handleFilteredBindingsChange = useCallback(
    (bindings: BindingInfo[]) => {
      setFilteredBindings(bindings);
    },
    [],
  );

  const handleArrowUp = useCallback(() => {
    if (bindingNavigation.isInBindingMode) {
      if (state.selectedBindingIndex === 0) {
        // At top of bindings, do nothing
        return;
      } else {
        bindingNavigation.navigateToPreviousBinding();
      }
    } else {
      navigation.navigateToPreviousHole();
    }
  }, [bindingNavigation, navigation, state.selectedBindingIndex]);

  const handleArrowDown = useCallback(() => {
    if (bindingNavigation.isInBindingMode) {
      bindingNavigation.navigateToNextBinding();
    } else if (state.expandedHoleId && filteredBindings.length > 0) {
      // Enter binding mode if hole is expanded and has bindings
      bindingNavigation.enterBindingMode();
    } else {
      navigation.navigateToNextHole();
    }
  }, [
    bindingNavigation,
    navigation,
    state.expandedHoleId,
    filteredBindings.length,
  ]);

  const handleEnterOrSpace = useCallback(() => {
    if (bindingNavigation.isInBindingMode) {
      bindingNavigation.jumpToSelectedBinding();
    } else {
      holeActions.expandSelectedHole();
    }
  }, [bindingNavigation, holeActions]);

  const handleEscape = useCallback(() => {
    if (bindingNavigation.isInBindingMode) {
      bindingNavigation.exitBindingMode();
    } else {
      holeActions.clearSelection();
    }
  }, [bindingNavigation, holeActions]);
  const handleCreateDraft = useCallback(() => {
    vscode.postMessage({
      command: 'createDraft',
    });
  }, []);

  useKeyboardNavigation({
    Escape: handleEscape,
    ArrowUp: handleArrowUp,
    ArrowDown: handleArrowDown,
    Enter: handleEnterOrSpace,
    ' ': handleEnterOrSpace,
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
        {state.holes.length === 0 ? (
          <>
            <div className="empty">There are no holes in this file.</div>
            <Description />
            <KeyboardShortcutTutorial />
          </>
        ) : (
          state.holes.map((hole) => (
            <HoleCard
              key={hole.id}
              hole={hole}
              expanded={hole.id === state.expandedHoleId}
              selected={hole.id === state.selectedHoleId}
              selectedBindingIndex={
                hole.id === state.expandedHoleId
                  ? state.selectedBindingIndex
                  : null
              }
              onJump={actions.handleJump}
              onJumpToDefinition={actions.handleJumpToDefinition}
              onDeselect={actions.handleDeselect}
              onFilteredBindingsChange={handleFilteredBindingsChange}
              agentSupport={agentSupport}
            />
          ))
        )}
      </>
    );
  };

  return <div className="holes-list">{renderContent()}</div>;
};
