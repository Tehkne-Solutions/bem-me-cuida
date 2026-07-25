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

const beta = eas?.build?.beta;
if (!beta) fail('Perfil EAS beta ausente.');
else {
  if (beta.distribution !== 'internal') fail('Perfil beta deve usar distribuição interna.');
  if (beta.channel !== 'beta') fail('Perfil beta deve usar o canal beta.');
  if (beta.env?.APP_VARIANT !== 'beta') fail('Perfil beta deve definir APP_VARIANT=beta.');
  if (beta.android?.buildType !== 'apk') fail('Beta Android deve gerar APK instalável.');
  if (!failures.length) ok('Perfil EAS beta isolado e interno encontrado.');
}

for (const marker of [
  "name: 'BemMeCuida Beta'",
  "scheme: 'bemmecuida-beta'",
  "androidPackage: 'com.tehknesolutions.bemmecuida.beta'",
  "iosBundleIdentifier: 'com.tehknesolutions.bemmecuida.beta'",
]) {
  if (!configSource.includes(marker)) fail(`Variante beta sem marcador: ${marker}`);
}

const versions = [rootPackage.version, mobilePackage.version, domainPackage.version, app.expo.version];
if (new Set(versions).size !== 1) fail(`Versões divergentes: ${versions.join(', ')}.`);
else ok(`Versão beta alinhada em ${versions[0]}.`);

for (const path of [
  'docs/BETA-FECHADA.md',
  'docs/SPRINT-08.md',
  '.maestro/preferences-accessibility.yml',
]) {
  if (!existsSync(join(root, path))) fail(`Arquivo obrigatório da beta ausente: ${path}`);
}

const requiredPublicEnv = [
  'EXPO_PUBLIC_SUPABASE_URL',
  'EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY',
  'EXPO_PUBLIC_EAS_PROJECT_ID',
];
for (const key of requiredPublicEnv) {
  const value = process.env[key]?.trim();
  if (!value || /SUBSTITUA|SEU-PROJETO/i.test(value)) fail(`${key} não está configurada para a beta.`);
}

if (failures.length) {
  console.error('Beta check reprovado:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('Beta check aprovado:');
for (const notice of notices) console.log(`- ${notice}`);
console.log('- Credenciais públicas e identificador EAS estão configurados.');
console.log('- Revise o checklist manual antes de convidar testadores.');
