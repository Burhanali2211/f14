import { createServer } from 'net';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Check if a port is available
 */
function checkPort(port) {
  return new Promise((resolve) => {
    const server = createServer();
    
    server.listen(port, () => {
      server.once('close', () => {
        resolve(true);
      });
      server.close();
    });
    
    server.on('error', () => {
      resolve(false);
    });
  });
}

/**
 * Find an available port starting from the preferred port
 */
async function findAvailablePort(startPort = 8000, maxAttempts = 100) {
  for (let i = 0; i < maxAttempts; i++) {
    const port = startPort + i;
    const isAvailable = await checkPort(port);
    
    if (isAvailable) {
      return port;
    }
  }
  
  throw new Error(`Could not find an available port starting from ${startPort}`);
}

/**
 * Start Vite dev server with an available port
 */
async function startDevServer() {
  try {
    const preferredPort = 8000;
    const availablePort = await findAvailablePort(preferredPort);
    
    if (availablePort !== preferredPort) {
      console.log(`⚠️  Port ${preferredPort} is busy, using port ${availablePort} instead`);
    } else {
      console.log(`✓ Starting dev server on port ${availablePort}`);
    }
    
    // Start Vite with the available port
    const projectRoot = resolve(__dirname, '..');
    
    // Use relative path from project root to avoid issues with spaces in directory names
    // Change to project directory first
    process.chdir(projectRoot);
    
    // Use node with relative path - this avoids all path space issues
    const viteProcess = spawn(process.execPath, [
      '--stack-size=4096',
      './node_modules/vite/bin/vite.js',
      '--port',
      availablePort.toString()
    ], {
      cwd: projectRoot,
      stdio: 'inherit',
      shell: false,
      env: process.env
    });
    
    viteProcess.on('error', (error) => {
      console.error('Failed to start Vite:', error);
      process.exit(1);
    });
    
    viteProcess.on('exit', (code) => {
      process.exit(code || 0);
    });
    
  } catch (error) {
    console.error('Error starting dev server:', error.message);
    process.exit(1);
  }
}

startDevServer();

