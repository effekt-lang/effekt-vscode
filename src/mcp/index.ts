import { App } from './app.js';

new App();

process.on('SIGINT', () => process.exit(0));
