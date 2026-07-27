import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const failures = [];
const required = [
  '.github/workflows/cycle012-resolution-proposal.yml',
  '.github/workflows/sprint39.yml',
  'release/cycle-0.12.0/resolution-proposal-policy.json',
  'scripts/lib/cycle012-resolution-proposal.mjs',
  'scripts/create-cycle012-resolution-proposal.mjs',
  'scripts/test-cycle012-resolution-proposal.mjs',
  'scripts/verify-cycle012-resolution-proposal.mjs',
  'scripts/verify-sprint39-readiness.mjs',
  'docs/SPRINT-39.md',
  'docs/ADR-043-propostas-humanas-de-resolucao.md',
];
for (const path of required) if (!existsSync(join(root, path))) failures.push(`arquivo obrigatório ausente: ${path}`);

const qualityPath = join(root, '.github/workflows/sprint39.yml');
const quality = existsSync(qualityPath) ? readFileSync(qualityPath, 'utf8') : '';
for (const marker of [
  'verify-sprint39-readiness.mjs',
  'test-cycle012-resolution-proposal.mjs',
  'verify-cycle012-resolution-proposal.mjs structure',
  'verify-cycle012-resolution-proposal.mjs report',
]) {
  if (!quality.includes(marker)) failures.push(`workflow Sprint 39 sem marcador: ${marker}`);
}
for (const forbidden of ['contents: write', 'pull-requests: write', 'gh pr merge', 'supabase db push', 'eas build', 'eas submit', 'git push']) {
  if (quality.includes(forbidden)) failures.push(`workflow de qualidade contém operação proibida: ${forbidden}`);
}

const operationsPath = join(root, '.github/workflows/cycle012-resolution-proposal.yml');
const operations = existsSync(operationsPath) ? readFileSync(operationsPath, 'utf8') : '';
for (const marker of [
  'workflow_dispatch',
  'Checkout trusted main',
  'Authorize repository member',
  'reconcile-cycle012-queue-updates.mjs',
  'create-cycle012-resolution-proposal.mjs',
  'test "$(git diff --cached --name-only | wc -l)" -eq 1',
  'gh pr create',
]) {
  if (!operations.includes(marker)) failures.push(`workflow operacional sem marcador: ${marker}`);
}
for (const forbidden of ['gh pr merge', 'supabase db push', 'eas build', 'eas submit', 'DELETE']) {
  if (operations.includes(forbidden)) failures.push(`workflow operacional contém execução proibida: ${forbidden}`);
}

const policyPath = join(root, 'release/cycle-0.12.0/resolution-proposal-policy.json');
const policy = existsSync(policyPath) ? JSON.parse(readFileSync(policyPath, 'utf8')) : {};
if (policy.status !== 'human-resolution-proposal-ready-activation-blocked') failures.push('política do Sprint 39 não permanece bloqueada.');
if (policy.proposal?.autoApplyForbidden !== true || policy.controls?.doesNotActivateCycle !== true) failures.push('política do Sprint 39 não está fail-closed.');

const migrationDir = join(root, 'supabase/migrations');
if (existsSync(migrationDir)) {
  const premature = readdirSync(migrationDir).filter((name) => /^(022|023|024|025|026|027|028|029)[_-]/.test(name));
  if (premature.length) failures.push(`migrations prematuras detectadas: ${premature.join(', ')}`);
}

if (failures.length) {
  console.error('Sprint 39 reprovado:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log('Sprint 39 aprovado: propostas humanas separadas da correção da fonte.');
console.log('Tehkné Solutions');
