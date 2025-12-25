/**
 * Generate version.json file with build information
 * This file is used to detect app updates and clear caches
 */

import { writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

// Read version from package.json
import { readFileSync } from 'fs';
const packageJson = JSON.parse(readFileSync(join(rootDir, 'package.json'), 'utf-8'));

const version = packageJson.version || '1.0.0';
const buildTime = Date.now();
const buildHash = process.env.VITE_BUILD_HASH || 
  Math.random().toString(36).substring(2, 15) + 
  Math.random().toString(36).substring(2, 15);

const versionData = {
  version,
  buildTime,
  buildHash,
};

// Ensure public directory exists
const publicDir = join(rootDir, 'public');
if (!existsSync(publicDir)) {
  mkdirSync(publicDir, { recursive: true });
}

const outputPath = join(publicDir, 'version.json');

try {
  writeFileSync(outputPath, JSON.stringify(versionData, null, 2), 'utf-8');
  console.log(`✓ Generated version.json:`, versionData);
} catch (error) {
  console.error('Error generating version.json:', error);
  process.exit(1);
}

