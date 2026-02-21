#!/usr/bin/env node
/**
 * ESM Import Fixer - Automatically adds .js extensions to local imports
 * Runs after TypeScript compilation to fix module resolution in ESM
 * Usage: node fix-esm-imports.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DIST_DIR = path.join(__dirname, 'dist');

/**
 * Fix imports in a single file
 */
function fixFileImports(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf-8');
    const originalContent = content;

    // Match patterns:
    // import X from '../path/to/module'
    // import { X } from '../path/to/module'
    // import X from './relative/path'
    
    // Pattern 1: import statements with single/double quotes
    content = content.replace(
      /import\s+(?:{[^}]*}|\*\s+as\s+\w+|\w+)\s+from\s+['"]([^'"]+)['"]/g,
      (match, importPath) => {
        if (shouldAddExtension(importPath)) {
          return match.replace(importPath, importPath + '.js');
        }
        return match;
      }
    );

    // Pattern 2: dynamic imports
    content = content.replace(
      /import\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
      (match, importPath) => {
        if (shouldAddExtension(importPath)) {
          return match.replace(importPath, importPath + '.js');
        }
        return match;
      }
    );

    // Pattern 3: export from statements
    content = content.replace(
      /export\s+(?:{[^}]*}|\*)\s+from\s+['"]([^'"]+)['"]/g,
      (match, importPath) => {
        if (shouldAddExtension(importPath)) {
          return match.replace(importPath, importPath + '.js');
        }
        return match;
      }
    );

    // Only write if changed
    if (content !== originalContent) {
      fs.writeFileSync(filePath, content, 'utf-8');
      console.log(`✓ Fixed: ${path.relative(DIST_DIR, filePath)}`);
      return 1;
    }
    return 0;
  } catch (error) {
    console.error(`✗ Error processing ${filePath}:`, error.message);
    return 0;
  }
}

/**
 * Determine if extension should be added
 */
function shouldAddExtension(importPath) {
  // Skip if already has extension
  if (/\.[jt]sx?$/.test(importPath)) {
    return false;
  }

  // Skip node_modules and absolute imports
  if (importPath.startsWith('/') || importPath.startsWith('.node')) {
    return false;
  }

  // Skip package imports (no slashes)
  if (!importPath.includes('/')) {
    return false;
  }

  // Add .js to relative local imports
  if (importPath.startsWith('.')) {
    return true;
  }

  return false;
}

/**
 * Recursively process all .js files in dist
 */
function processDirectory(dir) {
  let count = 0;

  if (!fs.existsSync(dir)) {
    console.log('⚠ Dist directory not found:', dir);
    return count;
  }

  const files = fs.readdirSync(dir);

  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      // Skip node_modules
      if (file !== 'node_modules') {
        count += processDirectory(filePath);
      }
    } else if (file.endsWith('.js')) {
      count += fixFileImports(filePath);
    }
  }

  return count;
}

// Main execution
console.log('🔧 Fixing ESM imports in dist directory...\n');
const fixedCount = processDirectory(DIST_DIR);
console.log(`\n✅ Fixed ${fixedCount} files`);

