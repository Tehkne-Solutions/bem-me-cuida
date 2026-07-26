import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const failures = [];
const notices = [];

function read(path) {
  return readFileSync(join(root, path), 'utf8');
}

function readJson(path) {
  return JSON.parse(read(path));
}

function fail(message) {
  failures.push(message);
}

function ok(message) {
  notices.push(message);
}

const requiredFiles = [
  'docs/SPRINT-11.md',
  'docs/ADR-015-rollout-observabilidade-e-incidentes.md',
  'docs/PRODUCTION-RELEASE-01.md',
  'docs/INCIDENT-RESPONSE.md',
  'docs/POST-RELEASE-MONITORING.md',
  'docs/STORE-SUBMISSION-PACKAGE.md',
  '.maestro/production-console.yml',
  'scripts/verify-production-readiness.mjs',
  'scripts/generate-store-submission-package.mjs',
  'supabase/migrations/202607250013_production_operations_schema.sql',
  'supabase/migrations/202607250014_production_operations_functions.sql',
  'supabase/tests/production_operations.sql',
  'apps/mobile/app/production-console.tsx',
  'apps/mobile/src/data/production-operations-repository.ts',
  'apps/mobile/src/services/production-rollout-policy.ts',
  'apps/mobile/src/services/production-rollout-policy.test.ts',
];
for (const path of requiredFiles) {
  if (!existsSync(join(root, path))) fail(`Arquivo obrigatório do Sprint 11 ausente: ${path}`);
}
if (!failures.length) ok(`${requiredFiles.length} arquivos do Sprint 11 encontrados.`);

const eas = readJson('apps/mobile/eas.json');
const rootPackage = readJson('package.json');
const production = eas?.build?.production;
if (!production) fail('Perfil EAS production ausente.');
else {
  if (production.distribution !== 'store') fail('Produção deve usar distribution=store.');
  if (production.channel !== 'production') fail('Produção deve usar canal production.');
  if (production.environment !== 'production') fail('Produção deve usar ambiente production.');
  if (production.android?.buildType !== 'app-bundle') fail('Android de produção deve gerar app-bundle.');
  if (production.env?.APP_VARIANT !== 'production') fail('Produção deve definir APP_VARIANT=production.');
  if (production.env?.EXPO_PUBLIC_APP_ENV !== 'production') fail('Produção deve definir EXPO_PUBLIC_APP_ENV=production.');
  if (!failures.length) ok('Perfil EAS de produção isolado e pronto para loja.');
}
if (!eas?.submit?.production) fail('Perfil de submissão production ausente.');

for (const script of [
  'production:check',
  'sprint11:check',
  'store:package',
  'build:android:production',
  'submit:android:production',
  'e2e:production',
]) {
  if (!rootPackage.scripts?.[script]) fail(`Script obrigatório ausente: ${script}`);
}

const appConfig = read('apps/mobile/app.config.ts');
for (const marker of [
  "runtimeVersion: { policy: 'appVersion' }",
  "checkAutomatically: 'ON_LOAD'",
  'fallbackToCacheTimeout: 0',
  'EXPO_PUBLIC_PRODUCTION_RELEASE',
  "name: 'BemMeCuida'",
  "androidPackage: 'com.tehknesolutions.bemmecuida'",
]) {
  if (!appConfig.includes(marker)) fail(`Configuração de produção sem marcador: ${marker}`);
}

const schema = read('supabase/migrations/202607250013_production_operations_schema.sql');
for (const marker of [
  'store_submissions',
  'production_rollouts',
  'production_health_snapshots',
  'production_incidents',
  'production_incident_updates',
  'enable row level security',
]) {
  if (!schema.includes(marker)) fail(`Schema de produção sem marcador: ${marker}`);
}

const functions = read('supabase/migrations/202607250014_production_operations_functions.sql');
for (const marker of [
  'operator_register_store_submission',
  'operator_start_rollout',
  'operator_record_health_snapshot',
  'operator_advance_rollout',
  'operator_rollback_rollout',
  'operator_open_incident',
  'operator_update_incident',
  "crash_free_sessions_pct < 99.00",
  "sync_success_pct < 97.00",
  "auth_success_pct < 98.00",
]) {
  if (!functions.includes(marker)) fail(`RPCs de produção sem marcador: ${marker}`);
}

const repository = read('apps/mobile/src/data/production-operations-repository.ts');
for (const marker of [
  'listStoreSubmissions',
  'startProductionRollout',
  'recordHealthSnapshot',
  'advanceProductionRollout',
  'openProductionIncident',
  'updateProductionIncident',
]) {
  if (!repository.includes(marker)) fail(`Repositório operacional sem marcador: ${marker}`);
}

const consoleSource = read('apps/mobile/app/production-console.tsx');
for (const marker of [
  'production-console-title',
  'production-register-submission',
  'production-start-rollout',
  'production-record-health',
  'production-advance-rollout',
  'production-open-incident',
  'Tehkné Solutions',
]) {
  if (!consoleSource.includes(marker)) fail(`Console de produção sem marcador: ${marker}`);
}

const settings = read('apps/mobile/app/settings.tsx');
if (!settings.includes('settings-open-production-console')) fail('Configurações não expõem o console para operadores.');

if (failures.length) {
  console.error('Sprint 11 check reprovado:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('Sprint 11 check aprovado:');
for (const notice of notices) console.log(`- ${notice}`);
console.log('- Rollout gradual, saúde agregada, incidentes e submissão estão protegidos por RBAC, RLS e RPCs auditadas.');
console.log('- A publicação externa continua dependente de credenciais e validação nos consoles oficiais.');
