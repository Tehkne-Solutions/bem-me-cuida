import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const mode = process.argv[2] ?? 'structure';
const failures = [];
const fail = (message) => failures.push(message);
const readJson = (path) => JSON.parse(readFileSync(join(root, path), 'utf8'));
const required = [
  'release/cycle-0.12.0/cycle-readiness.json',
  'release/cycle-0.12.0/environment-cleanup.json',
  'release/cycle-0.12.0/feedback-summary.json',
  'release/cycle-0.12.0/scope.json',
  'release/cycle-0.12.0/migration-plan.json',
  'scripts/lib/cycle012-bootstrap.mjs',
  'scripts/capture-cycle012-feedback-summary.mjs',
  'scripts/capture-cycle012-environment-cleanup.mjs',
  'scripts/apply-cycle012-capture.mjs',
  'scripts/generate-cycle012-bootstrap-package.mjs',
  'scripts/propose-cycle012-activation.mjs',
  '.github/workflows/cycle-012-bootstrap.yml',
  'docs/CYCLE-0.12-BOOTSTRAP-RUNBOOK.md',
];
for (const path of required) if (!existsSync(join(root, path))) fail(`arquivo obrigatório ausente: ${path}`);
if (existsSync(join(root, 'release/cycle-0.12.0/cycle-readiness.json'))) {
  const readiness = readJson('release/cycle-0.12.0/cycle-readiness.json');
  if (readiness.status !== 'blocked-awaiting-011-closure') fail('prontidão inicial do ciclo não está bloqueada.');
  if (readiness.controls?.doesNotActivateAutomatically !== true) fail('ciclo pode ser ativado automaticamente.');
}
if (existsSync(join(root, 'release/cycle-0.12.0/environment-cleanup.json'))) {
  const cleanup = readJson('release/cycle-0.12.0/environment-cleanup.json');
  if (cleanup.status !== 'blocked-awaiting-cycle-closure') fail('limpeza inicial não aguarda encerramento do ciclo.');
  if (cleanup.controls?.deletionIsNotAutomatic !== true) fail('limpeza não declara proibição de exclusão automática.');
  if (!cleanup.protectedEnvironments?.includes('production-release') || !cleanup.protectedEnvironments?.includes('production-observability')) fail('environments permanentes não estão protegidos.');
}
if (existsSync(join(root, 'release/cycle-0.12.0/feedback-summary.json'))) {
  const feedback = readJson('release/cycle-0.12.0/feedback-summary.json');
  if (feedback.controls?.rawTextForbidden !== true || feedback.privacy?.containsRawFeedback !== false) fail('síntese de feedback permite conteúdo bruto.');
}
if (existsSync(join(root, 'release/cycle-0.12.0/migration-plan.json'))) {
  const plan = readJson('release/cycle-0.12.0/migration-plan.json');
  if (plan.status !== 'draft-no-migration-authorized') fail('plano de migrations não inicia bloqueado.');
  if (plan.sequence?.reservedStart !== 22 || plan.sequence?.reservedEnd !== 29) fail('faixa reservada de migrations inválida.');
  if (plan.controls?.doesNotCreateMigrationAutomatically !== true) fail('plano pode criar migration automaticamente.');
}
const migrationsDir = join(root, 'supabase/migrations');
if (existsSync(migrationsDir)) {
  const premature = readdirSync(migrationsDir).filter((name) => /^(02[2-9])_/.test(name));
  if (premature.length) fail(`migration 0.12 criada antes da aprovação: ${premature.join(', ')}`);
}
if (existsSync(join(root, '.github/workflows/cycle-012-bootstrap.yml'))) {
  const workflow = readFileSync(join(root, '.github/workflows/cycle-012-bootstrap.yml'), 'utf8');
  for (const marker of ['capture-feedback', 'capture-cleanup', 'open-evidence-pr', 'package-cycle', 'propose-activation', 'cycle-governance']) {
    if (!workflow.includes(marker)) fail(`workflow sem marcador: ${marker}`);
  }
  if (workflow.includes('delete environment') || workflow.includes('gh api --method DELETE')) fail('workflow contém exclusão automática de environment.');
}
if (mode === 'report' && existsSync(join(root, 'artifacts/bemmecuida-0.12.0-bootstrap.json'))) {
  const report = readJson('artifacts/bemmecuida-0.12.0-bootstrap.json');
  if (report.recommendation !== 'hold') fail('pacote inicial do ciclo deve permanecer em hold.');
  if (report.controls?.doesNotActivateAutomatically !== true) fail('pacote pode ativar o ciclo automaticamente.');
}
if (failures.length) {
  console.error('Bootstrap 0.12.0 reprovado:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log(`Bootstrap 0.12.0 aprovado no modo ${mode}.`);
console.log('Tehkné Solutions');
