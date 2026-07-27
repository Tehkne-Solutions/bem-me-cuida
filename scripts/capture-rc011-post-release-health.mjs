import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { createHealthSnapshot } from './lib/rc011-post-release-observability.mjs';

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
const capture = createHealthSnapshot({
  sourceCommit: args['source-commit'], window: args.window, crashFreePct: args['crash-free'], syncSuccessPct: args['sync-success'],
  authSuccessPct: args['auth-success'], notificationSuccessPct: args['notification-success'], sampleSize: args['sample-size'],
  criticalIncidents: args['critical-incidents'], openSev2: args['open-sev2'], blockingSupportReports: args['blocking-support'], evidenceUrl: args['evidence-url'],
});
const output = resolve(args.output ?? 'artifacts/rc011-post-release-health.json');
mkdirSync(dirname(output), { recursive: true });
writeFileSync(output, `${JSON.stringify(capture, null, 2)}\n`, 'utf8');
console.log(`Snapshot pós-release salvo em ${output}.`);
console.log(`Recomendação: ${capture.recommendation}.`);
console.log('Tehkné Solutions');
