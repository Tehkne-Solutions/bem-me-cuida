import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { discoverIosBuilds, selectIosBuild } from './lib/rc011-ios-artifact.mjs';

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
if (!['discover', 'select'].includes(args.mode) || !args.input || !args['source-commit'] || !args.output) {
  throw new Error('Use --mode discover|select, --input, --source-commit e --output.');
}
const payload = JSON.parse(readFileSync(resolve(args.input), 'utf8'));
const result = args.mode === 'discover'
  ? discoverIosBuilds(payload, args['source-commit'])
  : selectIosBuild(payload, { sourceCommit: args['source-commit'], buildId: args['build-id'] ?? '' });
const output = resolve(args.output);
mkdirSync(dirname(output), { recursive: true });
writeFileSync(output, `${JSON.stringify(result, null, 2)}\n`, 'utf8');
console.log(`Resultado iOS salvo em ${output}.`);
console.log('Tehkné Solutions');
