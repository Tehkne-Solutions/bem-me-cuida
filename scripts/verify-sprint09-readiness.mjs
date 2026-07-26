import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const failures = [];
const notices = [];

function fail(message) {
  failures.push(message);
}

function ok(message) {
  notices.push(message);
}

function read(path) {
  return readFileSync(join(root, path), 'utf8');
}

function readJson(path) {
  return JSON.parse(read(path));
}

const requiredFiles = [
  'docs/SPRINT-09.md',
  'docs/ADR-013-observabilidade-consentida-e-feedback-beta.md',
  'docs/RELEASE-CANDIDATE-01.md',
  '.maestro/beta-center.yml',
  'scripts/verify-rc-readiness.mjs',
  'supabase/migrations/202607250010_beta_operation.sql',
  'supabase/tests/beta_operation.sql',
  'apps/mobile/app/beta-center.tsx',
  'apps/mobile/src/config/app-metadata.ts',
  'apps/mobile/src/data/beta-feedback-repository.ts',
  'apps/mobile/src/data/beta-operation-migrations.ts',
  'apps/mobile/src/data/technical-event-repository.ts',
  'apps/mobile/src/observability/TechnicalObservabilityProvider.tsx',
  'apps/mobile/src/preferences/beta-operation-preferences.ts',
  'apps/mobile/src/services/technical-observability-policy.ts',
  'apps/mobile/src/services/technical-observability-policy.test.ts',
];
for (const path of requiredFiles) {
  if (!existsSync(join(root, path))) fail(`Arquivo obrigatório do Sprint 09 ausente: ${path}`);
}
if (!failures.length) ok(`${requiredFiles.length} arquivos do Sprint 09 encontrados.`);

const rootPackage = readJson('package.json');
const mobilePackage = readJson('apps/mobile/package.json');
const domainPackage = readJson('packages/domain/package.json');
const appJson = readJson('apps/mobile/app.json');
const eas = readJson('apps/mobile/eas.json');
const versions = [rootPackage.version, mobilePackage.version, domainPackage.version, appJson.expo.version];
if (new Set(versions).size !== 1 || versions[0] !== '0.10.0') {
  fail(`Sprint 09 exige versão 0.10.0 alinhada: ${versions.join(', ')}.`);
} else {
  ok('Versão 0.10.0 alinhada.');
}

for (const script of ['rc:check', 'build:android:rc', 'e2e:beta']) {
  if (!rootPackage.scripts?.[script]) fail(`Script obrigatório ausente: ${script}`);
}

const rc = eas?.build?.rc;
if (!rc) fail('Perfil EAS rc ausente.');
else {
  if (rc.distribution !== 'internal') fail('RC deve usar distribuição interna.');
  if (rc.channel !== 'rc') fail('RC deve usar canal rc.');
  if (rc.env?.APP_VARIANT !== 'rc') fail('RC deve definir APP_VARIANT=rc.');
  if (rc.env?.EXPO_PUBLIC_APP_ENV !== 'rc') fail('RC deve definir EXPO_PUBLIC_APP_ENV=rc.');
  const rcNumber = rc.env?.EXPO_PUBLIC_RELEASE_CANDIDATE;
  if (!/^[1-9]\d*$/.test(rcNumber ?? '')) fail('A RC deve definir um número positivo em EXPO_PUBLIC_RELEASE_CANDIDATE.');
  else ok(`Perfil de release candidate ${rcNumber} preserva os controles do Sprint 09.`);
}

const configSource = read('apps/mobile/app.config.ts');
for (const marker of [
  "name: 'BemMeCuida RC'",
  "scheme: 'bemmecuida-rc'",
  "androidPackage: 'com.tehknesolutions.bemmecuida.rc'",
  "iosBundleIdentifier: 'com.tehknesolutions.bemmecuida.rc'",
]) {
  if (!configSource.includes(marker)) fail(`Configuração RC sem marcador: ${marker}`);
}

const localMigration = read('apps/mobile/src/data/beta-operation-migrations.ts');
for (const marker of ['BETA_OPERATION_SCHEMA_VERSION = 10', 'technical_events', 'daily_checkin']) {
  if (!localMigration.includes(marker)) fail(`Migration local da beta sem marcador: ${marker}`);
}

const databaseSource = read('apps/mobile/src/data/database.ts');
if (!databaseSource.includes('runBetaOperationMigrations')) fail('Banco não executa migration da operação beta.');

const remoteMigration = read('supabase/migrations/202607250010_beta_operation.sql');
for (const marker of ['beta_tester_enrollments', 'beta_feedback', 'beta_feedback_insert_own', 'enable row level security']) {
  if (!remoteMigration.includes(marker)) fail(`Migration remota da beta sem marcador: ${marker}`);
}

const observability = read('apps/mobile/src/observability/TechnicalObservabilityProvider.tsx');
for (const marker of ['technicalLogEnabled', 'app_session_started', 'app_backgrounded', 'app_foregrounded']) {
  if (!observability.includes(marker)) fail(`Observabilidade sem marcador: ${marker}`);
}

const eventsRepository = read('apps/mobile/src/data/technical-event-repository.ts');
for (const marker of ['sanitizeTechnicalContext', 'LIMIT 200', 'clearTechnicalEvents']) {
  if (!eventsRepository.includes(marker)) fail(`Log técnico sem proteção obrigatória: ${marker}`);
}

const technicalPolicy = read('apps/mobile/src/services/technical-observability-policy.ts');
for (const marker of [
  'TechnicalEventContext = Record<string, number | boolean | null>',
  'MAX_CONTEXT_KEYS = 20',
  'Number.isFinite',
]) {
  if (!technicalPolicy.includes(marker)) fail(`Política técnica sem proteção obrigatória: ${marker}`);
}
if (/Record<string,\s*string/.test(technicalPolicy)) fail('Contexto técnico não pode aceitar texto livre.');

const betaCenter = read('apps/mobile/app/beta-center.tsx');
for (const marker of [
  'beta-center-title',
  'beta-enrollment-toggle',
  'beta-technical-log',
  'beta-feedback-safe-confirmation',
  'beta-feedback-submit',
  'confirmedSafeText',
]) {
  if (!betaCenter.includes(marker)) fail(`Central beta sem marcador: ${marker}`);
}

const feedbackRepository = read('apps/mobile/src/data/beta-feedback-repository.ts');
for (const marker of ['submitBetaFeedback', 'listBetaFeedback', 'setBetaTesterEnrollment', "status: 'received'"]) {
  if (!feedbackRepository.includes(marker)) fail(`Repositório da beta sem marcador: ${marker}`);
}

const exportSource = read('apps/mobile/src/services/account-export.ts');
for (const marker of ['technical_events', 'beta_feedback', 'beta_tester_enrollments', "exportVersion: '1.1'"]) {
  if (!exportSource.includes(marker)) fail(`Exportação sem dado da beta: ${marker}`);
}

const diagnosticsSource = read('apps/mobile/src/diagnostics/device-diagnostics.ts');
for (const marker of ['EXPECTED_LOCAL_SCHEMA = 10', 'installed-release', 'getAppMetadata']) {
  if (!diagnosticsSource.includes(marker)) fail(`Diagnóstico sem marcador da RC: ${marker}`);
}

if (failures.length) {
  console.error('Sprint 09 check reprovado:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('Sprint 09 check aprovado:');
for (const notice of notices) console.log(`- ${notice}`);
console.log('- Feedback, adesão, RLS, exportação e observabilidade local consentida estão presentes.');
console.log('- Contextos técnicos são sanitizados em runtime e não aceitam texto livre.');
