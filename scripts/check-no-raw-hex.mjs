// Design System v1 color guard (ratchet).
//
//   node scripts/check-no-raw-hex.mjs            # verify against the baseline
//   node scripts/check-no-raw-hex.mjs --update   # re-pin the baseline (after a migration reduces hex)
//
// Rules:
//   1. `src/design-system/` must contain ZERO raw hex (it's the canonical, token-pure layer).
//   2. The total raw-hex count across components may only DECREASE vs the pinned baseline.
// Token/theme DEFINITION files are exempt — that's where colors legitimately live.
import { readFileSync, writeFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(fileURLToPath(new URL('.', import.meta.url)), '..');
const SRC = join(root, 'apps/frontend/src');
const BASELINE = join(root, 'scripts/.raw-hex-baseline.json');

// Files that DEFINE the palette — colors belong here, not in components.
const EXEMPT = new Set([
  'design/tokens.ts',
  'theme/mantineTheme.ts',
]);

const HEX = /#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3,4})\b/g;

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const s = statSync(p);
    if (s.isDirectory()) walk(p, out);
    else if (/\.(ts|tsx)$/.test(name)) out.push(p);
  }
  return out;
}

const files = walk(SRC);
let total = 0;
const dsOffenders = [];
for (const file of files) {
  const rel = relative(SRC, file).split('\\').join('/');
  if (EXEMPT.has(rel)) continue;
  const matches = readFileSync(file, 'utf8').match(HEX);
  const count = matches ? matches.length : 0;
  if (count === 0) continue;
  total += count;
  if (rel.startsWith('design-system/')) dsOffenders.push(`${rel} (${count})`);
}

if (process.argv.includes('--update')) {
  writeFileSync(BASELINE, JSON.stringify({ total }, null, 2) + '\n');
  console.log(`Baseline updated: ${total} raw-hex literal(s).`);
  process.exit(0);
}

let failed = false;

if (dsOffenders.length) {
  failed = true;
  console.error('✗ Raw hex found in src/design-system/ (must be zero — use --sb-* / sbTokens):');
  for (const o of dsOffenders) console.error(`    ${o}`);
}

const baseline = existsSync(BASELINE) ? JSON.parse(readFileSync(BASELINE, 'utf8')).total : Infinity;
if (total > baseline) {
  failed = true;
  console.error(`✗ Raw-hex count increased: ${total} > baseline ${baseline}. New screens/components must use --sb-* tokens (see docs/design-system.md).`);
} else if (total < baseline) {
  console.log(`✓ Raw-hex count dropped ${baseline} → ${total}. Run \`npm run lint:colors -- --update\` to re-pin the baseline.`);
}

if (failed) process.exit(1);
console.log(`✓ Color guard passed (${total} raw-hex literal(s); baseline ${baseline}; design-system clean).`);
