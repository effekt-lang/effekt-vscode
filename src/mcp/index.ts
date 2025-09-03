import { App } from './app.js';
import { Command } from 'commander';

const program = new Command();

program
  .option('--port <number>', 'port to run the MCP server on')
  .parse(process.argv);

const { port } = program.opts();

new App(parseInt(port, 10));

process.on('SIGINT', () => process.exit(0));
