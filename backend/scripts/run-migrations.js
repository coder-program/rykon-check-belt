#!/usr/bin/env node

const { exec } = require('child_process');

// Run migrations
exec(
  'npx typeorm-ts-node-commonjs migration:run -d dist/ormconfig.js',
  (error, stdout, stderr) => {
    if (error) {
      console.error(`Error: ${error}`);
      console.error(`stderr: ${stderr}`);
      process.exit(1);
    }
  },
);
