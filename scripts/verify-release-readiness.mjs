import { existsSync, readFileSync, readdirSync } from 'node:fs';
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
  try {
    return JSON.parse(readFileSync(join(root, path), 'utf8'));
  } catch (error) {
    fail(`${path}: JSON inválido (${error instanceof Error ? error.message : 'erro desconhecido'}).`);
    return null;
  }
}

const requiredFiles = [
  'SECURITY.md',
  'docs/SPRINT-01.md',
  'docs/CHECKLIST-HOMOLOGACAO-SPRINT-01.md',
  'apps/mobile/app/diagnostics.tsx',
  '.maestro/smoke-public.yml',
  '.maestro/authenticated-check-in.yml',
  '.eas/workflows/e2e-tests-android.yml',
  'supabase/migrations/202607240004_pull_cursor.sql',
  'supabase/migrations/202607250006_care_management.sql',
  'docs/SPRINT-02-INCREMENTO-02.md',
];

for (const path of requiredFiles) {
  if (!existsSync(join(root, path))) fail(`Arquivo obrigatório ausente: ${path}`);
}
if (!failures.length) ok(`${requiredFiles.length} arquivos obrigatórios encontrados.`);

const rootPackage = readJson('package.json');
const mobilePackage = readJson('apps/mobile/package.json');
const eas = readJson('apps/mobile/eas.json');

if (rootPackage) {
  const scripts = rootPackage.scripts ?? {};
  for (const name of ['verify', 'security:check', 'release:check', 'e2e:smoke']) {
    if (!scripts[name]) fail(`Script npm obrigatório ausente: ${name}`);
  }
}

if (mobilePackage) {
  const dependencies = mobilePackage.dependencies ?? {};
  for (const name of ['expo', 'expo-router', 'expo-sqlite', 'expo-secure-store', '@supabase/supabase-js']) {
    if (!dependencies[name]) fail(`Dependência mobile obrigatória ausente: ${name}`);
  }
}

if (!eas?.build?.development || !eas?.build?.preview || !eas?.build?.production || !eas?.build?.['e2e-test']) {
  fail('eas.json precisa conter development, preview, production e e2e-test.');
} else {
  ok('Perfis EAS de desenvolvimento, homologação, produção e E2E encontrados.');
}

const migrationsDir = join(root, 'supabase/migrations');
const migrations = existsSync(migrationsDir)
  ? readdirSync(migrationsDir).filter((name) => name.endsWith('.sql')).sort()
  : [];
if (migrations.length < 4) fail('São esperadas pelo menos quatro migrations remotas.');
if (new Set(migrations.map((name) => name.split('_')[0])).size !== migrations.length) {
  fail('Há migrations remotas com prefixos numéricos duplicados.');
} else if (migrations.length) {
  ok(`${migrations.length} migrations remotas com prefixos únicos.`);
}

const localMigrations = readFileSync(join(root, 'apps/mobile/src/data/migrations.ts'), 'utf8');
if (!/version:\s*5[\s\S]*remote_cursor_id/.test(localMigrations)) {
  fail('Migration local 5 com cursor composto não foi localizada.');
}
if (!/version:\s*7[\s\S]*CREATE TABLE IF NOT EXISTS appointments/.test(localMigrations)) {
  fail('Migration local 7 de gestão do cuidado não foi localizada.');
}

const syncSource = readFileSync(join(root, 'apps/mobile/src/services/sync.ts'), 'utf8');
for (const marker of ['pull_mood_checkins', 'remoteCursorId', 'resetRemoteCursor']) {
  if (!syncSource.includes(marker)) fail(`Sincronização sem marcador obrigatório: ${marker}`);
}

const databaseSource = readFileSync(join(root, 'apps/mobile/src/data/database.ts'), 'utf8');
for (const marker of ['PRAGMA cipher_version', 'sqlcipher_required', 'closeAsync']) {
  if (!databaseSource.includes(marker)) fail(`Banco local sem proteção fail-closed obrigatória: ${marker}`);
}

const e2eRequiredIds = [
  ['apps/mobile/app/(auth)/sign-in.tsx', 'sign-in-submit'],
  ['apps/mobile/app/(tabs)/index.tsx', 'home-open-check-in'],
  ['apps/mobile/app/(tabs)/check-in.tsx', 'check-in-save'],
  ['apps/mobile/app/crisis.tsx', 'crisis-title'],
];
for (const [path, marker] of e2eRequiredIds) {
  const source = readFileSync(join(root, path), 'utf8');
  if (!source.includes(marker)) fail(`${path}: identificador E2E ausente (${marker}).`);
}

const prohibitedPatterns = [
  { pattern: /sb_secret_[A-Za-z0-9_-]{12,}/, label: 'chave secreta Supabase' },
  { pattern: /service_role\s*[=:]\s*["'][^"']+/i, label: 'service_role preenchida' },
  { pattern: /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/, label: 'chave privada' },
];

const scanRoots = ['apps', 'packages', 'scripts', 'supabase', '.github', '.eas', '.maestro'];
const textExtensions = new Set(['.ts', '.tsx', '.js', '.mjs', '.json', '.sql', '.yml', '.yaml', '.md', '.toml']);

function walk(directory) {
  const entries = readdirSync(directory, { withFileTypes: true });
  for (const entry of entries) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) walk(path);
    else {
      const extension = entry.name.includes('.') ? `.${entry.name.split('.').pop()}` : '';
      if (!textExtensions.has(extension)) continue;
      const content = readFileSync(path, 'utf8');
      for (const prohibited of prohibitedPatterns) {
        if (prohibited.pattern.test(content)) fail(`${path.replace(`${root}/`, '')}: possível ${prohibited.label}.`);
      }
    }
  }
}

for (const directory of scanRoots) {
  const absolute = join(root, directory);
  if (existsSync(absolute)) walk(absolute);
}

if (failures.length) {
  console.error('Release check reprovado:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('Release check aprovado:');
for (const notice of notices) console.log(`- ${notice}`);
console.log('- Nenhum segredo conhecido foi detectado.');
console.log('- SQLCipher fail-closed, cursor composto, recuperação de conflito e identificadores E2E estão presentes.');
