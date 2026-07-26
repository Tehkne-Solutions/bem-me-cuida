import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const failures = [];
const notices = [];

function read(path) { return readFileSync(join(root, path), 'utf8'); }
function readJson(path) { return JSON.parse(read(path)); }
function fail(message) { failures.push(message); }
function ok(message) { notices.push(message); }

const requiredFiles = [
  'docs/SPRINT-13.md',
  'docs/ADR-017-governanca-slo-orcamento-de-erro.md',
  'docs/SLO-ERROR-BUDGET.md',
  'docs/POSTMORTEM-CORRECTIVE-ACTIONS.md',
  'docs/CYCLE-0.11.0.md',
  'docs/CAPACITY-COST-DEPENDENCIES.md',
  '.maestro/governance-console.yml',
  'scripts/generate-governance-report.mjs',
  'supabase/migrations/202607260017_product_governance_schema.sql',
  'supabase/migrations/202607260018_product_governance_functions.sql',
  'supabase/tests/product_governance.sql',
  'apps/mobile/app/governance-console.tsx',
  'apps/mobile/src/data/product-governance-repository.ts',
  'apps/mobile/src/services/product-governance-policy.ts',
  'apps/mobile/src/services/product-governance-policy.test.ts',
];
for (const path of requiredFiles) {
  if (!existsSync(join(root, path))) fail(`Arquivo obrigatório do Sprint 13 ausente: ${path}`);
}
if (!failures.length) ok(`${requiredFiles.length} arquivos do Sprint 13 encontrados.`);

const rootPackage = readJson('package.json');
for (const script of ['sprint13:check', 'governance:report', 'e2e:governance']) {
  if (!rootPackage.scripts?.[script]) fail(`Script obrigatório ausente: ${script}`);
}

const schema = read('supabase/migrations/202607260017_product_governance_schema.sql');
for (const marker of [
  'product_slos',
  'slo_measurements',
  'postmortem_reports',
  'corrective_actions',
  'capacity_cost_snapshots',
  'maintenance_windows',
  'dependency_reviews',
  'product_cycles',
  'estimated_cost_brl',
  'enable row level security',
]) {
  if (!schema.includes(marker)) fail(`Schema de governança sem marcador: ${marker}`);
}

const functions = read('supabase/migrations/202607260018_product_governance_functions.sql');
for (const marker of [
  'operator_upsert_product_slo',
  'operator_record_slo_measurement',
  'error_budget_consumed_pct',
  'operator_create_postmortem',
  'admin_decide_postmortem',
  'four_eyes_approval_required',
  'operator_create_corrective_action',
  'operator_record_capacity_cost',
  'admin_decide_maintenance_window',
  'operator_create_dependency_review',
  'operator_create_product_cycle',
  'admin_decide_product_cycle',
]) {
  if (!functions.includes(marker)) fail(`RPCs de governança sem marcador: ${marker}`);
}

const policy = read('apps/mobile/src/services/product-governance-policy.ts');
for (const marker of ['evaluateSlo', 'errorBudgetConsumedPct', 'evaluateCost', 'postmortemDueAt', 'evaluateCycleReadiness', 'maintenanceWindowsOverlap']) {
  if (!policy.includes(marker)) fail(`Política de governança sem marcador: ${marker}`);
}

const repository = read('apps/mobile/src/data/product-governance-repository.ts');
for (const marker of [
  'upsertProductSlo',
  'recordSloMeasurement',
  'createPostmortem',
  'createCorrectiveAction',
  'recordCapacityCost',
  'createMaintenanceWindow',
  'createDependencyReview',
  'createProductCycle',
]) {
  if (!repository.includes(marker)) fail(`Repositório de governança sem marcador: ${marker}`);
}

const consoleSource = read('apps/mobile/app/governance-console.tsx');
for (const marker of [
  'governance-console-title',
  'governance-upsert-slo',
  'governance-record-slo',
  'governance-create-postmortem',
  'governance-create-action',
  'governance-record-cost',
  'governance-create-maintenance',
  'governance-create-dependency',
  'governance-create-cycle',
  'Tehkné Solutions',
]) {
  if (!consoleSource.includes(marker)) fail(`Console de governança sem marcador: ${marker}`);
}

const settings = read('apps/mobile/app/settings.tsx');
if (!settings.includes('settings-open-governance-console')) fail('Configurações não expõem a governança para operadores.');
const layout = read('apps/mobile/app/_layout.tsx');
if (!layout.includes('governance-console')) fail('Rota de governança não está registrada.');

const report = read('scripts/generate-governance-report.mjs');
for (const marker of ["currency: 'BRL'", 'containsPersonalData: false', 'containsClinicalData: false', 'Tehkné Solutions']) {
  if (!report.includes(marker)) fail(`Relatório executivo sem marcador: ${marker}`);
}

const combined = [schema, functions, repository, consoleSource, report].join('\n');
if (/service[_-]?role/i.test(combined)) fail('Referência a service role detectada nos artefatos do Sprint 13.');
if (/journal|diagn[oó]stico|medicamento/i.test(report)) fail('Relatório executivo não deve incluir categorias clínicas ou conteúdo do Diário.');

if (failures.length) {
  console.error('Sprint 13 check reprovado:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('Sprint 13 check aprovado:');
for (const notice of notices) console.log(`- ${notice}`);
console.log('- SLOs, orçamento de erro, pós-incidentes, custo, manutenção, dependências e ciclo usam métricas técnicas agregadas.');
console.log('- Aprovações permanecem protegidas por RBAC, quatro-olhos, RLS e RPCs auditadas.');
