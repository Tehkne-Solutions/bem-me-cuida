import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { createAndroidPhysicalSession } from './lib/rc011-android-physical-validation.mjs';

function argsMap(values) {
  const result = {};
  for (let index = 0; index < values.length; index += 2) {
    const key = values[index];
    const value = values[index + 1];
    if (!key?.startsWith('--') || value === undefined) throw new Error(`Argumento inválido próximo de ${key ?? 'fim'}.`);
    result[key.slice(2)] = value;
  }
  return result;
}

const args = argsMap(process.argv.slice(2));
for (const required of ['builds', 'plan', 'source-commit', 'build-id', 'profile-id', 'device-status', 'installation-mode', 'os-version', 'suite-results', 'evidence-url', 'output']) {
  if (!args[required]) throw new Error(`Argumento obrigatório ausente: --${required}.`);
}

const readJson = (path) => JSON.parse(readFileSync(resolve(path), 'utf8'));
const session = createAndroidPhysicalSession({
  builds: readJson(args.builds),
  plan: readJson(args.plan),
  sourceCommit: args['source-commit'],
  buildId: args['build-id'],
  profileId: args['profile-id'],
  deviceStatus: args['device-status'],
  installationMode: args['installation-mode'],
  osVersion: args['os-version'],
  suiteResults: args['suite-results'],
  evidenceUrl: args['evidence-url'],
  sessionId: args['session-id'] || undefined,
  capturedAt: args['captured-at'] || undefined,
});

const output = resolve(args.output);
mkdirSync(dirname(output), { recursive: true });
writeFileSync(output, `${JSON.stringify(session, null, 2)}\n`, 'utf8');
console.log(`Sessão física Android sanitizada salva em ${output}.`);
console.log(`Session ID: ${session.sessionId}`);
console.log('Nenhum gate foi aprovado automaticamente.');
console.log('Tehkné Solutions');
