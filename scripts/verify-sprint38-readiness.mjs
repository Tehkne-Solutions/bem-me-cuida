import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const failures = [];
const required = [
  '.github/workflows/ci.yml',
  '.github/workflows/cycle012-queue-reconciliation.yml',
  '.github/workflows/sprint38.yml',
  'release/cycle-0.12.0/queue-reconciliation-policy.json',
  'scripts/lib/cycle012-queue-reconciliation.mjs',
  'scripts/reconcile-cycle012-queue-updates.mjs',
  'scripts/test-cycle012-queue-reconciliation.mjs',
  'scripts/verify-cycle012-queue-reconciliation.mjs',
  'scripts/verify-sprint38-readiness.mjs',
  'docs/SPRINT-38.md',
  'docs/ADR-042-reconciliacao-auditavel-dos-relatos.md',
];
for (const path of required) if (!existsSync(join(root, path))) failures.push(`arquivo obrigatório ausente: ${path}`);

const qualityWorkflowPath = join(root, '.github/workflows/sprint38.yml');
const qualityWorkflow = existsSync(qualityWorkflowPath) ? readFileSync(qualityWorkflowPath, 'utf8') : '';
for (const marker of [
  'verify-sprint38-readiness.mjs',
  'test-cycle012-queue-reconciliation.mjs',
  'verify-cycle012-queue-reconciliation.mjs structure',
  'reconcile-cycle012-queue-updates.mjs',
]) {
  if (!qualityWorkflow.includes(marker)) failures.push(`workflow Sprint 38 sem marcador: ${marker}`);
}

const operationsWorkflowPath = join(root, '.github/workflows/cycle012-queue-reconciliation.yml');
const operationsWorkflow = existsSync(operationsWorkflowPath) ? readFileSync(operationsWorkflowPath, 'utf8') : '';
for (const marker of ['workflow_dispatch', 'permissions:', 'contents: read', 'reconcile-cycle012-queue-updates.mjs', 'upload-artifact@v4']) {
  if (!operationsWorkflow.includes(marker)) failures.push(`workflow operacional sem marcador: ${marker}`);
}

const ciWorkflowPath = join(root, '.github/workflows/ci.yml');
const ciWorkflow = existsSync(ciWorkflowPath) ? readFileSync(ciWorkflowPath, 'utf8') : '';
for (const marker of [
  'Validate Sprint 38 reconciliation',
  'verify-sprint38-readiness.mjs',
  'test-cycle012-queue-reconciliation.mjs',
  'verify-cycle012-queue-reconciliation.mjs structure',
]) {
  if (!ciWorkflow.includes(marker)) failures.push(`CI principal sem integração do Sprint 38: ${marker}`);
}

for (const forbidden of [
  'contents: write', 'pull-requests: write', 'issues: write', 'supabase db push', 'gh pr merge',
  'eas build', 'eas submit', 'DELETE', 'git push',
]) {
  if (qualityWorkflow.includes(forbidden) || operationsWorkflow.includes(forbidden)) failures.push(`workflow contém operação proibida: ${forbidden}`);
}

const migrationDir = join(root, 'supabase/migrations');
if (existsSync(migrationDir)) {
  const premature = readdirSync(migrationDir).filter((name) => /^(022|023|024|025|026|027|028|029)[_-]/.test(name));
  if (premature.length) failures.push(`migrations prematuras detectadas: ${premature.join(', ')}`);
}

if (failures.length) {
  console.error('Sprint 38 reprovado:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log('Sprint 38 aprovado: reconciliação auditável sem correção automática.');
console.log('Tehkné Solutions');
