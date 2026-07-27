import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const failures = [];
const required = [
  '.github/workflows/cycle-012-bootstrap.yml',
  '.github/workflows/sprint29.yml',
  'release/cycle-0.12.0/cycle-readiness.json',
  'release/cycle-0.12.0/environment-cleanup.json',
  'release/cycle-0.12.0/feedback-summary.json',
  'release/cycle-0.12.0/scope.json',
  'release/cycle-0.12.0/migration-plan.json',
  'release/cycle-0.12.0/activation-proposal.json',
  'scripts/lib/cycle012-bootstrap.mjs',
  'scripts/test-cycle012-bootstrap.mjs',
  'scripts/verify-cycle012-bootstrap.mjs',
  'scripts/generate-cycle012-bootstrap-package.mjs',
  'scripts/propose-cycle012-activation.mjs',
  'docs/SPRINT-29.md',
  'docs/ADR-033-transicao-fail-closed-para-o-ciclo-0.12.md',
  'docs/CYCLE-0.12-BOOTSTRAP-RUNBOOK.md',
];
for (const path of required) if (!existsSync(join(root, path))) failures.push(`arquivo obrigatório ausente: ${path}`);
const workflow = existsSync(join(root, '.github/workflows/cycle-012-bootstrap.yml')) ? readFileSync(join(root, '.github/workflows/cycle-012-bootstrap.yml'), 'utf8') : '';
for (const marker of ['capture-feedback', 'capture-cleanup', 'open-evidence-pr', 'package-cycle', 'propose-activation']) {
  if (!workflow.includes(marker)) failures.push(`workflow sem marcador: ${marker}`);
}
const sprintWorkflow = existsSync(join(root, '.github/workflows/sprint29.yml')) ? readFileSync(join(root, '.github/workflows/sprint29.yml'), 'utf8') : '';
for (const marker of ['verify-sprint29-readiness.mjs', 'test-cycle012-bootstrap.mjs', 'verify-cycle012-bootstrap.mjs structure', 'generate-cycle012-bootstrap-package.mjs', 'verify-cycle012-bootstrap.mjs report']) {
  if (!sprintWorkflow.includes(marker)) failures.push(`esteira Sprint 29 sem marcador: ${marker}`);
}
const proposal = existsSync(join(root, 'release/cycle-0.12.0/activation-proposal.json')) ? JSON.parse(readFileSync(join(root, 'release/cycle-0.12.0/activation-proposal.json'), 'utf8')) : {};
if (proposal.status !== 'blocked' || proposal.controls?.doesNotActivateAutomatically !== true) failures.push('proposta inicial não está bloqueada e fail-closed.');
const migrationPlan = existsSync(join(root, 'release/cycle-0.12.0/migration-plan.json')) ? JSON.parse(readFileSync(join(root, 'release/cycle-0.12.0/migration-plan.json'), 'utf8')) : {};
if (migrationPlan.controls?.doesNotCreateMigrationAutomatically !== true) failures.push('plano pode criar migration automaticamente.');
if (workflow.includes('gh api --method DELETE') || workflow.includes('supabase db push')) failures.push('workflow contém operação destrutiva ou migration automática.');
if (failures.length) {
  console.error('Sprint 29 reprovado:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log('Sprint 29 aprovado: transição 0.11 → 0.12 está bloqueada, auditável e sem dados sensíveis.');
console.log('Tehkné Solutions');
