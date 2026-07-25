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

function readJson(path) {
  return JSON.parse(readFileSync(join(root, path), 'utf8'));
}

const eas = readJson('apps/mobile/eas.json');
const app = readJson('apps/mobile/app.json');
const rootPackage = readJson('package.json');
const mobilePackage = readJson('apps/mobile/package.json');
const domainPackage = readJson('packages/domain/package.json');
const configSource = readFileSync(join(root, 'apps/mobile/app.config.ts'), 'utf8');
const migrationSource = readFileSync(join(root, 'supabase/migrations/202607250010_beta_operation.sql'), 'utf8');

const rc = eas?.build?.rc;
if (!rc) fail('Perfil EAS rc ausente.');
else {
  if (rc.distribution !== 'internal') fail('Perfil rc deve usar distribuição interna.');
  if (rc.channel !== 'rc') fail('Perfil rc deve usar o canal rc.');
  if (rc.env?.APP_VARIANT !== 'rc') fail('Perfil rc deve definir APP_VARIANT=rc.');
  if (rc.env?.EXPO_PUBLIC_APP_ENV !== 'rc') fail('Perfil rc deve definir EXPO_PUBLIC_APP_ENV=rc.');
  if (rc.env?.EXPO_PUBLIC_RELEASE_CANDIDATE !== '1') fail('A primeira RC deve definir EXPO_PUBLIC_RELEASE_CANDIDATE=1.');
  if (rc.android?.buildType !== 'apk') fail('RC Android deve gerar APK instalável.');
  if (!failures.length) ok('Perfil EAS RC 1 isolado e interno encontrado.');
}

for (const marker of [
  "name: 'BemMeCuida RC'",
  "scheme: 'bemmecuida-rc'",
  "androidPackage: 'com.tehknesolutions.bemmecuida.rc'",
  "iosBundleIdentifier: 'com.tehknesolutions.bemmecuida.rc'",
]) {
  if (!configSource.includes(marker)) fail(`Variante RC sem marcador: ${marker}`);
}

for (const marker of ['beta_tester_enrollments', 'beta_feedback', 'enable row level security']) {
  if (!migrationSource.includes(marker)) fail(`Migration da operação beta sem marcador: ${marker}`);
}

const versions = [rootPackage.version, mobilePackage.version, domainPackage.version, app.expo.version];
if (new Set(versions).size !== 1) fail(`Versões divergentes: ${versions.join(', ')}.`);
else if (versions[0] !== '0.10.0') fail(`RC 1 deve usar versão 0.10.0, encontrada ${versions[0]}.`);
else ok('Versão 0.10.0 alinhada para RC 1.');

for (const path of [
  'docs/SPRINT-09.md',
  'docs/RELEASE-CANDIDATE-01.md',
  'docs/ADR-013-observabilidade-consentida-e-feedback-beta.md',
  '.maestro/beta-center.yml',
  'supabase/tests/beta_operation.sql',
  'apps/mobile/app/beta-center.tsx',
  'apps/mobile/src/observability/TechnicalObservabilityProvider.tsx',
]) {
  if (!existsSync(join(root, path))) fail(`Arquivo obrigatório da RC ausente: ${path}`);
}

const requiredPublicEnv = [
  'EXPO_PUBLIC_SUPABASE_URL',
  'EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY',
  'EXPO_PUBLIC_EAS_PROJECT_ID',
];
for (const key of requiredPublicEnv) {
  const value = process.env[key]?.trim();
  if (!value || /SUBSTITUA|SEU-PROJETO/i.test(value)) fail(`${key} não está configurada para a RC.`);
}

if (process.env.APP_VARIANT && process.env.APP_VARIANT !== 'rc') {
  fail('Execute rc:check com APP_VARIANT=rc.');
}

if (failures.length) {
  console.error('RC check reprovado:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('RC check aprovado:');
for (const notice of notices) console.log(`- ${notice}`);
console.log('- Operação da beta, feedback, RLS e observabilidade consentida estão presentes.');
console.log('- Credenciais públicas e identificador EAS estão configurados.');
console.log('- A homologação manual em aparelhos reais continua obrigatória.');
