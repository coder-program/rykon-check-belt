#!/usr/bin/env node

const { exec } = require('child_process');

// Run migrations
console.log('Running migrations...');
exec('npx typeorm migration:run -d dist/ormconfig.js', (error, stdout, stderr) => {
  if (error) {
    console.error(`Error: ${error}`);
    console.error(`stderr: ${stderr}`);
    process.exit(1);
  }
  
  console.log(`stdout: ${stdout}`);
  console.log('Migrations completed successfully');
});