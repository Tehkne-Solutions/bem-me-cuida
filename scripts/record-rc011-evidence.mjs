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
if (!['device', 'suite'].includes(kind)) throw new Error('--kind deve ser device ou suite.');
if (!args.id || !args.status || !args.output) throw new Error('Use --id, --status e --output.');
const allowedStatuses = ['pending', 'passed', 'failed', 'blocked', 'skipped'];
if (!allowedStatuses.includes(args.status)) throw new Error(`Status inválido: ${args.status}.`);
if (args.status === 'passed' && !args['evidence-url']?.startsWith('https://')) {
  throw new Error('Uma evidência aprovada exige URL HTTPS.');
}
if (args['evidence-url'] && !args['evidence-url'].startsWith('https://')) {
  throw new Error('A URL de evidência deve usar HTTPS.');
}

const source = resolve(args.source ?? (kind === 'device'
  ? 'release/rc-0.11.0/device-matrix.json'
  : 'release/rc-0.11.0/test-results.json'));
const document = JSON.parse(readFileSync(source, 'utf8'));
const collectionName = kind === 'device' ? 'profiles' : 'suites';
const items = document[collectionName];
if (!Array.isArray(items)) throw new Error(`Coleção ${collectionName} ausente em ${source}.`);
const index = items.findIndex((item) => item.id === args.id);
if (index < 0) throw new Error(`Identificador não encontrado: ${args.id}.`);

items[index] = {
  ...items[index],
  status: args.status,
  evidenceUrl: args['evidence-url'] ?? null,
  notes: safeText(args.notes, 'notes'),
  validatedAt: new Date().toISOString(),
  validatedBy: safeText(args.operator, 'operator') ?? 'operador-autorizado',
};
document.updatedAt = new Date().toISOString();
document.generatedBy = 'Tehkné Solutions';
document.privacy = {
  ...(document.privacy ?? {}),
  containsPersonalData: false,
  containsClinicalData: false,
};

const output = resolve(args.output);
mkdirSync(dirname(output), { recursive: true });
writeFileSync(output, `${JSON.stringify(document, null, 2)}\n`, 'utf8');
console.log(`Evidência ${kind}/${args.id} registrada em ${output}.`);
console.log('O arquivo gerado exige revisão antes de substituir a fonte versionada.');
console.log('Tehkné Solutions');
