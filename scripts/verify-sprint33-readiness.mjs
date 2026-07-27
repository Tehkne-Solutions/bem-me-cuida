import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const failures = [];
const required = [
  '.github/workflows/cycle012-review-capture.yml',
  '.github/workflows/sprint33.yml',
  'release/cycle-0.12.0/review-capture-config.json',
  'scripts/create-cycle012-review-record.mjs',
  'scripts/test-cycle012-human-review-capture.mjs',
  'scripts/verify-cycle012-human-review-capture.mjs',
  'scripts/verify-sprint33-readiness.mjs',
  'docs/SPRINT-33.md',
  'docs/ADR-037-captura-protegida-de-revisoes-humanas.md'
];
for (const path of required) {
  if (!existsSync(join(root, path))) failures.push(`arquivo obrigatório ausente: ${path}`);
}

const capturePath = join(root, '.github/workflows/cycle012-review-capture.yml');
const capture = existsSync(capturePath) ? readFileSync(capturePath, 'utf8') : '';
for (const marker of [
  'workflow_dispatch:',
  'github.repository_id',
  'github.actor_id',
  'create-cycle012-review-record.mjs',
  'verify-cycle012-human-review-capture.mjs',
  'gh pr create',
  'contents: write',
  'pull-requests: write'
]) {
  if (!capture.includes(marker)) failures.push(`workflow de captura sem marcador: ${marker}`);
}
for (const forbidden of ['pull_request_target:', 'gh pr merge', 'merge_pull_request', 'supabase db push', 'eas build', 'curl -H "Authorization']) {
  if (capture.includes(forbidden)) failures.push(`workflow de captura contém operação proibida: ${forbidden}`);
}

const sprintPath = join(root, '.github/workflows/sprint33.yml');
const sprint = existsSync(sprintPath) ? readFileSync(sprintPath, 'utf8') : '';
for (const marker of [
  'verify-sprint33-readiness.mjs',
  'test-cycle012-human-review-capture.mjs',
  'verify-cycle012-human-review-capture.mjs structure',
  'verify-cycle012-human-review-capture.mjs report'
]) {
  if (!sprint.includes(marker)) failures.push(`workflow Sprint 33 sem marcador: ${marker}`);
}
for (const forbidden of ['contents: write', 'pull-requests: write', 'gh pr create', 'supabase db push', 'eas build']) {
  if (sprint.includes(forbidden)) failures.push(`workflow Sprint 33 contém operação externa: ${forbidden}`);
}

const packagePath = join(root, 'package.json');
const packageText = existsSync(packagePath) ? readFileSync(packagePath, 'utf8') : '';
for (const marker of [
  'cycle012:review-capture:test',
  'cycle012:review-capture:structure',
  'cycle012:review-capture:report',
  'sprint33:check',
  'verify-sprint33-readiness.mjs'
]) {
  if (!packageText.includes(marker)) failures.push(`package.json sem integração: ${marker}`);
}

const configPath = join(root, 'release/cycle-0.12.0/review-capture-config.json');
const config = existsSync(configPath) ? JSON.parse(readFileSync(configPath, 'utf8')) : {};
if (config.status !== 'capture-ready-activation-blocked') failures.push('configuração não está em capture-ready-activation-blocked.');
if (config.controls?.doesNotActivateCycle !== true || config.controls?.doesNotAuthorizeMigrations !== true || config.controls?.doesNotAuthorizeImplementation !== true) failures.push('configuração do Sprint 33 não permanece fail-closed.');

if (failures.length) {
  console.error('Sprint 33 reprovado:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('Sprint 33 aprovado: captura humana protegida e ativação bloqueada.');
console.log('Tehkné Solutions');
