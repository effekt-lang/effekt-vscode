import React from 'react';
import './keyboard-shortcut-tutorial.css';

export const KeyboardShortcutTutorial: React.FC = () => (
  <div className="keyboard-shortcut-tutorial">
    <h4>Keyboard Shortcuts</h4>
    <ul>
      <li>
        <kbd>Ctrl</kbd> + <kbd>Alt</kbd> + <kbd>H</kbd> – Focus this panel
      </li>
      <li>
        <kbd>↑</kbd> – Select previous hole
      </li>
      <li>
        <kbd>↓</kbd> – Select next hole
      </li>
      <li>
        <kbd>Esc</kbd> – Collapse hole
      </li>
      <li>
        <kbd>Enter</kbd> – Expand hole
      </li>
    </ul>
  </div>
);
