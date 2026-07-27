import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { createIncidentCapture } from './lib/rc011-post-release-observability.mjs';

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
const capture = createIncidentCapture({
  sourceCommit: args['source-commit'], incidentId: args['incident-id'], severity: args.severity, status: args.status,
  platform: args.platform, impact: args.impact, action: args.action, evidenceUrl: args['evidence-url'],
});
const output = resolve(args.output ?? 'artifacts/rc011-post-release-incident.json');
mkdirSync(dirname(output), { recursive: true });
writeFileSync(output, `${JSON.stringify(capture, null, 2)}\n`, 'utf8');
console.log(`Incidente sanitizado salvo em ${output}.`);
console.log('Tehkné Solutions');
