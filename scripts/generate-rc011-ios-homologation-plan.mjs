import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { createIosHomologationPlan } from './lib/rc011-ios-artifact.mjs';

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
if (!args.builds || !args.devices || !args.tests || !args['evidence-url'] || !args.output) {
  throw new Error('Use --builds, --devices, --tests, --evidence-url e --output.');
}
const readJson = (path) => JSON.parse(readFileSync(resolve(path), 'utf8'));
const plan = createIosHomologationPlan({
  builds: readJson(args.builds), deviceMatrix: readJson(args.devices), testResults: readJson(args.tests), evidenceUrl: args['evidence-url'],
});
const output = resolve(args.output);
mkdirSync(dirname(output), { recursive: true });
writeFileSync(output, `${JSON.stringify(plan, null, 2)}\n`, 'utf8');
console.log(`Plano iOS pendente criado em ${output}.`);
console.log('Nenhum aparelho ou suíte foi aprovado.');
console.log('Tehkné Solutions');
