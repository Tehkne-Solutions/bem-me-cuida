import { readFileSync } from 'node:fs';
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

function requiredValue(key) {
  const value = process.env[key]?.trim();
  if (!value || /SUBSTITUA|SEU-PROJETO|example\.com/i.test(value)) {
    fail(`${key} não está configurada para produção.`);
    return '';
  }
  return value;
}

function requireHttps(key) {
  const value = requiredValue(key);
  if (value && !value.startsWith('https://')) fail(`${key} deve usar HTTPS.`);
}

const eas = JSON.parse(readFileSync(join(root, 'apps/mobile/eas.json'), 'utf8'));
const app = JSON.parse(readFileSync(join(root, 'apps/mobile/app.json'), 'utf8'));
const production = eas?.build?.production;

if (process.env.APP_VARIANT !== 'production') fail('Execute production:check com APP_VARIANT=production.');
if (process.env.EXPO_PUBLIC_APP_ENV !== 'production') fail('EXPO_PUBLIC_APP_ENV deve ser production.');
if (process.env.EXPO_PUBLIC_PRODUCTION_RELEASE?.trim() !== '1') fail('EXPO_PUBLIC_PRODUCTION_RELEASE deve ser 1 para a primeira produção.');

requiredValue('EXPO_PUBLIC_SUPABASE_URL');
requiredValue('EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY');
requiredValue('EXPO_PUBLIC_EAS_PROJECT_ID');
requireHttps('PRODUCTION_SUPPORT_URL');
requireHttps('PRODUCTION_PRIVACY_URL');
requireHttps('PRODUCTION_TERMS_URL');

if (!production || production.distribution !== 'store' || production.android?.buildType !== 'app-bundle') {
  fail('Perfil EAS production não está configurado para distribuição em loja com app-bundle.');
} else {
  ok('Perfil de build para loja encontrado.');
}

if (app.expo.version !== '0.10.0') fail(`Versão de produção inesperada: ${app.expo.version}.`);
else ok('Versão-base 0.10.0 alinhada para a primeira produção controlada.');

for (const key of Object.keys(process.env)) {
  if (/SERVICE_ROLE|SUPABASE_DB_PASSWORD|SUPABASE_ACCESS_TOKEN/.test(key) && key.startsWith('EXPO_PUBLIC_')) {
    fail(`Segredo administrativo não pode ser público: ${key}.`);
  }
}

if (failures.length) {
  console.error('Production check reprovado:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('Production check aprovado:');
for (const notice of notices) console.log(`- ${notice}`);
console.log('- URLs legais e de suporte usam HTTPS.');
console.log('- Supabase público e projeto EAS estão configurados.');
console.log('- Credenciais de assinatura e consoles continuam fora do repositório.');
