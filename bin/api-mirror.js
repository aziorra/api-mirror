#!/usr/bin/env node
'use strict';

const { Command } = require('commander');
const dotenv = require('dotenv');
const { createServer } = require('../src/server');
const { initConfig } = require('../src/config');

dotenv.config();

const program = new Command();

program
  .name('api-mirror')
  .description('A lightweight, Git-friendly API proxy that records and replays responses')
  .version('0.1.0')
  .option('-t, --target <url>', 'Target API URL to proxy', process.env.TARGET_URL)
  .option('-p, --port <number>', 'Port to listen on', process.env.PORT || '3000')
  .option('-m, --mirror', 'Mirror mode — serve all requests from recorded files only', process.env.MIRROR_MODE === 'true')
  .option('-l, --latency <ms>', 'Simulated latency in milliseconds', process.env.LATENCY || '0')
  .option('-v, --verbose', 'Verbose logging', false)
  .action((options) => {
    const port = parseInt(options.port, 10);
    const latency = parseInt(options.latency, 10) || 0;
    const mirrorMode = !!options.mirror;

    if (!options.target && !mirrorMode) {
      console.error('\n  error: --target <url> is required unless running in --mirror mode\n');
      console.error('  examples:');
      console.error('    api-mirror --target https://api.example.com');
      console.error('    api-mirror --mirror\n');
      process.exit(1);
    }

    initConfig({ target: options.target || '', mirrorMode, latency, verbose: options.verbose, port });

    const app = createServer();
    app.listen(port, () => {
      const line = '─'.repeat(48);
      console.log(`\n  ${line}`);
      console.log(`  api-mirror  v0.1.0`);
      console.log(`  ${line}`);
      console.log(`  Proxy:       http://localhost:${port}`);
      console.log(`  Dashboard:   http://localhost:${port}/_mirror`);
      console.log(`  Recordings:  .api-mirror/`);
      console.log(`  ${line}`);
      if (mirrorMode) {
        console.log(`  Mode:        MIRROR (offline — serving from .api-mirror/)`);
      } else {
        console.log(`  Mode:        PROXY → ${options.target}`);
        console.log(`  Recording:   200 OK responses auto-saved`);
      }
      if (latency > 0) {
        console.log(`  Latency:     ${latency}ms`);
      }
      if (options.verbose) {
        console.log(`  Verbose:     on`);
      }
      console.log(`  ${line}\n`);
    });
  });

program.parse();
