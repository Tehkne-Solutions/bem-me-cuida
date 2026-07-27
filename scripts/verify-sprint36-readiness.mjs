import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const failures = [];
const required = [
  '.github/workflows/cycle012-operations-command.yml',
  '.github/workflows/sprint36.yml',
  'release/cycle-0.12.0/operations-dashboard-config.json',
  'release/cycle-0.12.0/operations-queue-config.json',
  'scripts/lib/cycle012-operations-command-router.mjs',
  'scripts/lib/cycle012-operations-queue.mjs',
  'scripts/generate-cycle012-operations-queue.mjs',
  'scripts/run-cycle012-operations-command.mjs',
  'scripts/test-cycle012-operations-queue.mjs',
  'scripts/verify-cycle012-operations-queue.mjs',
  'scripts/verify-sprint36-readiness.mjs',
  'docs/SPRINT-36.md',
  'docs/ADR-040-fila-operacional-baseada-em-papeis.md',
];
for (const path of required) if (!existsSync(join(root, path))) failures.push(`arquivo obrigatório ausente: ${path}`);

const operationsWorkflowPath = join(root, '.github/workflows/cycle012-operations-command.yml');
const operationsWorkflow = existsSync(operationsWorkflowPath) ? readFileSync(operationsWorkflowPath, 'utf8') : '';
for (const marker of ['issue_comment:', 'github.event.issue.pull_request == null', 'OWNER', 'MEMBER', 'COLLABORATOR', 'ref: main', 'persist-credentials: false', 'run-cycle012-operations-command.mjs', 'issues: write', 'contents: read']) {
  if (!operationsWorkflow.includes(marker)) failures.push(`workflow operacional sem marcador: ${marker}`);
}
for (const forbidden of ['pull_request_target', 'contents: write', 'supabase db push', 'eas build', 'gh pr merge', 'git push', 'gh api --method DELETE']) {
  if (operationsWorkflow.includes(forbidden)) failures.push(`workflow operacional contém operação proibida: ${forbidden}`);
}

const sprintWorkflowPath = join(root, '.github/workflows/sprint36.yml');
const sprintWorkflow = existsSync(sprintWorkflowPath) ? readFileSync(sprintWorkflowPath, 'utf8') : '';
for (const marker of ['verify-sprint36-readiness.mjs', 'test-cycle012-operations-queue.mjs', 'verify-cycle012-operations-queue.mjs structure', 'generate-cycle012-operations-queue.mjs', 'cycle012-queue-command-$command.md', 'actions/upload-artifact@v4']) {
  if (!sprintWorkflow.includes(marker)) failures.push(`workflow Sprint 36 sem marcador: ${marker}`);
}
for (const forbidden of ['supabase db push', 'eas build', 'gh pr merge', 'git push', 'gh api --method DELETE', 'contents: write']) {
  if (sprintWorkflow.includes(forbidden)) failures.push(`workflow Sprint 36 contém operação proibida: ${forbidden}`);
}

const dashboardConfigPath = join(root, 'release/cycle-0.12.0/operations-dashboard-config.json');
const dashboardConfig = existsSync(dashboardConfigPath) ? JSON.parse(readFileSync(dashboardConfigPath, 'utf8')) : {};
for (const command of ['status', 'reviews', 'blockers', 'gates', 'queue', 'owners', 'next']) {
  if (!dashboardConfig.commands?.allowed?.includes(command)) failures.push(`comando operacional ausente: ${command}`);
}
if (dashboardConfig.commands?.exactMatchRequired !== true || dashboardConfig.commands?.freeTextAllowed !== false) failures.push('comandos operacionais não estão estritos.');

const queueConfigPath = join(root, 'release/cycle-0.12.0/operations-queue-config.json');
const queueConfig = existsSync(queueConfigPath) ? JSON.parse(readFileSync(queueConfigPath, 'utf8')) : {};
if (queueConfig.controls?.doesNotAssignPeople !== true || queueConfig.controls?.doesNotExecuteNextSteps !== true) failures.push('fila não preserva bloqueios de atribuição e execução.');

const packagePath = join(root, 'package.json');
const packageText = existsSync(packagePath) ? readFileSync(packagePath, 'utf8') : '';
for (const marker of ['cycle012:queue:test', 'cycle012:queue:structure', 'cycle012:queue:report', 'cycle012:queue:build', 'sprint36:check', 'verify-sprint36-readiness.mjs']) {
  if (!packageText.includes(marker)) failures.push(`package.json sem integração: ${marker}`);
}

const migrationDir = join(root, 'supabase/migrations');
if (existsSync(migrationDir)) {
  const premature = readdirSync(migrationDir).filter((name) => /^(022|023|024|025|026|027|028|029)[_-]/.test(name));
  if (premature.length) failures.push(`migrations prematuras detectadas: ${premature.join(', ')}`);
}

if (failures.length) {
  console.error('Sprint 36 reprovado:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log('Sprint 36 aprovado: fila operacional por papéis, dependências e próximos passos verificáveis.');
console.log('Tehkné Solutions');
