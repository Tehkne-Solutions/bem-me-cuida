import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { buildRc011ExternalAudit, renderRc011ExternalAuditMarkdown } from './lib/rc011-external-audit.mjs';

function parseArgs(values) {
  const result = {};
  for (let index = 0; index < values.length; index += 2) {
    const key = values[index];
    const value = values[index + 1];
    if (!key?.startsWith('--') || value === undefined) throw new Error(`Argumento inválido próximo de ${key ?? 'fim'}.`);
    result[key.slice(2)] = value;
  }
  return result;
}

const args = parseArgs(process.argv.slice(2));
const required = ['manifest', 'repository-variables', 'environments', 'build-details', 'build-variables', 'build-secrets', 'homologation-details', 'homologation-variables', 'homologation-secrets', 'output-json', 'output-md'];
for (const name of required) if (!args[name]) throw new Error(`Argumento obrigatório ausente: --${name}.`);

const readJson = (path) => JSON.parse(readFileSync(resolve(path), 'utf8'));
const audit = buildRc011ExternalAudit({
  manifest: readJson(args.manifest),
  repositoryVariablesResponse: readJson(args['repository-variables']),
  environmentsResponse: readJson(args.environments),
  environmentResponses: {
    'rc-011-build': {
      details: readJson(args['build-details']),
      variables: readJson(args['build-variables']),
      secrets: readJson(args['build-secrets']),
    },
    'rc-011-homologation': {
      details: readJson(args['homologation-details']),
      variables: readJson(args['homologation-variables']),
      secrets: readJson(args['homologation-secrets']),
    },
  },
  workflowRunId: args['run-id'] ?? null,
});

for (const output of [args['output-json'], args['output-md']]) mkdirSync(dirname(resolve(output)), { recursive: true });
writeFileSync(resolve(args['output-json']), `${JSON.stringify(audit, null, 2)}\n`, 'utf8');
writeFileSync(resolve(args['output-md']), renderRc011ExternalAuditMarkdown(audit), 'utf8');
console.log(`Auditoria externa gerada: ${audit.recommendation}.`);
console.log(`Bloqueadores: ${audit.blockers.length}.`);
console.log('Nenhum valor de secret ou variable foi registrado.');
console.log('Tehkné Solutions');
