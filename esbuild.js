const esbuild = require('esbuild');
const copyPlugin = require('esbuild-plugin-copy').default;

const watch = process.argv.includes('--watch');

async function main() {
  // Build the extension for Node.js
  const extCtx = await esbuild.context({
    entryPoints: ['src/extension.ts'],
    bundle: true,
    format: 'cjs',
    /* NOTE: Minifying doesn't seem to be semantics-preserving for our plugin.
       The minifyed extension was observed to show the capture inlay hints twice,
       apparently breaking the runtime reflection performed in `EffektLanguageClient.registerFeature`.
    */
    minify: false,
    sourcemap: false,
    sourcesContent: false,
    platform: 'node',
    outfile: 'dist/extension.js',
    external: ['vscode'],
    logLevel: 'silent',
    plugins: [
      /* add to the end of plugins array */
      esbuildProblemMatcherPlugin,
      copyPlugin({
        assets: {
          from: ['src/holesPanel/webview/holes.css'],
          to: ['holesPanel'],
        },
      }),
      copyPlugin({
        assets: {
          from: ['node_modules/@vscode/codicons/dist/codicon.css'],
          to: ['holesPanel'],
        },
      }),
      copyPlugin({
        assets: {
          from: ['node_modules/@vscode/codicons/dist/codicon.ttf'],
          to: ['holesPanel'],
        },
      }),
    ],
  });

  // Compile React-based webview
  const webCtx = await esbuild.context({
    entryPoints: ['src/holesPanel/webview/index.tsx'],
    bundle: true,
    format: 'iife',
    platform: 'browser',
    target: ['es2020'],
    loader: {
      '.ts': 'ts',
      '.tsx': 'tsx',
    },
    jsx: 'automatic',
    define: {
      'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'production')
    },
    outfile: 'dist/holesPanel/holes.js',
    minify: false,
    sourcemap: false,
    logLevel: 'silent',
  });

  const mcpCtx = await esbuild.context({
    entryPoints: ['src/mcp/index.ts'],
    bundle: true,
    platform: 'node',
    format: 'cjs',
    outfile: 'dist/mcp/server.js',
    sourcemap: false,
    minify: false,
    banner: { js: '#!/usr/bin/env node' },
    logLevel: 'silent',
  });

  if (watch) {
    await Promise.all([extCtx.watch(), webCtx.watch(), mcpCtx.watch()]);
  } else {
    await Promise.all([extCtx.rebuild(), webCtx.rebuild(), mcpCtx.rebuild()]);
    await Promise.all([extCtx.dispose(), webCtx.dispose(), mcpCtx.dispose()]);
  }
}


/**
 * @type {import('esbuild').Plugin}
 */
const esbuildProblemMatcherPlugin = {
  name: 'esbuild-problem-matcher',

  setup(build) {
    build.onStart(() => {
      console.log('[watch] build started');
    });
    build.onEnd((result) => {
      result.errors.forEach(({ text, location }) => {
        console.error(`✘ [ERROR] ${text}`);
        console.error(`    ${location.file}:${location.line}:${location.column}:`);
      });
      console.log('[watch] build finished');
    });
  },
};

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
