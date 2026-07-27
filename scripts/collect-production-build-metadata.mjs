import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { basename, dirname, resolve } from 'node:path';

function argsMap(values) {
  const result = {};
  for (let index = 0; index < values.length; index += 2) {
    const key = values[index]; const value = values[index + 1];
    if (!key?.startsWith('--') || value === undefined) throw new Error(`Argumento inválido próximo de ${key ?? 'fim'}.`);
    result[key.slice(2)] = value;
  }
  return result;
}
function readJson(path) { return JSON.parse(readFileSync(resolve(path), 'utf8')); }
function collect(value, pattern, output = []) {
  if (Array.isArray(value)) { for (const item of value) collect(item, pattern, output); return output; }
  if (!value || typeof value !== 'object') return output;
  for (const [key, item] of Object.entries(value)) {
    if (pattern.test(key) && (typeof item === 'string' || typeof item === 'number')) output.push(String(item));
    collect(item, pattern, output);
  }
  return output;
}
function first(value, patterns) { for (const pattern of patterns) { const found = collect(value, pattern)[0]; if (found) return found; } return null; }
function findArtifact(download, explicit) {
  for (const candidate of [explicit, ...collect(download, /^(path|filePath|artifactPath|outputPath|localPath)$/i)].filter(Boolean)) {
    const path = resolve(candidate); if (existsSync(path) && statSync(path).isFile()) return path;
  }
  return null;
}
const args = argsMap(process.argv.slice(2));
if (!['android', 'ios'].includes(args.platform)) throw new Error('--platform deve ser android ou ios.');
for (const key of ['view', 'download', 'output', 'source-commit']) if (!args[key]) throw new Error(`--${key} é obrigatório.`);
if (!/^[a-f0-9]{40}$/i.test(args['source-commit'])) throw new Error('Commit de origem inválido.');
const view = readJson(args.view); const download = readJson(args.download); const artifactPath = findArtifact(download, args.artifact);
if (!artifactPath) throw new Error('Artefato de produção não localizado para cálculo do SHA-256.');
const buildId = first(view, [/^id$/i, /^buildId$/i]);
const status = first(view, [/^status$/i]);
const platform = first(view, [/^platform$/i]);
const appVersion = first(view, [/^appVersion$/i, /^version$/i]);
const buildNumber = first(view, [/^appBuildVersion$/i, /^versionCode$/i, /^buildNumber$/i]);
const identifier = first(view, [/^applicationIdentifier$/i, /^package$/i, /^bundleIdentifier$/i]);
const expectedIdentifier = args.platform === 'android' ? 'com.tehknesolutions.bemmecuida' : 'com.tehknesolutions.bemmecuida';
const artifactUrl = view?.artifacts?.buildUrl ?? view?.artifactUrl ?? first(view, [/^buildUrl$/i, /^artifactUrl$/i]);
if (!buildId) throw new Error('Build ID ausente.');
if (status && !['FINISHED', 'finished', 'complete', 'completed'].includes(status)) throw new Error(`Build ainda não concluído: ${status}.`);
if (platform && platform.toLowerCase() !== args.platform) throw new Error('Plataforma divergente.');
if (appVersion && appVersion !== '0.11.0') throw new Error(`Versão divergente: ${appVersion}.`);
if (identifier && identifier !== expectedIdentifier) throw new Error(`Identificador de produção divergente: ${identifier}.`);
if (!artifactUrl?.startsWith('https://')) throw new Error('URL HTTPS do artefato ausente.');
const sha256 = createHash('sha256').update(readFileSync(artifactPath)).digest('hex');
const record = {
  schemaVersion: '1.0', release: '0.11.0', candidate: '0.11.0-rc.1', generatedBy: 'Tehkné Solutions', generatedAt: new Date().toISOString(),
  privacy: { containsPersonalData: false, containsClinicalData: false },
  sourceCommit: args['source-commit'].toLowerCase(), platform: args.platform, status: 'captured', buildId, buildNumber,
  appVersion: appVersion ?? '0.11.0', applicationIdentifier: identifier ?? expectedIdentifier,
  artifactFileName: basename(artifactPath), artifactSizeBytes: statSync(artifactPath).size, artifactUrl, artifactSha256: sha256,
};
const output = resolve(args.output); mkdirSync(dirname(output), { recursive: true }); writeFileSync(output, `${JSON.stringify(record, null, 2)}\n`, 'utf8');
console.log(`Build oficial ${args.platform} capturado em ${output}.`);
console.log(`SHA-256: ${sha256}`);
console.log('Tehkné Solutions');
