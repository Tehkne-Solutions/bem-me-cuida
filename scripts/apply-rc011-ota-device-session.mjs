import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { applyOtaDeviceSession } from './lib/rc011-ota-final-validation.mjs';

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
if (!args.session || !args.output) throw new Error('Use --session e --output.');
const validation = JSON.parse(readFileSync(resolve(args.source ?? 'release/rc-0.11.0/ota-device-validation.json'), 'utf8'));
const session = JSON.parse(readFileSync(resolve(args.session), 'utf8'));
const applied = applyOtaDeviceSession({ validation, session });
const output = resolve(args.output);
mkdirSync(dirname(output), { recursive: true });
writeFileSync(output, `${JSON.stringify(applied.validation, null, 2)}\n`, 'utf8');
if (!applied.duplicate && args['history-dir']) {
  const history = resolve(args['history-dir']);
  mkdirSync(history, { recursive: true });
  writeFileSync(join(history, `${session.sessionId}.json`), `${JSON.stringify(session, null, 2)}\n`, 'utf8');
}
console.log(applied.duplicate ? 'Sessão OTA já registrada; nenhuma mutação aplicada.' : `Sessão OTA aplicada em ${output}.`);
console.log('Tehkné Solutions');
