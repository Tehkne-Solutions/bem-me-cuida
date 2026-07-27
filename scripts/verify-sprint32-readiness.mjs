import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const failures = [];
const required = [
  '.github/workflows/sprint32.yml',
  'release/cycle-0.12.0/review-package.json',
  'release/cycle-0.12.0/threat-model.json',
  'release/cycle-0.12.0/approval-policy.json',
  'scripts/test-cycle012-review-package.mjs',
  'scripts/verify-cycle012-review-package.mjs',
  'scripts/verify-sprint32-readiness.mjs',
  'docs/SPRINT-32.md',
  'docs/ADR-036-revisao-independente-do-ciclo-0.12.md',
];
for (const path of required) {
  if (!existsSync(join(root, path))) failures.push(`arquivo obrigatório ausente: ${path}`);
}

const workflowPath = join(root, '.github/workflows/sprint32.yml');
const workflow = existsSync(workflowPath) ? readFileSync(workflowPath, 'utf8') : '';
for (const marker of [
  'verify-sprint32-readiness.mjs',
  'test-cycle012-review-package.mjs',
  'verify-cycle012-review-package.mjs structure',
  'verify-cycle012-review-package.mjs report',
]) {
  if (!workflow.includes(marker)) failures.push(`workflow Sprint 32 sem marcador: ${marker}`);
}
for (const forbidden of ['supabase db push', 'gh api --method DELETE', 'eas build', 'gh pr merge']) {
  if (workflow.includes(forbidden)) failures.push(`workflow Sprint 32 contém operação proibida: ${forbidden}`);
}

const packagePath = join(root, 'package.json');
const packageText = existsSync(packagePath) ? readFileSync(packagePath, 'utf8') : '';
for (const marker of [
  'cycle012:review:test',
  'cycle012:review:structure',
  'sprint32:check',
  'verify-sprint32-readiness.mjs',
]) {
  if (!packageText.includes(marker)) failures.push(`package.json sem integração: ${marker}`);
}

const reviewPath = join(root, 'release/cycle-0.12.0/review-package.json');
const policyPath = join(root, 'release/cycle-0.12.0/approval-policy.json');
const review = existsSync(reviewPath) ? JSON.parse(readFileSync(reviewPath, 'utf8')) : {};
const policy = existsSync(policyPath) ? JSON.parse(readFileSync(policyPath, 'utf8')) : {};
if (review.status !== 'review-blocked' || review.recommendation !== 'hold') {
  failures.push('pacote do Sprint 32 não permanece bloqueado.');
}
if (policy.approvalRecord?.status !== 'pending' || policy.activationRules?.automaticActivationAllowed !== false) {
  failures.push('política do Sprint 32 contém aprovação ou ativação prematura.');
}

if (failures.length) {
  console.error('Sprint 32 reprovado:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('Sprint 32 aprovado: revisão independente preparada e ativação bloqueada.');
console.log('Tehkné Solutions');
