import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

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

function safeText(value, field) {
  if (!value) return null;
  const text = String(value).trim().slice(0, 500);
  const prohibited = /(diagn[oó]st|medicament|di[aá]rio|emo[cç][aã]o|crise|paciente|cpf|telefone|e-?mail|nome completo)/i;
  if (prohibited.test(text)) throw new Error(`${field} contém termo potencialmente pessoal ou clínico.`);
  return text || null;
}

const args = argsMap(process.argv.slice(2));
const kind = args.kind;
const allowedKinds = ['device', 'suite', 'ota-publish', 'ota-rollback'];
if (!allowedKinds.includes(kind)) throw new Error(`--kind deve ser ${allowedKinds.join(', ')}.`);
if (!args.status || !args.output) throw new Error('Use --status e --output.');
if (['device', 'suite'].includes(kind) && !args.id) throw new Error('--id é obrigatório para device e suite.');
const allowedStatuses = ['pending', 'passed', 'failed', 'blocked', 'skipped'];
if (!allowedStatuses.includes(args.status)) throw new Error(`Status inválido: ${args.status}.`);
if (args.status === 'passed' && !args['evidence-url']?.startsWith('https://')) {
  throw new Error('Uma evidência aprovada exige URL HTTPS.');
}
if (args['evidence-url'] && !args['evidence-url'].startsWith('https://')) {
  throw new Error('A URL de evidência deve usar HTTPS.');
}

const defaultSource = kind === 'device'
  ? 'release/rc-0.11.0/device-matrix.json'
  : kind === 'suite'
    ? 'release/rc-0.11.0/test-results.json'
    : 'release/rc-0.11.0/ota-validation.json';
const source = resolve(args.source ?? defaultSource);
const document = JSON.parse(readFileSync(source, 'utf8'));
const validatedAt = new Date().toISOString();
const validatedBy = safeText(args.operator, 'operator') ?? 'operador-autorizado';
const notes = safeText(args.notes, 'notes');

if (kind === 'device' || kind === 'suite') {
  const collectionName = kind === 'device' ? 'profiles' : 'suites';
  const items = document[collectionName];
  if (!Array.isArray(items)) throw new Error(`Coleção ${collectionName} ausente em ${source}.`);
  const index = items.findIndex((item) => item.id === args.id);
  if (index < 0) throw new Error(`Identificador não encontrado: ${args.id}.`);
  items[index] = {
    ...items[index],
    status: args.status,
    evidenceUrl: args['evidence-url'] ?? null,
    notes,
    validatedAt,
    validatedBy,
  };
} else {
  const key = kind === 'ota-publish' ? 'publish' : 'rollback';
  const current = document[key];
  if (!current) throw new Error(`Registro OTA ${key} ausente.`);
  if (args.status === 'passed') {
    if (key === 'publish' && !current.groupId) throw new Error('A publicação OTA precisa ser capturada antes da aprovação.');
    if (key === 'rollback' && !current.rollbackGroupId) throw new Error('O rollback OTA precisa ser capturado antes da aprovação.');
  }
  document[key] = {
    ...current,
    status: args.status,
    evidenceUrl: args['evidence-url'] ?? null,
    notes,
    validatedAt,
    validatedBy,
  };
}

document.updatedAt = validatedAt;
document.generatedBy = 'Tehkné Solutions';
document.privacy = {
  ...(document.privacy ?? {}),
  containsPersonalData: false,
  containsClinicalData: false,
};

const output = resolve(args.output);
mkdirSync(dirname(output), { recursive: true });
writeFileSync(output, `${JSON.stringify(document, null, 2)}\n`, 'utf8');
console.log(`Evidência ${kind}${args.id ? `/${args.id}` : ''} registrada em ${output}.`);
console.log('O arquivo gerado exige revisão antes de substituir a fonte versionada.');
console.log('Tehkné Solutions');
