import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const failures = [];
const required = [
  '.github/workflows/cycle012-queue-update.yml',
  '.github/workflows/sprint37.yml',
  'release/cycle-0.12.0/queue-update-policy.json',
  'scripts/lib/cycle012-queue-update.mjs',
  'scripts/create-cycle012-queue-update.mjs',
  'scripts/test-cycle012-queue-update.mjs',
  'scripts/verify-cycle012-queue-update.mjs',
  'scripts/verify-sprint37-readiness.mjs',
  'docs/SPRINT-37.md',
  'docs/ADR-041-registro-protegido-de-atualizacoes-da-fila.md',
];
for (const path of required) if (!existsSync(join(root, path))) failures.push(`arquivo obrigatório ausente: ${path}`);

const captureWorkflowPath = join(root, '.github/workflows/cycle012-queue-update.yml');
const captureWorkflow = existsSync(captureWorkflowPath) ? readFileSync(captureWorkflowPath, 'utf8') : '';
for (const marker of [
  'workflow_dispatch:',
  'ref: main',
  'contents: write',
  'pull-requests: write',
  'collaborators/$ACTOR/permission',
  'admin|maintain|write',
  'create-cycle012-queue-update.mjs',
  'release/cycle-0.12.0/queue-updates/',
  'gh pr create',
  'test "$(git diff --cached --name-only | wc -l)" -eq 1',
]) {
  if (!captureWorkflow.includes(marker)) failures.push(`workflow de captura sem marcador: ${marker}`);
}
for (const forbidden of ['pull_request_target', 'gh pr merge', 'supabase db push', 'eas build', 'gh api --method DELETE', 'git push --force', 'activationAllowed: true']) {
  if (captureWorkflow.includes(forbidden)) failures.push(`workflow de captura contém operação proibida: ${forbidden}`);
}

const sprintWorkflowPath = join(root, '.github/workflows/sprint37.yml');
const sprintWorkflow = existsSync(sprintWorkflowPath) ? readFileSync(sprintWorkflowPath, 'utf8') : '';
for (const marker of [
  'verify-sprint37-readiness.mjs',
  'test-cycle012-queue-update.mjs',
  'verify-cycle012-queue-update.mjs structure',
  'create-cycle012-queue-update.mjs',
  'generate-cycle012-operations-queue.mjs',
  'actions/upload-artifact@v4',
]) {
  if (!sprintWorkflow.includes(marker)) failures.push(`workflow Sprint 37 sem marcador: ${marker}`);
}
for (const forbidden of ['contents: write', 'pull-requests: write', 'gh pr create', 'gh pr merge', 'git push', 'supabase db push', 'eas build']) {
  if (sprintWorkflow.includes(forbidden)) failures.push(`workflow Sprint 37 contém operação proibida: ${forbidden}`);
}

for (const [path, markers] of Object.entries({
  'scripts/generate-cycle012-operations-queue.mjs': ['queue-update-policy.json', 'applyQueueUpdates', 'mergedUpdateCount'],
  'scripts/run-cycle012-operations-command.mjs': ['queue-update-policy.json', 'applyQueueUpdates', 'updates.length'],
  'scripts/lib/cycle012-operations-queue.mjs': ['Progresso reportado', 'Relatos incorporados', 'não conclui a pendência'],
})) {
  const text = existsSync(join(root, path)) ? readFileSync(join(root, path), 'utf8') : '';
  for (const marker of markers) if (!text.includes(marker)) failures.push(`${path} sem integração: ${marker}`);
}

const packagePath = join(root, 'package.json');
const packageText = existsSync(packagePath) ? readFileSync(packagePath, 'utf8') : '';
for (const marker of [
  'cycle012:queue-update:test',
  'cycle012:queue-update:structure',
  'cycle012:queue-update:create',
  'sprint37:check',
  'verify-sprint37-readiness.mjs',
]) {
  if (!packageText.includes(marker)) failures.push(`package.json sem integração: ${marker}`);
}

const migrationDir = join(root, 'supabase/migrations');
if (existsSync(migrationDir)) {
  const premature = readdirSync(migrationDir).filter((name) => /^(022|023|024|025|026|027|028|029)[_-]/.test(name));
  if (premature.length) failures.push(`migrations prematuras detectadas: ${premature.join(', ')}`);
}

if (failures.length) {
  console.error('Sprint 37 reprovado:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log('Sprint 37 aprovado: atualizações da fila são informativas, versionadas e dependem de PR humano.');
console.log('Tehkné Solutions');
