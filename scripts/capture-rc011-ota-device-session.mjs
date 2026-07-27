import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { createOtaDeviceSession } from './lib/rc011-ota-final-validation.mjs';

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
const readJson = (path) => JSON.parse(readFileSync(resolve(path), 'utf8'));
const args = argsMap(process.argv.slice(2));
for (const key of ['source-commit', 'platform', 'build-id', 'profile-id', 'os-version', 'action', 'group-id', 'check-results', 'evidence-url', 'output']) {
  if (!args[key]) throw new Error(`Argumento obrigatório ausente: --${key}.`);
}
const session = createOtaDeviceSession({
  builds: readJson(args.builds ?? 'release/rc-0.11.0/builds.json'),
  ota: readJson(args.ota ?? 'release/rc-0.11.0/ota-validation.json'),
  deviceMatrix: readJson(args.devices ?? 'release/rc-0.11.0/device-matrix.json'),
  sourceCommit: args['source-commit'], platform: args.platform, buildId: args['build-id'], profileId: args['profile-id'],
  osVersion: args['os-version'], action: args.action, groupId: args['group-id'], checkResults: args['check-results'], evidenceUrl: args['evidence-url'],
});
const output = resolve(args.output);
mkdirSync(dirname(output), { recursive: true });
writeFileSync(output, `${JSON.stringify(session, null, 2)}\n`, 'utf8');
console.log(`Sessão OTA sanitizada salva em ${output}.`);
console.log(`Session ID: ${session.sessionId}`);
console.log('Tehkné Solutions');
