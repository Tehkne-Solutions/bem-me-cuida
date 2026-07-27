import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { applyRolloutObservation } from './lib/rc011-production-rollout.mjs';

function argsMap(values) {
  const result = {};
  for (let index = 0; index < values.length; index += 2) {
    const key = values[index]; const value = values[index + 1];
    if (!key?.startsWith('--') || value === undefined) throw new Error(`Argumento inválido próximo de ${key ?? 'fim'}.`);
    result[key.slice(2)] = value;
  }
  return result;
}
const args = argsMap(process.argv.slice(2));
if (!args.observation || !args.output) throw new Error('Use --observation e --output.');
const readJson = (path) => JSON.parse(readFileSync(resolve(path), 'utf8'));
const rollout = readJson(args.source ?? 'release/rc-0.11.0/production-rollout.json');
const observation = readJson(args.observation);
const applied = applyRolloutObservation({ rollout, observation });
const output = resolve(args.output);
mkdirSync(dirname(output), { recursive: true });
writeFileSync(output, `${JSON.stringify(applied.rollout, null, 2)}\n`, 'utf8');
if (!applied.duplicate && args['history-dir']) {
  const history = resolve(args['history-dir']);
  mkdirSync(history, { recursive: true });
  writeFileSync(join(history, `${observation.percentage}-${observation.recordedAt.replace(/[:.]/g, '-')}.json`), `${JSON.stringify(observation, null, 2)}\n`, 'utf8');
}
console.log(applied.duplicate ? 'Observação já registrada.' : `Observação ${observation.percentage}% aplicada.`);
console.log(`Resultado: ${applied.result.status}.`);
console.log(`Estado do rollout: ${applied.rollout.status}.`);
console.log('Tehkné Solutions');
