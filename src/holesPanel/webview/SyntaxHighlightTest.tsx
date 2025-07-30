import React, { useEffect, useState } from 'react';
import { SyntaxHighlightedCode } from './SyntaxHighlightedCode';

export const SyntaxHighlightTest: React.FC = () => {
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    // Small delay to ensure highlighter is initialized
    const timer = setTimeout(() => setIsLoaded(true), 100);
    return () => clearTimeout(timer);
  }, []);

  if (!isLoaded) {
    return <div>Loading syntax highlighter...</div>;
  }

  const testCode = `def factorial(n: Int): Int = {
    if (n <= 1) 1 else n * factorial(n - 1)
  }`;

  const testType = `Int => Int`;

  return (
    <div className="syntax-test">
      <h3>Syntax Highlighting Test</h3>
      <div>
        <strong>Function:</strong>
        <SyntaxHighlightedCode code={testCode} language="effekt" />
      </div>
      <div>
        <strong>Type:</strong>
        <SyntaxHighlightedCode code={testType} language="effekt" />
      </div>
    </div>
  );
};
