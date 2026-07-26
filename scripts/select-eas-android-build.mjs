import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { discoverAndroidBuilds, selectAndroidBuild } from './lib/rc011-android-artifact.mjs';

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
if (!['discover', 'select'].includes(args.mode)) throw new Error('--mode deve ser discover ou select.');
if (!args.input || !args['source-commit'] || !args.output) {
  throw new Error('Use --input, --source-commit e --output.');
}

const payload = JSON.parse(readFileSync(resolve(args.input), 'utf8'));
const result = args.mode === 'discover'
  ? discoverAndroidBuilds(payload, args['source-commit'])
  : selectAndroidBuild(payload, { sourceCommit: args['source-commit'], buildId: args['build-id'] ?? '' });

const output = resolve(args.output);
mkdirSync(dirname(output), { recursive: true });
writeFileSync(output, `${JSON.stringify(result, null, 2)}\n`, 'utf8');

if (args.mode === 'select') console.log(`Build Android selecionado: ${result.selected.id}`);
else console.log(`Descoberta Android concluída: ${result.status}; candidatos: ${result.candidates.length}.`);
console.log('Nenhum build foi aprovado ou promovido automaticamente.');
console.log('Tehkné Solutions');
