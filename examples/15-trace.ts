// Get the CPI tree + per-program CU breakdown for any landed transaction.
// Run: VENUM_API_KEY=... tsx examples/15-trace.ts <signature>

import { VenumClient } from '@venumdev/sdk';
import type { TraceNode } from '@venumdev/sdk';

const sig = process.argv[2];
if (!sig) {
  console.error('usage: tsx 15-trace.ts <signature>');
  process.exit(1);
}

const venum = new VenumClient();
const trace = await venum.trace(sig);

console.log(`Compute units: ${trace.cu.consumed.toLocaleString()} / ${trace.cu.budget.toLocaleString()}`);
console.log(`\nCall tree:`);
function render(node: TraceNode, prefix = ''): void {
  const marker = node.status === 'failed' ? ' FAILED' : '';
  console.log(`${prefix}${node.programId.slice(0, 12)}…  cu=${node.cuConsumed}${marker}`);
  node.children.forEach((c) => render(c, prefix + '  '));
}
trace.tree.forEach((n) => render(n));

console.log(`\nPer-program totals:`);
trace.programs.forEach((p) => console.log(`  ${p.programId.slice(0, 12)}…  ${p.totalCu}cu  ${p.invocations}x`));
