import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { applyAttestation } from './lib/rc011-production-rollout.mjs';

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
if (!args.attestation || !args.output) throw new Error('Use --attestation e --output.');
const readJson = (path) => JSON.parse(readFileSync(resolve(path), 'utf8'));
const register = readJson(args.source ?? 'release/rc-0.11.0/final-attestations.json');
const attestation = readJson(args.attestation);
const applied = applyAttestation({ register, attestation });
const output = resolve(args.output);
mkdirSync(dirname(output), { recursive: true });
writeFileSync(output, `${JSON.stringify(applied.register, null, 2)}\n`, 'utf8');
if (!applied.duplicate && args['history-dir']) {
  const history = resolve(args['history-dir']);
  mkdirSync(history, { recursive: true });
  writeFileSync(join(history, `${attestation.role}-${attestation.recordedAt.replace(/[:.]/g, '-')}.json`), `${JSON.stringify(attestation, null, 2)}\n`, 'utf8');
}
console.log(applied.duplicate ? 'Atestação já registrada.' : `Atestação ${attestation.role} aplicada.`);
console.log(`Estado consolidado: ${applied.register.status}.`);
console.log('Tehkné Solutions');
