import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { createIosPhysicalSession } from './lib/rc011-ios-multiplatform-validation.mjs';

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
for (const key of ['builds', 'plan', 'source-commit', 'build-id', 'profile-id', 'device-status', 'installation-mode', 'os-version', 'suite-results', 'evidence-url', 'output']) {
  if (!args[key]) throw new Error(`Argumento obrigatório ausente: --${key}.`);
}
const readJson = (path) => JSON.parse(readFileSync(resolve(path), 'utf8'));
const session = createIosPhysicalSession({
  builds: readJson(args.builds), plan: readJson(args.plan), sourceCommit: args['source-commit'], buildId: args['build-id'],
  profileId: args['profile-id'], deviceStatus: args['device-status'], installationMode: args['installation-mode'], osVersion: args['os-version'],
  suiteResults: args['suite-results'], evidenceUrl: args['evidence-url'],
});
const output = resolve(args.output);
mkdirSync(dirname(output), { recursive: true });
writeFileSync(output, `${JSON.stringify(session, null, 2)}\n`, 'utf8');
console.log(`Sessão iOS sanitizada salva em ${output}.`);
console.log('Nenhum gate foi aprovado automaticamente.');
console.log('Tehkné Solutions');
