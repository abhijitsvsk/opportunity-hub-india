#!/usr/bin/env node
/**
 * OppHunt Link Health Reaper (CLI Entrypoint)
 * Runs safe link verification across active opportunities.
 *
 * Usage:
 *   node reaper.js               # Audit mode (default, 0 mutations to is_active)
 *   node reaper.js --audit       # Explicit audit mode
 *   node reaper.js --limit=50    # Limit targets
 *   node reaper.js --live        # Live mode (requires 2-strike confirmation)
 */

const { runReaper } = require('./reaper/runner');

const isLive = process.argv.includes('--live');
const limitArg = process.argv.find(arg => arg.startsWith('--limit='));
const limit = limitArg ? parseInt(limitArg.split('=')[1], 10) : 2000;

runReaper({
  audit: !isLive,
  limit
}).catch((err) => {
  console.error('Fatal reaper error:', err);
  process.exit(1);
});
