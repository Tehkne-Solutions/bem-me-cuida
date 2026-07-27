import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { proposeCycleClosure } from './lib/rc011-post-release-observability.mjs';

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
const readJson = (path) => JSON.parse(readFileSync(resolve(path), 'utf8'));
const args = argsMap(process.argv.slice(2));
const payload = proposeCycleClosure({
  sourceCommit: args['source-commit'], evidenceUrl: args['evidence-url'],
  publication: readJson(args.publication ?? 'release/rc-0.11.0/release-publication.json'),
  rollout: readJson(args.rollout ?? 'release/rc-0.11.0/production-rollout.json'),
  health: readJson(args.health ?? 'release/rc-0.11.0/post-release-health.json'),
  incidents: readJson(args.incidents ?? 'release/rc-0.11.0/post-release-incidents.json'),
  backlog: readJson(args.backlog ?? 'release/rc-0.11.0/next-cycle-backlog.json'),
});
const output = resolve(args.output ?? 'artifacts/rc011-cycle-closure-proposal.json');
mkdirSync(dirname(output), { recursive: true });
writeFileSync(output, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
console.log(`Proposta de encerramento salva em ${output}.`);
console.log('A proposta ainda exige revisão humana e PR.');
console.log('Tehkné Solutions');
