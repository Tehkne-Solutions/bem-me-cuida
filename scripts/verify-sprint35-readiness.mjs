import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const failures = [];
const required = [
  '.github/workflows/cycle012-operations-command.yml',
  '.github/workflows/sprint35.yml',
  'release/cycle-0.12.0/operations-dashboard-config.json',
  'scripts/lib/cycle012-operations-dashboard.mjs',
  'scripts/generate-cycle012-operations-dashboard.mjs',
  'scripts/run-cycle012-operations-command.mjs',
  'scripts/test-cycle012-operations-dashboard.mjs',
  'scripts/verify-cycle012-operations-dashboard.mjs',
  'scripts/verify-sprint35-readiness.mjs',
  'docs/SPRINT-35.md',
  'docs/ADR-039-painel-operacional-e-comandos-protegidos.md',
];
for (const path of required) if (!existsSync(join(root, path))) failures.push(`arquivo obrigatório ausente: ${path}`);

const commandWorkflowPath = join(root, '.github/workflows/cycle012-operations-command.yml');
const commandWorkflow = existsSync(commandWorkflowPath) ? readFileSync(commandWorkflowPath, 'utf8') : '';
for (const marker of [
  'issue_comment:',
  'github.event.issue.pull_request == null',
  'OWNER',
  'MEMBER',
  'COLLABORATOR',
  'ref: main',
  'persist-credentials: false',
  'run-cycle012-operations-command.mjs',
  'issues: write',
  'contents: read',
]) {
  if (!commandWorkflow.includes(marker)) failures.push(`workflow operacional sem marcador: ${marker}`);
}
for (const forbidden of ['pull_request_target', 'contents: write', 'supabase db push', 'eas build', 'gh pr merge', 'git push', 'gh api --method DELETE']) {
  if (commandWorkflow.includes(forbidden)) failures.push(`workflow operacional contém operação proibida: ${forbidden}`);
}

const sprintWorkflowPath = join(root, '.github/workflows/sprint35.yml');
const sprintWorkflow = existsSync(sprintWorkflowPath) ? readFileSync(sprintWorkflowPath, 'utf8') : '';
for (const marker of [
  'verify-sprint35-readiness.mjs',
  'test-cycle012-operations-dashboard.mjs',
  'verify-cycle012-operations-dashboard.mjs structure',
  'generate-cycle012-operations-dashboard.mjs',
  'cycle012-command-$command.md',
  'actions/upload-artifact@v4',
]) {
  if (!sprintWorkflow.includes(marker)) failures.push(`workflow Sprint 35 sem marcador: ${marker}`);
}
for (const forbidden of ['supabase db push', 'eas build', 'gh pr merge', 'git push', 'gh api --method DELETE']) {
  if (sprintWorkflow.includes(forbidden)) failures.push(`workflow Sprint 35 contém operação proibida: ${forbidden}`);
}

const packagePath = join(root, 'package.json');
const packageText = existsSync(packagePath) ? readFileSync(packagePath, 'utf8') : '';
for (const marker of [
  'cycle012:operations:test',
  'cycle012:operations:structure',
  'cycle012:operations:dashboard',
  'cycle012:operations:command',
  'sprint35:check',
  'verify-sprint35-readiness.mjs',
]) {
  if (!packageText.includes(marker)) failures.push(`package.json sem integração: ${marker}`);
}

const migrationDir = join(root, 'supabase/migrations');
if (existsSync(migrationDir)) {
  const premature = readdirSync(migrationDir).filter((name) => /^(022|023|024|025|026|027|028|029)[_-]/.test(name));
  if (premature.length) failures.push(`migrations prematuras detectadas: ${premature.join(', ')}`);
}

if (failures.length) {
  console.error('Sprint 35 reprovado:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log('Sprint 35 aprovado: painel operacional somente leitura e comandos protegidos.');
console.log('Tehkné Solutions');
