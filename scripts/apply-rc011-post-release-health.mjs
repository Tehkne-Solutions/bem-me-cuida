import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { applyHealthSnapshot } from './lib/rc011-post-release-observability.mjs';

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
if (!args.capture || !args.output) throw new Error('Use --capture e --output.');
const sourcePath = resolve(args.source ?? 'release/rc-0.11.0/post-release-health.json');
const capturePath = resolve(args.capture);
const outputPath = resolve(args.output);
const next = applyHealthSnapshot(JSON.parse(readFileSync(sourcePath, 'utf8')), JSON.parse(readFileSync(capturePath, 'utf8')));
writeFileSync(outputPath, `${JSON.stringify(next, null, 2)}\n`, 'utf8');
console.log(`Registro de saúde atualizado em ${outputPath}.`);
console.log('O resultado deve ser revisado por PR.');
console.log('Tehkné Solutions');
