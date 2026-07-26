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

function collect(value, pattern, output = []) {
  if (Array.isArray(value)) {
    for (const item of value) collect(item, pattern, output);
    return output;
  }
  if (!value || typeof value !== 'object') return output;
  for (const [key, item] of Object.entries(value)) {
    if (pattern.test(key) && typeof item === 'string') output.push(item);
    collect(item, pattern, output);
  }
  return output;
}

function first(value, patterns) {
  for (const pattern of patterns) {
    const result = collect(value, pattern)[0];
    if (result) return result;
  }
  return null;
}

const args = argsMap(process.argv.slice(2));
if (!['publish', 'rollback'].includes(args.action)) throw new Error('--action deve ser publish ou rollback.');
if (!args.input || !args.output || !args['source-commit']) throw new Error('Use --input, --output e --source-commit.');
if (!/^[a-f0-9]{40}$/i.test(args['source-commit'])) throw new Error('O commit de origem deve ter 40 caracteres hexadecimais.');

const input = JSON.parse(readFileSync(resolve(args.input), 'utf8'));
const groupId = first(input, [/^group$/i, /^groupId$/i, /^id$/i]);
if (!groupId || !/^[a-f0-9-]{16,}$/i.test(groupId)) throw new Error('O retorno do EAS não contém um group ID válido.');

const output = resolve(args.output);
mkdirSync(dirname(output), { recursive: true });
const record = {
  schemaVersion: '1.0',
  release: '0.11.0-rc.1',
  generatedBy: 'Tehkné Solutions',
  generatedAt: new Date().toISOString(),
  privacy: { containsPersonalData: false, containsClinicalData: false },
  action: args.action,
  runtimeVersion: '0.11.0',
  channel: 'rc-0-11',
  sourceCommit: args['source-commit'].toLowerCase(),
  sourceGroupId: args['source-group-id'] ?? null,
  groupId,
  status: 'captured',
};
writeFileSync(output, `${JSON.stringify(record, null, 2)}\n`, 'utf8');
console.log(`Metadados OTA (${args.action}) salvos em ${output}.`);
console.log(`Group ID: ${groupId}`);
console.log('Tehkné Solutions');
