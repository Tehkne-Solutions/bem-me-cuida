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
  'docs/SPRINT-12.md',
  'docs/ADR-016-hotfix-ota-four-eyes-retention.md',
  'docs/HOTFIX-AND-OTA-RUNBOOK.md',
  'docs/AUDIT-RETENTION.md',
  '.maestro/maintenance-console.yml',
  '.github/workflows/maintenance-operations.yml',
  'scripts/verify-ota-readiness.mjs',
  'scripts/execute-ota-operation.mjs',
  'scripts/generate-hotfix-manifest.mjs',
  'supabase/migrations/202607250015_maintenance_operations_schema.sql',
  'supabase/migrations/202607250016_maintenance_operations_functions.sql',
  'supabase/tests/maintenance_operations.sql',
  'apps/mobile/app/maintenance-console.tsx',
  'apps/mobile/src/data/maintenance-operations-repository.ts',
  'apps/mobile/src/services/maintenance-policy.ts',
  'apps/mobile/src/services/maintenance-policy.test.ts',
];
for (const path of requiredFiles) {
  if (!existsSync(join(root, path))) fail(`Arquivo obrigatório do Sprint 12 ausente: ${path}`);
}
if (!failures.length) ok(`${requiredFiles.length} arquivos do Sprint 12 encontrados.`);

const rootPackage = readJson('package.json');
const mobilePackage = readJson('apps/mobile/package.json');
for (const script of [
  'ota:check',
  'ota:publish:validation',
  'ota:promote:production',
  'ota:rollback:production',
  'ota:cancel-rollout',
  'hotfix:manifest',
  'sprint12:check',
  'build:android:hotfix-validation',
  'e2e:maintenance',
]) {
  if (!rootPackage.scripts?.[script]) fail(`Script obrigatório ausente: ${script}`);
}
if (mobilePackage.dependencies?.['expo-updates'] !== '~57.0.8') {
  fail('Sprint 12 exige expo-updates ~57.0.8 para o Expo SDK 57.');
} else {
  ok('expo-updates ~57.0.8 instalado.');
}

const eas = readJson('apps/mobile/eas.json');
const validation = eas?.build?.['hotfix-validation'];
if (!validation) fail('Perfil EAS hotfix-validation ausente.');
else {
  if (validation.distribution !== 'internal') fail('hotfix-validation deve usar distribuição interna.');
  if (validation.channel !== 'hotfix-validation') fail('hotfix-validation deve usar canal próprio.');
  if (validation.env?.APP_VARIANT !== 'rc') fail('hotfix-validation deve usar package isolado da RC.');
  if (validation.env?.EXPO_PUBLIC_APP_ENV !== 'hotfix-validation') fail('EXPO_PUBLIC_APP_ENV do hotfix está incorreto.');
}

const schema = read('supabase/migrations/202607250015_maintenance_operations_schema.sql');
for (const marker of [
  'is_release_admin',
  'maintenance_hotfixes',
  'operation_approvals',
  'hotfix_artifacts',
  'ota_update_plans',
  'operations_retention_runs',
  'retention_hold_until',
  'legal_hold',
  'enable row level security',
]) {
  if (!schema.includes(marker)) fail(`Schema de sustentação sem marcador: ${marker}`);
}

const functions = read('supabase/migrations/202607250016_maintenance_operations_functions.sql');
for (const marker of [
  'operator_create_hotfix',
  'operator_request_hotfix_approval',
  'admin_decide_hotfix',
  'four_eyes_approval_required',
  'operator_register_hotfix_artifact',
  'operator_create_ota_plan',
  'ota_runtime_mismatch',
  'admin_decide_ota_plan',
  'operator_record_ota_publication',
  'operator_rollback_hotfix',
  'admin_run_operations_retention',
  "interval '180 days'",
  "interval '365 days'",
  "interval '730 days'",
]) {
  if (!functions.includes(marker)) fail(`RPCs de sustentação sem marcador: ${marker}`);
}

const policy = read('apps/mobile/src/services/maintenance-policy.ts');
for (const marker of [
  'evaluateOtaCompatibility',
  'evaluateFourEyesApproval',
  'evaluateRetentionExecution',
  'EXCLUIR DADOS OPERACIONAIS ELEGÍVEIS',
]) {
  if (!policy.includes(marker)) fail(`Política local sem marcador: ${marker}`);
}

const repository = read('apps/mobile/src/data/maintenance-operations-repository.ts');
for (const marker of [
  'createMaintenanceHotfix',
  'requestMaintenanceHotfixApproval',
  'decideMaintenanceHotfix',
  'createOtaUpdatePlan',
  'recordOtaPublication',
  'runOperationsRetention',
]) {
  if (!repository.includes(marker)) fail(`Repositório de sustentação sem marcador: ${marker}`);
}

const consoleSource = read('apps/mobile/app/maintenance-console.tsx');
for (const marker of [
  'maintenance-console-title',
  'maintenance-create-hotfix',
  'maintenance-request-approval',
  'maintenance-create-ota',
  'maintenance-record-ota',
  'maintenance-retention-dry-run',
  'maintenance-retention-execute',
  'Tehkné Solutions',
]) {
  if (!consoleSource.includes(marker)) fail(`Console de sustentação sem marcador: ${marker}`);
}

const settings = read('apps/mobile/app/settings.tsx');
if (!settings.includes('settings-open-maintenance-console')) fail('Configurações não expõem a sustentação para operadores.');
const layout = read('apps/mobile/app/_layout.tsx');
if (!layout.includes('maintenance-console')) fail('Rota de sustentação não está registrada.');

const otaCheck = read('scripts/verify-ota-readiness.mjs');
for (const marker of ['OTA_NATIVE_CHANGES', 'OTA_VALIDATED_GROUP_ID', 'runtimeVersion appVersion', 'hotfix-validation']) {
  if (!otaCheck.includes(marker)) fail(`OTA readiness sem marcador: ${marker}`);
}
const otaExecutor = read('scripts/execute-ota-operation.mjs');
for (const marker of ['update:republish', 'update:revert-update-rollout', '--rollout-percentage', '--non-interactive']) {
  if (!otaExecutor.includes(marker)) fail(`Executor OTA sem marcador: ${marker}`);
}

const workflow = read('.github/workflows/maintenance-operations.yml');
for (const marker of ['workflow_dispatch', 'environment: production-operations', 'secrets.EXPO_TOKEN', 'inputs.action', 'maintenance-operation-manifest']) {
  if (!workflow.includes(marker)) fail(`Workflow protegido sem marcador: ${marker}`);
}

const sensitiveSources = [schema, functions, repository, consoleSource, otaCheck, otaExecutor, workflow].join('\n');
if (/service[_-]?role/i.test(sensitiveSources)) fail('Referência a service role detectada nos artefatos do Sprint 12.');

if (failures.length) {
  console.error('Sprint 12 check reprovado:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('Sprint 12 check aprovado:');
for (const notice of notices) console.log(`- ${notice}`);
console.log('- Hotfixes, quatro-olhos, OTA compatível e retenção possuem controles locais e de servidor.');
console.log('- Operações EAS permanecem externas, manuais e protegidas por ambiente de produção.');
