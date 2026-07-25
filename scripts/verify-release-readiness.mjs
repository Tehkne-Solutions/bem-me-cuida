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
  '.maestro/journal-insights.yml',
  'docs/SPRINT-04.md',
  'supabase/migrations/202607250008_support_plan.sql',
  '.maestro/support-plan.yml',
  'docs/SPRINT-05.md',
  'docs/ADR-009-relatorios-locais-e-minimizacao.md',
  '.maestro/reports.yml',
  'docs/SPRINT-06.md',
  'docs/ADR-010-diario-editavel-e-comparacoes.md',
  'docs/SPRINT-07.md',
  'docs/ADR-011-controle-do-titular-e-bloqueio-local.md',
  '.maestro/settings-privacy.yml',
  'supabase/migrations/202607250009_account_privacy.sql',
  'supabase/tests/account_privacy.sql',
  'apps/mobile/app/settings.tsx',
  'apps/mobile/src/data/account-repository.ts',
  'apps/mobile/src/services/account-export.ts',
  'apps/mobile/src/security/AppLockShield.tsx',
  'apps/mobile/src/security/account-preferences.ts',
  'docs/SPRINT-08.md',
  'docs/ADR-012-preferencias-locais-e-beta-isolada.md',
  'docs/BETA-FECHADA.md',
  '.maestro/preferences-accessibility.yml',
  'apps/mobile/app/notifications-settings.tsx',
  'apps/mobile/app/accessibility-settings.tsx',
  'apps/mobile/src/preferences/notification-preferences.ts',
  'apps/mobile/src/preferences/accessibility-preferences.ts',
  'apps/mobile/src/accessibility/AccessibilityProvider.tsx',
  'apps/mobile/src/services/notification-policy.ts',
  'apps/mobile/src/services/accessibility-policy.ts',
  'scripts/verify-beta-readiness.mjs',
  '.eas/workflows/e2e-tests-android.yml',
  'supabase/migrations/202607240004_pull_cursor.sql',
  'supabase/migrations/202607250006_care_management.sql',
  'supabase/migrations/202607250007_journal_insights.sql',
  'docs/SPRINT-02-INCREMENTO-02.md',
  'docs/SPRINT-03-INCREMENTO-01.md',
  'packages/domain/src/journal.ts',
  'apps/mobile/src/data/journal-migrations.ts',
  'apps/mobile/src/data/journal-repository.ts',
  'apps/mobile/src/services/insights.ts',
];

for (const path of requiredFiles) {
  if (!existsSync(join(root, path))) fail(`Arquivo obrigatório ausente: ${path}`);
}
if (!failures.length) ok(`${requiredFiles.length} arquivos obrigatórios encontrados.`);

const rootPackage = readJson('package.json');
const mobilePackage = readJson('apps/mobile/package.json');
const domainPackage = readJson('packages/domain/package.json');
const appConfig = readJson('apps/mobile/app.json');
const eas = readJson('apps/mobile/eas.json');

if (rootPackage) {
  const scripts = rootPackage.scripts ?? {};
  for (const name of [
    'verify',
    'security:check',
    'release:check',
    'beta:check',
    'build:android:beta',
    'e2e:smoke',
    'e2e:journal',
    'e2e:settings',
    'e2e:preferences',
  ]) {
    if (!scripts[name]) fail(`Script npm obrigatório ausente: ${name}`);
  }
}

if (mobilePackage) {
  const dependencies = mobilePackage.dependencies ?? {};
  for (const name of [
    'expo',
    'expo-router',
    'expo-sqlite',
    'expo-secure-store',
    'expo-local-authentication',
    'expo-notifications',
    '@supabase/supabase-js',
  ]) {
    if (!dependencies[name]) fail(`Dependência mobile obrigatória ausente: ${name}`);
  }
}

const localAuthPlugin = appConfig?.expo?.plugins?.some((plugin) =>
  plugin === 'expo-local-authentication'
  || (Array.isArray(plugin) && plugin[0] === 'expo-local-authentication'));
if (!localAuthPlugin) fail('Plugin expo-local-authentication ausente no app.json.');
else ok('Plugin de autenticação biométrica configurado.');

const notificationsPlugin = appConfig?.expo?.plugins?.some((plugin) =>
  plugin === 'expo-notifications'
  || (Array.isArray(plugin) && plugin[0] === 'expo-notifications'));
if (!notificationsPlugin) fail('Plugin expo-notifications ausente no app.json.');
else ok('Plugin de notificações configurado.');

const releaseVersions = [
  rootPackage?.version,
  mobilePackage?.version,
  domainPackage?.version,
  appConfig?.expo?.version,
].filter(Boolean);
if (new Set(releaseVersions).size > 1) {
  fail(`Versões de release divergentes: ${releaseVersions.join(', ')}.`);
} else if (releaseVersions.length) {
  ok(`Versão de release alinhada em ${releaseVersions[0]}.`);
}

if (
  !eas?.build?.development
  || !eas?.build?.preview
  || !eas?.build?.beta
  || !eas?.build?.production
  || !eas?.build?.['e2e-test']
) {
  fail('eas.json precisa conter development, preview, beta, production e e2e-test.');
} else {
  ok('Perfis EAS de desenvolvimento, homologação, beta, produção e E2E encontrados.');
  if (eas.build.beta.distribution !== 'internal') fail('Perfil beta precisa usar distribuição interna.');
  if (eas.build.beta.channel !== 'beta') fail('Perfil beta precisa usar canal beta.');
  if (eas.build.beta.env?.APP_VARIANT !== 'beta') fail('Perfil beta precisa definir APP_VARIANT=beta.');
}

const appConfigSource = readFileSync(join(root, 'apps/mobile/app.config.ts'), 'utf8');
for (const marker of [
  "name: 'BemMeCuida Beta'",
  "scheme: 'bemmecuida-beta'",
  "androidPackage: 'com.tehknesolutions.bemmecuida.beta'",
  "iosBundleIdentifier: 'com.tehknesolutions.bemmecuida.beta'",
]) {
  if (!appConfigSource.includes(marker)) fail(`Configuração da beta sem marcador obrigatório: ${marker}`);
}

const migrationsDir = join(root, 'supabase/migrations');
const migrations = existsSync(migrationsDir)
  ? readdirSync(migrationsDir).filter((name) => name.endsWith('.sql')).sort()
  : [];
if (migrations.length < 9) fail('São esperadas pelo menos nove migrations remotas.');
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

const journalMigrations = readFileSync(join(root, 'apps/mobile/src/data/journal-migrations.ts'), 'utf8');
for (const marker of ['JOURNAL_SCHEMA_VERSION = 8', 'CREATE TABLE IF NOT EXISTS journal_entries', 'deleted_at']) {
  if (!journalMigrations.includes(marker)) fail(`Migration local do diário sem marcador obrigatório: ${marker}`);
}

const supportMigrations = readFileSync(join(root, 'apps/mobile/src/data/support-plan-migrations.ts'), 'utf8');
if (!/SUPPORT_PLAN_SCHEMA_VERSION = 9[\s\S]*CREATE TABLE IF NOT EXISTS support_plans/.test(supportMigrations)) {
  fail('Migration local 9 do plano de apoio não foi localizada.');
}

const syncSource = readFileSync(join(root, 'apps/mobile/src/services/sync.ts'), 'utf8');
for (const marker of ['pull_mood_checkins', 'remoteCursorId', 'resetRemoteCursor']) {
  if (!syncSource.includes(marker)) fail(`Sincronização sem marcador obrigatório: ${marker}`);
}

const careSyncSource = readFileSync(join(root, 'apps/mobile/src/services/care-sync.ts'), 'utf8');
for (const marker of ["'journal_entry'", 'journalEntrySchema', 'applyRemoteJournalEntry', 'markDeleted']) {
  if (!careSyncSource.includes(marker)) fail(`Sincronização do diário sem marcador obrigatório: ${marker}`);
}

const journalDomain = readFileSync(join(root, 'packages/domain/src/journal.ts'), 'utf8');
for (const marker of ['updateJournalEntryInputSchema', 'deletedAt']) {
  if (!journalDomain.includes(marker)) fail(`Domínio do diário sem marcador do Sprint 06: ${marker}`);
}

const journalRepository = readFileSync(join(root, 'apps/mobile/src/data/journal-repository.ts'), 'utf8');
for (const marker of ['listJournalEntries', 'updateJournalEntry', 'deleteJournalEntry', "operation: 'upsert' | 'delete'"]) {
  if (!journalRepository.includes(marker)) fail(`Repositório do diário sem marcador do Sprint 06: ${marker}`);
}

const insightsSource = readFileSync(join(root, 'apps/mobile/src/services/insights.ts'), 'utf8');
for (const marker of ['buildContextComparisons', 'sleep-anxiety', 'intensity-anxiety', 'strategies-intensity']) {
  if (!insightsSource.includes(marker)) fail(`Insights sem comparação descritiva obrigatória: ${marker}`);
}

const accountRepository = readFileSync(join(root, 'apps/mobile/src/data/account-repository.ts'), 'utf8');
for (const marker of ['listConsentState', 'setOptionalConsent', 'requestAccountDeletion', 'cancelAccountDeletion']) {
  if (!accountRepository.includes(marker)) fail(`Gestão da conta sem marcador obrigatório: ${marker}`);
}

const exportSource = readFileSync(join(root, 'apps/mobile/src/services/account-export.ts'), 'utf8');
for (const marker of ['buildAccountExport', 'journal_entries', 'support_contacts', 'Tehkné Solutions']) {
  if (!exportSource.includes(marker)) fail(`Exportação integral sem marcador obrigatório: ${marker}`);
}

const appLockSource = readFileSync(join(root, 'apps/mobile/src/security/AppLockShield.tsx'), 'utf8');
for (const marker of ['authenticateAsync', 'shouldRequireAppUnlock', 'app-lock-unlock', 'reduceMotion']) {
  if (!appLockSource.includes(marker)) fail(`Bloqueio do app sem marcador obrigatório: ${marker}`);
}

const notificationPreferences = readFileSync(join(root, 'apps/mobile/src/preferences/notification-preferences.ts'), 'utf8');
for (const marker of ['dailyCheckIn', 'quietHoursEnabled', 'quietStartLocal', 'SecureStore']) {
  if (!notificationPreferences.includes(marker)) fail(`Preferências de notificações sem marcador obrigatório: ${marker}`);
}

const reminderSource = readFileSync(join(root, 'apps/mobile/src/services/reminders.ts'), 'utf8');
for (const marker of [
  'care-reminders-quiet',
  'scheduleDailyCheckInReminder',
  'refreshAllUserReminders',
  'readNotificationPreferences',
  'discreetContent',
]) {
  if (!reminderSource.includes(marker)) fail(`Serviço de lembretes sem marcador do Sprint 08: ${marker}`);
}

const notificationPolicy = readFileSync(join(root, 'apps/mobile/src/services/notification-policy.ts'), 'utf8');
for (const marker of ['isWithinQuietHours', 'normalizeTimeLocal', 'start < end']) {
  if (!notificationPolicy.includes(marker)) fail(`Política de horário silencioso sem marcador: ${marker}`);
}

const accessibilityProvider = readFileSync(join(root, 'apps/mobile/src/accessibility/AccessibilityProvider.tsx'), 'utf8');
for (const marker of ['AccessibilityInfo', 'reduceMotionChanged', 'fontScale', 'updatePreferences']) {
  if (!accessibilityProvider.includes(marker)) fail(`Provider de acessibilidade sem marcador: ${marker}`);
}

const appTextSource = readFileSync(join(root, 'apps/mobile/src/components/AppText.tsx'), 'utf8');
for (const marker of ['useAppAccessibility', 'scaleTextMetrics', 'highContrast', 'maxFontSizeMultiplier']) {
  if (!appTextSource.includes(marker)) fail(`AppText sem suporte acessível obrigatório: ${marker}`);
}

const databaseSource = readFileSync(join(root, 'apps/mobile/src/data/database.ts'), 'utf8');
for (const marker of ['PRAGMA cipher_version', 'sqlcipher_required', 'closeAsync', 'runJournalMigrations']) {
  if (!databaseSource.includes(marker)) fail(`Banco local sem proteção ou migration obrigatória: ${marker}`);
}

const e2eRequiredIds = [
  ['apps/mobile/app/(auth)/sign-in.tsx', 'sign-in-submit'],
  ['apps/mobile/app/(tabs)/index.tsx', 'home-open-check-in'],
  ['apps/mobile/app/(tabs)/index.tsx', 'home-open-settings'],
  ['apps/mobile/app/(tabs)/check-in.tsx', 'check-in-save'],
  ['apps/mobile/app/(tabs)/diary.tsx', 'journal-save'],
  ['apps/mobile/app/(tabs)/diary.tsx', 'journal-search'],
  ['apps/mobile/app/(tabs)/diary.tsx', 'journal-cancel-edit'],
  ['apps/mobile/app/settings.tsx', 'settings-title'],
  ['apps/mobile/app/settings.tsx', 'settings-open-notifications'],
  ['apps/mobile/app/settings.tsx', 'settings-open-accessibility'],
  ['apps/mobile/app/settings.tsx', 'settings-export'],
  ['apps/mobile/app/settings.tsx', 'settings-sign-out'],
  ['apps/mobile/app/notifications-settings.tsx', 'notifications-settings-title'],
  ['apps/mobile/app/notifications-settings.tsx', 'notifications-settings-save'],
  ['apps/mobile/app/accessibility-settings.tsx', 'accessibility-settings-title'],
  ['apps/mobile/app/accessibility-settings.tsx', 'accessibility-settings-save'],
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
console.log('- SQLCipher, biometria, privacidade, notificações discretas, acessibilidade e beta isolada estão presentes.');
