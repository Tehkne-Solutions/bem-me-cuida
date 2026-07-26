import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const failures = [];
const notices = [];

function fail(message) { failures.push(message); }
function ok(message) { notices.push(message); }
function value(name) { return process.env[name]?.trim() ?? ''; }
function readJson(path) { return JSON.parse(readFileSync(join(root, path), 'utf8')); }

const action = process.argv[2]?.trim() || value('OTA_ACTION') || 'validate';
const allowedActions = new Set(['validate', 'publish-validation', 'promote-production', 'rollback-production', 'cancel-rollout']);
if (!allowedActions.has(action)) fail(`OTA_ACTION inválida: ${action}.`);

const rootPackage = readJson('package.json');
const appVersion = rootPackage.version;
const appVariant = value('APP_VARIANT');
const appEnvironment = value('EXPO_PUBLIC_APP_ENV');
const runtimeVersion = value('OTA_RUNTIME_VERSION');
const channel = value('OTA_CHANNEL');
const hotfixId = value('OTA_HOTFIX_ID');
const approvalId = value('OTA_APPROVAL_ID');
const sourceCommit = value('OTA_SOURCE_COMMIT');
const fingerprint = value('OTA_FINGERPRINT_SHA256');
const message = value('OTA_MESSAGE');
const rollout = Number(value('OTA_ROLLOUT_PERCENTAGE') || '5');
const nativeChanges = value('OTA_NATIVE_CHANGES').toLowerCase() === 'true';
const projectId = value('EXPO_PUBLIC_EAS_PROJECT_ID');

if (!/^[0-9a-f-]{36}$/i.test(hotfixId)) fail('OTA_HOTFIX_ID deve ser um UUID válido.');
if (action !== 'validate' && !/^[0-9a-f-]{36}$/i.test(approvalId)) fail('OTA_APPROVAL_ID é obrigatório para publicar, promover ou reverter.');
if (!/^[A-Fa-f0-9]{7,40}$/.test(sourceCommit)) fail('OTA_SOURCE_COMMIT deve conter um SHA Git de 7 a 40 caracteres.');
if (!/^[A-Fa-f0-9]{64}$/.test(fingerprint)) fail('OTA_FINGERPRINT_SHA256 deve conter 64 caracteres hexadecimais.');
if (message.length < 5 || message.length > 240) fail('OTA_MESSAGE deve conter entre 5 e 240 caracteres.');
if (![1, 5, 10, 25, 50, 100].includes(rollout)) fail('OTA_ROLLOUT_PERCENTAGE deve ser 1, 5, 10, 25, 50 ou 100.');
if (nativeChanges) fail('OTA_NATIVE_CHANGES=true exige um novo binário e bloqueia EAS Update.');
if (runtimeVersion !== appVersion) fail(`Runtime OTA ${runtimeVersion || '(ausente)'} difere da versão-base ${appVersion}.`);
if (!['hotfix-validation', 'production'].includes(channel)) fail('OTA_CHANNEL deve ser hotfix-validation ou production.');
if (!/^[0-9a-f-]{36}$/i.test(projectId)) fail('EXPO_PUBLIC_EAS_PROJECT_ID deve ser o UUID real do projeto EAS.');
if (appVariant !== 'rc' && appVariant !== 'production') fail('APP_VARIANT deve ser rc na validação ou production na promoção.');
if (!['hotfix-validation', 'production'].includes(appEnvironment)) fail('EXPO_PUBLIC_APP_ENV deve ser hotfix-validation ou production.');

if (action === 'publish-validation') {
  if (channel !== 'hotfix-validation') fail('A publicação de validação deve usar o canal hotfix-validation.');
  if (appVariant !== 'rc') fail('A validação OTA deve usar a variante RC isolada.');
}

if (action === 'promote-production') {
  if (channel !== 'production') fail('A promoção deve apontar para o canal production.');
  if (!/^[0-9a-f-]{8,}$/i.test(value('OTA_VALIDATED_GROUP_ID'))) fail('OTA_VALIDATED_GROUP_ID é obrigatório para republicar o bundle validado.');
  if (appVariant !== 'production') fail('A promoção deve usar APP_VARIANT=production.');
}

if (action === 'rollback-production') {
  if (!/^[0-9a-f-]{8,}$/i.test(value('OTA_ROLLBACK_GROUP_ID'))) fail('OTA_ROLLBACK_GROUP_ID é obrigatório para rollback.');
  if (appVariant !== 'production') fail('O rollback deve usar APP_VARIANT=production.');
}

if (action === 'cancel-rollout') {
  if (!/^[0-9a-f-]{8,}$/i.test(value('OTA_CURRENT_GROUP_ID'))) fail('OTA_CURRENT_GROUP_ID é obrigatório para cancelar um rollout ativo.');
  if (appVariant !== 'production') fail('O cancelamento deve usar APP_VARIANT=production.');
}

const appConfig = readFileSync(join(root, 'apps/mobile/app.config.ts'), 'utf8');
if (!appConfig.includes("runtimeVersion: { policy: 'appVersion' }")) fail('App config deve usar runtimeVersion appVersion.');
const eas = readJson('apps/mobile/eas.json');
if (eas?.build?.production?.channel !== 'production') fail('Perfil production sem canal production.');
if (eas?.build?.['hotfix-validation']?.channel !== 'hotfix-validation') fail('Perfil hotfix-validation ausente ou com canal incorreto.');

if (failures.length) {
  console.error('OTA readiness reprovado:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

ok(`Ação ${action} validada.`);
ok(`Runtime ${runtimeVersion}, canal ${channel} e rollout ${rollout}% compatíveis.`);
ok('Nenhuma mudança nativa foi declarada.');
console.log('OTA readiness aprovado:');
for (const notice of notices) console.log(`- ${notice}`);
