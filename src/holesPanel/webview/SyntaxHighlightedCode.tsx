import React, { useEffect, useState, useRef } from 'react';
import {
  highlightEffektCode,
  initializeHighlighter,
  isDarkTheme,
} from './syntaxHighlighter';

interface SyntaxHighlightedCodeProps {
  code: string;
  language?: string;
  className?: string;
}

export const SyntaxHighlightedCode: React.FC<SyntaxHighlightedCodeProps> = ({
  code,
  language = 'effekt',
  className = '',
}) => {
  const [highlightedHtml, setHighlightedHtml] = useState<string>('');
  const [isInitialized, setIsInitialized] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const initialize = async () => {
      if (!isInitialized) {
        await initializeHighlighter();
        setIsInitialized(true);
      }
    };

    initialize();
  }, [isInitialized]);

  useEffect(() => {
    if (isInitialized && code && language === 'effekt') {
      const darkMode = isDarkTheme();
      const html = highlightEffektCode(code, darkMode);
      setHighlightedHtml(html);
    } else {
      // Fallback for non-Effekt code or when not initialized
      setHighlightedHtml(
        `<code class="fallback-code">${escapeHtml(code)}</code>`,
      );
    }
  }, [code, language, isInitialized]);

  // Simple HTML escape function for fallback
  const escapeHtml = (text: string): string => {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  };

  return (
    <div
      ref={containerRef}
      className={`syntax-highlighted-code ${className}`}
      dangerouslySetInnerHTML={{ __html: highlightedHtml }}
    />
  );
};
