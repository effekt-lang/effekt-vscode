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
          from: ['./src/holesPanel/holes.css'],
          to: ['./holesPanel'],
        },
      }),
      copyPlugin({
        assets: {
          from: ['./node_modules/@vscode/codicons/dist/codicon.css'],
          to: ['./holesPanel'],
        },
      }),
      copyPlugin({
        assets: {
          from: ['./node_modules/@vscode/codicons/dist/codicon.ttf'],
          to: ['./holesPanel'],
        },
      }),
    ],
  });

  // Compile scripts that run in the webview
  const webCtx = await esbuild.context({
    entryPoints: ['src/holesPanel/script/holesWebViewScript.ts'],
    bundle: true,
    format: 'iife',
    platform: 'browser',
    target: ['es2020'],
    outfile: 'dist/holesPanel/holes.js',
    minify: false,
    sourcemap: false,
    logLevel: 'silent',
  });

  if (watch) {
    await Promise.all([extCtx.watch(), webCtx.watch()]);
  } else {
    await Promise.all([extCtx.rebuild(), webCtx.rebuild()]);
    await Promise.all([extCtx.dispose(), webCtx.dispose()]);
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
        console.error(
          `    ${location.file}:${location.line}:${location.column}:`,
        );
      });
      console.log('[watch] build finished');
    });
  },
};

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
