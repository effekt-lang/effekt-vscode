import { createHighlighter, Highlighter } from 'shiki';

let highlighter: Highlighter | null = null;

/**
 * Initialize the Shiki highlighter with Effekt syntax support
 */
export async function initializeHighlighter(): Promise<void> {
  if (highlighter) {
    return;
  }

  try {
    // Get the grammar URI from the root element data attribute
    const rootElement = document.getElementById('react-root');
    const grammarUri = rootElement?.getAttribute('data-grammar-uri');

    if (!grammarUri) {
      throw new Error('Grammar URI not found in root element');
    }

    // Fetch the Effekt grammar file
    const grammarResponse = await fetch(grammarUri);
    const grammarContent = await grammarResponse.json();

    highlighter = await createHighlighter({
      themes: ['dark-plus', 'light-plus'],
      langs: [
        {
          ...grammarContent,
          id: 'effekt',
          scopeName: 'source.effekt',
          aliases: ['effekt'],
        },
      ],
    });
  } catch (error) {
    console.error('Failed to initialize syntax highlighter:', error);
    // Fallback: create highlighter without Effekt support
    highlighter = await createHighlighter({
      themes: ['dark-plus', 'light-plus'],
      langs: [],
    });
  }
}

/**
 * Highlight Effekt code using Shiki
 */
export function highlightEffektCode(code: string, isDark = true): string {
  if (!highlighter) {
    console.warn('Highlighter not initialized, returning plain code');
    return `<code>${escapeHtml(code)}</code>`;
  }

  try {
    const theme = isDark ? 'dark-plus' : 'light-plus';

    // Check if Effekt language is available
    const langs = highlighter.getLoadedLanguages();
    const hasEffekt = langs.includes('effekt');

    if (hasEffekt) {
      return highlighter.codeToHtml(code, {
        lang: 'effekt',
        theme,
      });
    } else {
      // Fallback to plain text if Effekt grammar couldn't be loaded
      return highlighter.codeToHtml(code, {
        lang: 'text',
        theme,
      });
    }
  } catch (error) {
    console.error('Error highlighting code:', error);
    return `<code>${escapeHtml(code)}</code>`;
  }
}

/**
 * Simple HTML escape function
 */
function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Check if the current VS Code theme is dark
 */
export function isDarkTheme(): boolean {
  // Check VS Code's theme kind through CSS variables
  const style = getComputedStyle(document.body);
  const bg = style.getPropertyValue('--vscode-editor-background');

  if (bg) {
    // Convert hex/rgb to luminance to determine if it's dark
    const rgb = hexToRgb(bg) || getRgbFromStyle(bg);
    if (rgb) {
      const luminance = (0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b) / 255;
      return luminance < 0.5;
    }
  }

  // Default to dark theme
  return true;
}

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex.trim());
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null;
}

function getRgbFromStyle(
  style: string,
): { r: number; g: number; b: number } | null {
  const match = style.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
  return match
    ? {
        r: parseInt(match[1]),
        g: parseInt(match[2]),
        b: parseInt(match[3]),
      }
    : null;
}
