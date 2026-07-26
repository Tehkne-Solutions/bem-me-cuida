import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

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
if (!args.source || !args.capture || !args.output) throw new Error('Use --source, --capture e --output.');
const source = JSON.parse(readFileSync(resolve(args.source), 'utf8'));
const capture = JSON.parse(readFileSync(resolve(args.capture), 'utf8'));
if (source.release !== '0.11.0-rc.1' || capture.release !== '0.11.0-rc.1') throw new Error('Release divergente.');
if (capture.generatedBy !== 'Tehkné Solutions') throw new Error('Captura sem assinatura Tehkné Solutions.');
if (capture.privacy?.containsSecrets !== false) throw new Error('Captura sem declaração de ausência de secrets.');
if (!['ready', 'blocked'].includes(capture.status)) throw new Error('Status de captura inválido.');
if (!capture.evidenceUrl?.startsWith('https://')) throw new Error('Captura sem evidência HTTPS.');
if (!/^[a-f0-9]{40}$/i.test(capture.sourceCommit ?? '')) throw new Error('Captura sem commit válido.');

const keyByScope = {
  build: 'buildEnvironment',
  homologation: 'homologationEnvironment',
  services: 'services',
};
const scopeKey = keyByScope[capture.scope];
if (!scopeKey || !source.scopes?.[scopeKey]) throw new Error(`Escopo desconhecido: ${capture.scope}.`);

source.scopes[scopeKey] = {
  ...source.scopes[scopeKey],
  status: capture.status,
  sourceCommit: capture.sourceCommit,
  checkedAt: capture.generatedAt,
  evidenceUrl: capture.evidenceUrl,
  checks: capture.checks,
  metadata: capture.metadata,
};
source.updatedAt = new Date().toISOString();
source.generatedBy = 'Tehkné Solutions';
source.privacy = {
  containsPersonalData: false,
  containsClinicalData: false,
  containsSecrets: false,
};

const output = resolve(args.output);
mkdirSync(dirname(output), { recursive: true });
writeFileSync(output, `${JSON.stringify(source, null, 2)}\n`, 'utf8');
console.log(`Captura ${capture.scope} aplicada em ${output}.`);
console.log('O arquivo gerado precisa ser revisado antes de substituir o registro versionado.');
console.log('Tehkné Solutions');
