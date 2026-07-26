import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

function parseArgs(values) {
  const result = {};
  for (let index = 0; index < values.length; index += 2) {
    const key = values[index];
    const value = values[index + 1];
    if (!key?.startsWith('--') || value === undefined) {
      throw new Error(`Argumento inválido próximo de ${key ?? 'fim'}.`);
    }
    result[key.slice(2)] = value;
  }
  return result;
}

const args = parseArgs(process.argv.slice(2));
const scope = args.scope;
if (!['build', 'homologation', 'services'].includes(scope)) {
  throw new Error('--scope deve ser build, homologation ou services.');
}
if (!args.output || !args['source-commit'] || !args['evidence-url']) {
  throw new Error('Use --output, --source-commit e --evidence-url.');
}
if (!/^[a-f0-9]{40}$/i.test(args['source-commit'])) {
  throw new Error('O commit de origem deve ter 40 caracteres hexadecimais.');
}
if (!args['evidence-url'].startsWith('https://')) {
  throw new Error('A evidência precisa usar HTTPS.');
}

const text = (name) => String(process.env[name] ?? '').trim();
const boolean = (name) => ['1', 'true', 'yes'].includes(text(name).toLowerCase());
const checks = [];
const addCheck = (key, passed, detail) => checks.push({ key, passed, detail });
const validUuid = (value) => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
const validSupabaseUrl = (value) => /^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(value) && !/example|SEU-PROJETO/i.test(value);
const validPublishableKey = (value) => /^sb_(publishable|anon)_/i.test(value) && !/placeholder|SUBSTITUA/i.test(value);

if (scope === 'build' || scope === 'homologation') {
  const expectedEnvironment = scope === 'build' ? 'rc-011-build' : 'rc-011-homologation';
  addCheck('environment_name', text('RC011_ENVIRONMENT_NAME') === expectedEnvironment, `Esperado ${expectedEnvironment}.`);
  addCheck('expo_token', boolean('EXPO_TOKEN_PRESENT'), 'Apenas a presença do secret é registrada.');
  addCheck('eas_project_id', validUuid(text('EXPO_PUBLIC_EAS_PROJECT_ID')), 'Project ID EAS precisa ser UUID válido.');
  addCheck('supabase_url', validSupabaseUrl(text('EXPO_PUBLIC_SUPABASE_URL')), 'URL pública do Supabase precisa ser real.');
  addCheck('supabase_publishable_key', validPublishableKey(text('EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY')), 'Somente presença e formato da chave pública são verificados.');
  addCheck('cycle_status', ['active', 'frozen'].includes(text('RC011_CYCLE_STATUS')), 'O ciclo precisa estar ativo ou congelado.');
  addCheck('cycle_milestone', boolean('RC011_MILESTONE_DONE'), 'O marco da RC precisa estar concluído.');
  addCheck('cycle_blockers', text('RC011_BLOCKER_COUNT') === '0', 'O ciclo precisa estar sem bloqueadores.');
}

let callbacks = [];
if (scope === 'services') {
  callbacks = text('RC011_AUTH_CALLBACKS').split(',').map((item) => item.trim()).filter(Boolean);
  const expectedCallbacks = [
    'bemmecuida-rc011://auth/callback',
    'bemmecuida-rc011://reset-password',
  ];
  addCheck('eas_project', validUuid(text('EXPO_PUBLIC_EAS_PROJECT_ID')), 'Projeto EAS configurado.');
  addCheck('supabase_project', validSupabaseUrl(text('EXPO_PUBLIC_SUPABASE_URL')), 'Projeto Supabase configurado.');
  addCheck('auth_callbacks', expectedCallbacks.every((item) => callbacks.includes(item)), 'Callbacks esperados precisam estar cadastrados.');
  addCheck('auth_callbacks_confirmed', boolean('RC011_AUTH_CALLBACKS_CONFIGURED'), 'Confirmação operacional explícita dos callbacks.');
}

const ready = checks.length > 0 && checks.every((item) => item.passed);
const output = resolve(args.output);
mkdirSync(dirname(output), { recursive: true });
const payload = {
  schemaVersion: '1.0',
  release: '0.11.0-rc.1',
  generatedBy: 'Tehkné Solutions',
  generatedAt: new Date().toISOString(),
  sourceCommit: args['source-commit'].toLowerCase(),
  scope,
  status: ready ? 'ready' : 'blocked',
  evidenceUrl: args['evidence-url'],
  privacy: {
    containsPersonalData: false,
    containsClinicalData: false,
    containsSecrets: false,
  },
  metadata: {
    environment: scope === 'build' ? 'rc-011-build' : scope === 'homologation' ? 'rc-011-homologation' : null,
    easProjectId: validUuid(text('EXPO_PUBLIC_EAS_PROJECT_ID')) ? text('EXPO_PUBLIC_EAS_PROJECT_ID') : null,
    supabaseHost: validSupabaseUrl(text('EXPO_PUBLIC_SUPABASE_URL')) ? new URL(text('EXPO_PUBLIC_SUPABASE_URL')).host : null,
    callbacks: scope === 'services' ? callbacks : [],
  },
  checks,
};
writeFileSync(output, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
console.log(`Captura de infraestrutura ${scope} salva em ${output}.`);
console.log(`Status: ${payload.status}.`);
console.log('Nenhum secret ou chave completa foi gravado.');
console.log('Tehkné Solutions');
