#!/usr/bin/env node

/**
 * CLI script to delete all node_modules folders in:
 * 1. The current directory and all subdirectories
 * 2. The parent directory and all its subdirectories
 *
 * Usage: node scripts/clean-node-modules.js [--dry-run] [--current-only] [--parent-only]
 *
 * Options:
 *   --dry-run        Show what would be deleted without actually deleting
 *   --current-only   Only delete node_modules in current directory tree
 *   --parent-only    Only delete node_modules in parent directory tree
 *   --help           Show this help message
 */

const fs = require('fs');
const path = require('path');

// Parse command line arguments
const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');
const currentOnly = args.includes('--current-only');
const parentOnly = args.includes('--parent-only');
const showHelp = args.includes('--help');

// Colors for terminal output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function showHelpMessage() {
  console.log(`
${colors.cyan}node_modules Cleaner CLI${colors.reset}

${colors.yellow}Usage:${colors.reset}
  node scripts/clean-node-modules.js [options]

${colors.yellow}Options:${colors.reset}
  --dry-run        Show what would be deleted without actually deleting
  --current-only   Only delete node_modules in current directory tree
  --parent-only    Only delete node_modules in parent directory tree
  --help           Show this help message

${colors.yellow}Examples:${colors.reset}
  # Dry run to see what would be deleted
  node scripts/clean-node-modules.js --dry-run

  # Delete all node_modules in current directory only
  node scripts/clean-node-modules.js --current-only

  # Delete all node_modules in parent directory only
  node scripts/clean-node-modules.js --parent-only

  # Delete all node_modules everywhere
  node scripts/clean-node-modules.js
`);
}

/**
 * Recursively find all node_modules directories
 * @param {string} dir - Directory to search
 * @param {string[]} results - Array to store found paths
 * @param {Set} visited - Set of visited paths to avoid infinite loops
 * @returns {string[]} Array of node_modules paths
 */
function findNodeModules(dir, results = [], visited = new Set()) {
  try {
    // Resolve to absolute path and check if already visited
    const absolutePath = path.resolve(dir);
    if (visited.has(absolutePath)) {
      return results;
    }
    visited.add(absolutePath);

    // Check if directory exists
    if (!fs.existsSync(dir)) {
      return results;
    }

    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        if (entry.name === 'node_modules') {
          results.push(fullPath);
          // Don't recurse into node_modules - we're deleting them anyway
        } else if (
          !entry.name.startsWith('.') &&
          entry.name !== 'Library' &&
          entry.name !== 'System'
        ) {
          // Skip hidden directories and system directories for performance
          findNodeModules(fullPath, results, visited);
        }
      }
    }
  } catch (error) {
    // Ignore permission errors and other read errors
    if (error.code !== 'EACCES' && error.code !== 'EPERM') {
      log(`  Warning: Could not read ${dir}: ${error.message}`, 'yellow');
    }
  }

  return results;
}

/**
 * Get the size of a directory in bytes
 * @param {string} dir - Directory path
 * @returns {number} Size in bytes
 */
function getDirectorySize(dir) {
  let totalSize = 0;

  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        totalSize += getDirectorySize(fullPath);
      } else if (entry.isFile()) {
        try {
          const stats = fs.statSync(fullPath);
          totalSize += stats.size;
        } catch (e) {
          // Ignore errors for individual files
        }
      }
    }
  } catch (error) {
    // Ignore errors
  }

  return totalSize;
}

/**
 * Format bytes to human readable string
 * @param {number} bytes - Size in bytes
 * @returns {string} Formatted size
 */
function formatBytes(bytes) {
  if (bytes === 0) return '0 B';

  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  const size = bytes / 1024 ** i;

  return `${size.toFixed(2)} ${units[i]}`;
}

/**
 * Delete a directory recursively
 * @param {string} dir - Directory to delete
 * @returns {boolean} Success status
 */
function deleteDirectory(dir) {
  try {
    fs.rmSync(dir, { recursive: true, force: true });
    return true;
  } catch (error) {
    log(`  Error deleting ${dir}: ${error.message}`, 'red');
    return false;
  }
}

/**
 * Process and delete node_modules directories
 * @param {string} baseDir - Base directory to search
 * @param {string} label - Label for logging
 * @returns {{found: number, deleted: number, freed: number}}
 */
function processDirectory(baseDir, label) {
  log(`\n${colors.cyan}Scanning ${label}:${colors.reset} ${baseDir}`, 'cyan');

  const nodeModulesPaths = findNodeModules(baseDir);

  if (nodeModulesPaths.length === 0) {
    log(`  No node_modules found in ${label}`, 'green');
    return { found: 0, deleted: 0, freed: 0 };
  }

  log(`  Found ${nodeModulesPaths.length} node_modules folder(s):`, 'yellow');

  let totalSize = 0;
  let deletedCount = 0;
  let freedBytes = 0;

  for (const nodeModulesPath of nodeModulesPaths) {
    const size = getDirectorySize(nodeModulesPath);
    totalSize += size;

    const relativePath = path.relative(baseDir, nodeModulesPath);
    const displayPath = relativePath || './node_modules';

    if (isDryRun) {
      log(`    [DRY RUN] Would delete: ${displayPath} (${formatBytes(size)})`, 'yellow');
      deletedCount++;
      freedBytes += size;
    } else {
      log(`    Deleting: ${displayPath} (${formatBytes(size)})...`, 'yellow');
      if (deleteDirectory(nodeModulesPath)) {
        log(`    ✓ Deleted: ${displayPath}`, 'green');
        deletedCount++;
        freedBytes += size;
      }
    }
  }

  return { found: nodeModulesPaths.length, deleted: deletedCount, freed: freedBytes };
}

// Main execution
function main() {
  if (showHelp) {
    showHelpMessage();
    process.exit(0);
  }

  log('\n╔═══════════════════════════════════════════════════════════╗', 'cyan');
  log('║           node_modules Cleaner CLI                        ║', 'cyan');
  log('╚═══════════════════════════════════════════════════════════╝', 'cyan');

  if (isDryRun) {
    log('\n🔍 DRY RUN MODE - No files will be deleted', 'yellow');
  }

  const currentDir = process.cwd();
  const parentDir = path.dirname(currentDir);

  let totalFound = 0;
  let totalDeleted = 0;
  let totalFreed = 0;

  // Process current directory
  if (!parentOnly) {
    const currentResult = processDirectory(currentDir, 'current directory');
    totalFound += currentResult.found;
    totalDeleted += currentResult.deleted;
    totalFreed += currentResult.freed;
  }

  // Process parent directory
  if (!currentOnly && parentDir !== currentDir) {
    const parentResult = processDirectory(parentDir, 'parent directory');
    totalFound += parentResult.found;
    totalDeleted += parentResult.deleted;
    totalFreed += parentResult.freed;
  }

  // Summary
  log('\n─────────────────────────────────────────────────────────────', 'cyan');
  log('Summary:', 'cyan');
  log(`  Total node_modules found: ${totalFound}`, 'blue');
  log(`  Total ${isDryRun ? 'would be ' : ''}deleted: ${totalDeleted}`, 'blue');
  log(`  Total space ${isDryRun ? 'would be ' : ''}freed: ${formatBytes(totalFreed)}`, 'green');
  log('─────────────────────────────────────────────────────────────\n', 'cyan');

  if (isDryRun && totalFound > 0) {
    log('💡 Run without --dry-run to actually delete the folders', 'yellow');
  }
}

// Run the script
main();
