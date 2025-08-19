import React from 'react';
import { HoleCard } from './HoleCard';
import {
  useHolesPanelState,
  useHoleNavigation,
  useHoleActions,
  useKeyboardNavigation,
} from './hooks';

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

interface HolesPanelProps {
  initShowHoles: boolean;
}

export const HolesPanel: React.FC<HolesPanelProps> = ({ initShowHoles }) => {
  const { state, actions } = useHolesPanelState(initShowHoles);
  const { holes, highlightedHoleId, selectedHoleId, showHoles } = state;
  const {
    setSelectedHoleId,
    setHighlightedHoleId,
    handleJump,
    handleDeselect,
  } = actions;

  const navigation = useHoleNavigation(
    { holes, selectedHoleId, highlightedHoleId },
    { setSelectedHoleId, setHighlightedHoleId },
  );

  const holeActions = useHoleActions(
    { holes, selectedHoleId, highlightedHoleId },
    {
      setSelectedHoleId,
      setHighlightedHoleId,
      handleJump,
      selectFirstHole: navigation.selectFirstHole,
    },
  );

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
    if (!showHoles) {
      return <Warning />;
    }

    if (holes.length === 0) {
      return (
        <>
          <div className="empty">There are no holes in this file.</div>
          <Description />
        </>
      );
    }

    return holes.map((hole) => (
      <HoleCard
        key={hole.id}
        hole={hole}
        highlighted={hole.id === highlightedHoleId}
        selected={hole.id === selectedHoleId}
        onJump={handleJump}
        onDeselect={handleDeselect}
      />
    ));
  };

  return <div className="holes-list">{renderContent()}</div>;
};
