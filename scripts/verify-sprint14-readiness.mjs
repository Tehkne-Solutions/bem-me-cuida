import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const failures = [];
const notices = [];
const read = (path) => readFileSync(join(root, path), 'utf8');
const readJson = (path) => JSON.parse(read(path));
const fail = (message) => failures.push(message);
const ok = (message) => notices.push(message);

const requiredFiles = [
  'docs/SPRINT-14.md',
  'docs/ADR-018-execucao-ciclo-experimentos-gates.md',
  'docs/CYCLE-EXECUTION-0.11.0.md',
  'docs/EXPERIMENTATION-PRIVACY.md',
  'docs/RC-0.11.0-RUNBOOK.md',
  '.maestro/cycle-execution-console.yml',
  'scripts/generate-cycle-execution-report.mjs',
  'scripts/verify-cycle-rc-readiness.mjs',
  'supabase/migrations/202607260019_cycle_execution_schema.sql',
  'supabase/migrations/202607260020_cycle_execution_functions.sql',
  'supabase/migrations/202607260021_cycle_execution_blocker_fix.sql',
  'supabase/tests/cycle_execution.sql',
  'apps/mobile/app/cycle-execution-console.tsx',
  'apps/mobile/src/data/cycle-execution-repository.ts',
  'apps/mobile/src/services/cycle-execution-policy.ts',
  'apps/mobile/src/services/cycle-execution-policy.test.ts',
];
for (const path of requiredFiles) {
  if (!existsSync(join(root, path))) fail(`Arquivo obrigatório do Sprint 14 ausente: ${path}`);
}
if (!failures.length) ok(`${requiredFiles.length} arquivos do Sprint 14 encontrados.`);

const rootPackage = readJson('package.json');
for (const script of ['sprint14:check', 'cycle:report', 'cycle:rc:check', 'e2e:cycle']) {
  if (!rootPackage.scripts?.[script]) fail(`Script obrigatório ausente: ${script}`);
}
if (!String(rootPackage.scripts?.['release:check'] ?? '').includes('verify-sprint14-readiness')) {
  fail('release:check não inclui o Sprint 14.');
}

const schema = read('supabase/migrations/202607260019_cycle_execution_schema.sql');
for (const marker of [
  'cycle_backlog_items', 'priority_score', 'cycle_objectives', 'cycle_key_results', 'cycle_scope_changes',
  'product_experiments', 'consent_required boolean not null default true', 'experiment_measurements',
  'delivery_milestones', 'cycle_release_gates', 'enable row level security',
]) {
  if (!schema.includes(marker)) fail(`Schema de execução sem marcador: ${marker}`);
}

const functions = read('supabase/migrations/202607260020_cycle_execution_functions.sql');
const blockerFix = read('supabase/migrations/202607260021_cycle_execution_blocker_fix.sql');
for (const marker of [
  'operator_upsert_cycle_backlog_item', 'operator_create_cycle_objective', 'operator_add_cycle_key_result',
  'operator_request_scope_change', 'admin_decide_scope_change', 'four_eyes_approval_required',
  'operator_create_experiment', 'admin_decide_experiment', 'operator_record_experiment_measurement',
  'operator_create_delivery_milestone', 'operator_initialize_cycle_release_gates', 'operator_set_cycle_release_gate',
  'operator_get_cycle_execution_blockers', 'cycle_freeze_blocked', 'cycle_release_blocked',
]) {
  if (!functions.includes(marker) && !blockerFix.includes(marker)) fail(`RPCs do ciclo sem marcador: ${marker}`);
}

const policy = read('apps/mobile/src/services/cycle-execution-policy.ts');
for (const marker of ['calculateBacklogPriority', 'evaluateExperiment', 'insufficient_sample', 'guardrail_failed', 'evaluateCycleExecution']) {
  if (!policy.includes(marker)) fail(`Política do ciclo sem marcador: ${marker}`);
}

const repository = read('apps/mobile/src/data/cycle-execution-repository.ts');
for (const marker of [
  'upsertCycleBacklogItem', 'createCycleObjective', 'addCycleKeyResult', 'requestScopeChange', 'createProductExperiment',
  'recordExperimentMeasurement', 'createDeliveryMilestone', 'initializeCycleReleaseGates', 'getCycleExecutionBlockers',
]) {
  if (!repository.includes(marker)) fail(`Repositório do ciclo sem marcador: ${marker}`);
}

const consoleSource = read('apps/mobile/app/cycle-execution-console.tsx');
for (const marker of [
  'cycle-execution-title', 'cycle-priority-preview', 'cycle-create-backlog', 'cycle-create-objective',
  'cycle-request-scope', 'cycle-create-experiment', 'cycle-record-measurement', 'cycle-create-milestone',
  'cycle-init-gates', 'cycle-freeze-readiness', 'cycle-freeze', 'cycle-release', 'Tehkné Solutions',
]) {
  if (!consoleSource.includes(marker)) fail(`Console do ciclo sem marcador: ${marker}`);
}

const layout = read('apps/mobile/app/_layout.tsx');
if (!layout.includes('cycle-execution-console')) fail('Rota do console do ciclo não está registrada.');

const report = read('scripts/generate-cycle-execution-report.mjs');
for (const marker of ['containsPersonalData: false', 'containsClinicalData: false', "currency: 'BRL'", 'Tehkné Solutions']) {
  if (!report.includes(marker)) fail(`Relatório do ciclo sem marcador: ${marker}`);
}

const combined = [schema, functions, blockerFix, repository, consoleSource, report].join('\n');
if (/service[_-]?role/i.test(combined)) fail('Referência a service role detectada no Sprint 14.');
if (/journal|diagn[oó]stico|medicamento/i.test(report)) fail('Relatório do ciclo não deve incluir categorias clínicas ou conteúdo do Diário.');
if (!consoleSource.includes('consentRequired') || !consoleSource.includes('Consentimento obrigatório')) {
  fail('Console não evidencia consentimento obrigatório em experimentos.');
}

if (failures.length) {
  console.error('Sprint 14 check reprovado:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('Sprint 14 check aprovado:');
for (const notice of notices) console.log(`- ${notice}`);
console.log('- Backlog, OKRs, escopo, experimentos, marcos e gates estão protegidos por RLS e RPCs auditadas.');
console.log('- Congelamento e lançamento dependem dos bloqueadores avaliados pelo servidor.');
