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
const readJson = (path) => JSON.parse(readFileSync(resolve(path), 'utf8'));
const save = (path, value) => { const output = resolve(path); mkdirSync(dirname(output), { recursive: true }); writeFileSync(output, `${JSON.stringify(value, null, 2)}\n`, 'utf8'); return output; };
const args = argsMap(process.argv.slice(2));
if (!args.session || !args.output) throw new Error('Use --session e --output.');
const validation = readJson(args.source ?? 'release/rc-0.11.0/ota-device-validation.json');
const session = readJson(args.session);
const applied = applyOtaDeviceSession({ validation, session });
const validationOutput = save(args.output, applied.validation);
if (!applied.duplicate && args['history-dir']) {
  const history = resolve(args['history-dir']);
  mkdirSync(history, { recursive: true });
  writeFileSync(join(history, `${session.sessionId}.json`), `${JSON.stringify(session, null, 2)}\n`, 'utf8');
}
if (args['ota-source'] && args['ota-output']) {
  const ota = readJson(args['ota-source']);
  const actionState = applied.validation.actions?.[session.action]?.status;
  const target = session.action === 'publish' ? ota.publish : ota.rollback;
  if (!target) throw new Error('Registro OTA não contém a ação da sessão.');
  if (actionState === 'passed') {
    target.status = 'passed';
    target.physicalValidatedAt = new Date().toISOString();
    target.physicalValidationEvidenceUrl = session.evidenceUrl;
  } else if (actionState === 'failed' || actionState === 'blocked') {
    target.status = actionState;
    target.physicalValidationEvidenceUrl = session.evidenceUrl;
  }
  ota.updatedAt = new Date().toISOString();
  save(args['ota-output'], ota);
}
console.log(applied.duplicate ? 'Sessão OTA já registrada; nenhuma mutação aplicada.' : `Sessão OTA aplicada em ${validationOutput}.`);
console.log('A alteração permanece revisável por PR e não promove a candidata.');
console.log('Tehkné Solutions');
