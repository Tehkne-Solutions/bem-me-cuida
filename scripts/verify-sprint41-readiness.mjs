import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const failures = [];
const required = [
  'release/cycle-0.12.0/proposal-decision-policy.json',
  'scripts/lib/cycle012-proposal-decision.mjs',
  'scripts/test-cycle012-proposal-decision.mjs',
  '.github/workflows/sprint41.yml',
  'docs/SPRINT-41.md',
  'docs/ADR-045-decisoes-humanas-sem-execucao.md'
];
for (const path of required) if (!existsSync(join(root, path))) failures.push(`arquivo ausente: ${path}`);
const policy = JSON.parse(readFileSync(join(root, required[0]), 'utf8'));
if (policy.status !== 'human-proposal-decision-ready-execution-blocked') failures.push('status inválido');
for (const decision of ['accept-for-future-correction','reject-proposal','request-replacement']) if (!policy.decisions?.includes(decision)) failures.push(`decisão ausente: ${decision}`);
for (const value of Object.values(policy.controls ?? {})) if (value !== true) failures.push('controle fail-closed ausente');
const migrationDir = join(root, 'supabase/migrations');
if (existsSync(migrationDir)) {
  const premature = readdirSync(migrationDir).filter((name) => /^(022|023|024|025|026|027|028|029)[_-]/.test(name));
  if (premature.length) failures.push(`migrations prematuras: ${premature.join(', ')}`);
}
if (failures.length) {
  console.error('Sprint 41 reprovado:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log('Sprint 41 pronto em modo decisão humana sem execução.');
console.log('Tehkné Solutions');
