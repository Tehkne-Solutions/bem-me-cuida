import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { captureRolloutObservation } from './lib/rc011-production-rollout.mjs';

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
for (const key of ['source-commit', 'percentage', 'crash-free', 'sync-success', 'auth-success', 'critical-incidents', 'blocking-support', 'evidence-url', 'output']) {
  if (args[key] === undefined) throw new Error(`--${key} é obrigatório.`);
}
const observation = captureRolloutObservation({
  sourceCommit: args['source-commit'], percentage: args.percentage,
  metrics: {
    crashFreeSessionsPct: args['crash-free'], syncSuccessPct: args['sync-success'], authSuccessPct: args['auth-success'],
    criticalIncidents: args['critical-incidents'], blockingSupportReports: args['blocking-support'],
  },
  evidenceUrl: args['evidence-url'],
});
const output = resolve(args.output);
mkdirSync(dirname(output), { recursive: true });
writeFileSync(output, `${JSON.stringify(observation, null, 2)}\n`, 'utf8');
console.log(`Observação do rollout ${observation.percentage}% capturada em ${output}.`);
console.log('Tehkné Solutions');
