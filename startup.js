const { spawn } = require('child_process');
const path = require('path');

console.log('🚀 Starting Colabi application...');

// Run database migrations first
console.log('📊 Running database migrations...');
const migrationProcess = spawn('npm', ['run', 'migration:run'], {
  stdio: 'inherit',
  cwd: __dirname
});

migrationProcess.on('close', (code) => {
  if (code === 0) {
    console.log('✅ Database migrations completed successfully');
    // Start the main application
    console.log('🚀 Starting main application...');
    require('./dist/server.js');
  } else {
    console.error('❌ Database migrations failed with code:', code);
    process.exit(1);
  }
});

migrationProcess.on('error', (error) => {
  console.error('❌ Failed to run database migrations:', error);
  process.exit(1);
}); 