import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

const root = process.cwd();
const mode = process.argv[2] ?? 'prebuild';
const failures = [];
const notices = [];
const text = (name) => String(process.env[name] ?? '').trim();
const boolean = (name, fallback = false) => {
  const value = text(name).toLowerCase();
  if (!value) return fallback;
  return value === 'true';
};
const fail = (message) => failures.push(message);
const ok = (message) => notices.push(message);
const readJson = (path) => JSON.parse(readFileSync(join(root, path), 'utf8'));

if (!['prebuild', 'artifacts', 'promotion'].includes(mode)) {
  fail('Modo inválido. Use prebuild, artifacts ou promotion.');
}

const eas = readJson('apps/mobile/eas.json');
const profile = eas?.build?.rc011;
if (!profile) fail('Perfil EAS rc011 ausente.');
if (profile?.channel !== 'rc-0-11') fail('O canal da RC 0.11 deve ser rc-0-11.');
if (profile?.distribution !== 'internal') fail('A RC 0.11 deve usar distribuição interna.');
if (profile?.env?.APP_VARIANT !== 'rc011') fail('O perfil rc011 deve usar APP_VARIANT=rc011.');
if (profile?.env?.EXPO_PUBLIC_APP_VERSION !== '0.11.0') fail('O perfil rc011 deve usar EXPO_PUBLIC_APP_VERSION=0.11.0.');
if (profile?.env?.EXPO_PUBLIC_RELEASE_CANDIDATE !== '1') fail('O perfil rc011 deve usar EXPO_PUBLIC_RELEASE_CANDIDATE=1.');

if (text('APP_VARIANT') !== 'rc011') fail('APP_VARIANT deve ser rc011.');
if (text('EXPO_PUBLIC_APP_ENV') !== 'rc-0-11') fail('EXPO_PUBLIC_APP_ENV deve ser rc-0-11.');
if (text('EXPO_PUBLIC_APP_VERSION') !== '0.11.0') fail('EXPO_PUBLIC_APP_VERSION deve ser 0.11.0.');
if (text('EXPO_PUBLIC_RELEASE_CANDIDATE') !== '1') fail('EXPO_PUBLIC_RELEASE_CANDIDATE deve ser 1.');
if (!/^https:\/\/[^\s]+\.supabase\.co$/i.test(text('EXPO_PUBLIC_SUPABASE_URL'))) fail('EXPO_PUBLIC_SUPABASE_URL precisa apontar para um projeto Supabase real.');
if (!/^sb_(publishable|anon)_/i.test(text('EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY')) || /SUBSTITUA|placeholder/i.test(text('EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY'))) {
  fail('EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY precisa ser uma chave pública real.');
}
if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(text('EXPO_PUBLIC_EAS_PROJECT_ID'))) {
  fail('EXPO_PUBLIC_EAS_PROJECT_ID precisa ser um UUID válido.');
}

if (!failures.length) {
  const cycle = spawnSync(process.execPath, ['scripts/verify-cycle-rc-readiness.mjs'], {
    cwd: root,
    env: process.env,
    encoding: 'utf8',
  });
  if (cycle.status !== 0) {
    fail(`Os gates do ciclo reprovaram:\n${cycle.stderr || cycle.stdout}`.trim());
  } else {
    ok('Gates do ciclo 0.11.0 aprovados.');
  }
}

function validateArtifact(prefix, required) {
  const label = prefix === 'RC011_ANDROID' ? 'Android' : 'iOS';
  const buildId = text(`${prefix}_BUILD_ID`);
  const buildNumber = text(`${prefix}_BUILD_NUMBER`);
  const artifactUrl = text(`${prefix}_ARTIFACT_URL`);
  const sha256 = text(`${prefix}_ARTIFACT_SHA256`);
  const any = Boolean(buildId || buildNumber || artifactUrl || sha256);
  if (!required && !any) return;
  if (!buildId) fail(`${prefix}_BUILD_ID é obrigatório para ${label}.`);
  if (!/^\d+$/.test(buildNumber)) fail(`${prefix}_BUILD_NUMBER deve ser numérico.`);
  if (!artifactUrl.startsWith('https://')) fail(`${prefix}_ARTIFACT_URL deve usar HTTPS.`);
  if (!/^[a-f0-9]{64}$/i.test(sha256)) fail(`${prefix}_ARTIFACT_SHA256 deve conter 64 caracteres hexadecimais.`);
}

if (mode === 'artifacts' || mode === 'promotion') {
  validateArtifact('RC011_ANDROID', true);
  validateArtifact('RC011_IOS', boolean('RC011_REQUIRE_IOS', true));
}

function validateEvidenceFile(path, collectionName) {
  if (!existsSync(join(root, path))) {
    fail(`Arquivo de evidências ausente: ${path}`);
    return;
  }
  const value = readJson(path);
  if (value.release !== '0.11.0-rc.1') fail(`${path} deve referenciar 0.11.0-rc.1.`);
  const records = value[collectionName];
  if (!Array.isArray(records) || records.length === 0) {
    fail(`${path} não possui registros de homologação.`);
    return;
  }
  const required = records.filter((item) => item.required);
  const pending = required.filter((item) => item.status !== 'passed');
  const withoutEvidence = required.filter((item) => !String(item.evidenceUrl ?? '').startsWith('https://'));
  if (pending.length) fail(`${path} possui ${pending.length} item(ns) obrigatório(s) sem aprovação.`);
  if (withoutEvidence.length) fail(`${path} possui ${withoutEvidence.length} item(ns) obrigatório(s) sem evidência HTTPS.`);
}

if (mode === 'promotion') {
  validateEvidenceFile(text('RC011_DEVICE_MATRIX_PATH') || 'release/rc-0.11.0/device-matrix.json', 'profiles');
  validateEvidenceFile(text('RC011_TEST_RESULTS_PATH') || 'release/rc-0.11.0/test-results.json', 'suites');
  if (text('RC011_OTA_RUNTIME_VERSION') !== '0.11.0') fail('RC011_OTA_RUNTIME_VERSION deve ser 0.11.0.');
  if (text('RC011_OTA_CHANNEL') !== 'rc-0-11') fail('RC011_OTA_CHANNEL deve ser rc-0-11.');
}

if (failures.length) {
  console.error(`RC 0.11.0 ${mode} reprovada:`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

ok('Variante, versão, runtime e canal da RC conferidos.');
if (mode !== 'prebuild') ok('Metadados e checksums dos artefatos conferidos.');
if (mode === 'promotion') ok('Matriz de aparelhos e regressão possuem aprovação e evidência.');
console.log(`RC 0.11.0 ${mode} aprovada:`);
for (const notice of notices) console.log(`- ${notice}`);
console.log('- Tehkné Solutions');
