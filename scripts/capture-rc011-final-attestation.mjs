import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { captureAttestation } from './lib/rc011-production-rollout.mjs';

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
for (const key of ['source-commit', 'role', 'decision', 'evidence-url', 'actor', 'repository', 'output']) {
  if (!args[key]) throw new Error(`--${key} é obrigatório.`);
}
const record = captureAttestation({
  sourceCommit: args['source-commit'], role: args.role, decision: args.decision,
  evidenceUrl: args['evidence-url'], actor: args.actor, repository: args.repository,
});
const output = resolve(args.output);
mkdirSync(dirname(output), { recursive: true });
writeFileSync(output, `${JSON.stringify(record, null, 2)}\n`, 'utf8');
console.log(`Atestação ${record.role} capturada em ${output}.`);
console.log('Somente o fingerprint operacional foi persistido.');
console.log('Tehkné Solutions');
