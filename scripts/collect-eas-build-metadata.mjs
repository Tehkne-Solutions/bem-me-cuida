import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { basename, dirname, resolve } from 'node:path';

function argumentsMap(values) {
  const result = {};
  for (let index = 0; index < values.length; index += 2) {
    const key = values[index];
    const value = values[index + 1];
    if (!key?.startsWith('--') || value === undefined) throw new Error(`Argumento inválido próximo de ${key ?? 'fim'}.`);
    result[key.slice(2)] = value;
  }
  return result;
}

function readJson(path) {
  return JSON.parse(readFileSync(resolve(path), 'utf8'));
}

function collectValues(value, keyPattern, output = []) {
  if (Array.isArray(value)) {
    for (const item of value) collectValues(item, keyPattern, output);
    return output;
  }
  if (!value || typeof value !== 'object') return output;
  for (const [key, item] of Object.entries(value)) {
    if (keyPattern.test(key) && (typeof item === 'string' || typeof item === 'number')) output.push(String(item));
    collectValues(item, keyPattern, output);
  }
  return output;
}

function firstValue(value, patterns) {
  for (const pattern of patterns) {
    const match = collectValues(value, pattern)[0];
    if (match) return match;
  }
  return null;
}

function findArtifactPath(downloadJson, explicitPath) {
  const candidates = [
    explicitPath,
    ...collectValues(downloadJson, /^(path|filePath|artifactPath|outputPath|localPath)$/i),
  ].filter(Boolean);
  for (const candidate of candidates) {
    const absolute = resolve(candidate);
    if (existsSync(absolute) && statSync(absolute).isFile()) return absolute;
  }
  return null;
}

function sha256(path) {
  const hash = createHash('sha256');
  hash.update(readFileSync(path));
  return hash.digest('hex');
}

const args = argumentsMap(process.argv.slice(2));
const platform = args.platform;
if (!['android', 'ios'].includes(platform)) throw new Error('--platform deve ser android ou ios.');
if (!args.view || !args.download || !args.output || !args['source-commit']) {
  throw new Error('Use --view, --download, --output e --source-commit.');
}
if (!/^[a-f0-9]{40}$/i.test(args['source-commit'])) throw new Error('O commit de origem deve ter 40 caracteres hexadecimais.');

const view = readJson(args.view);
const download = readJson(args.download);
const artifactPath = findArtifactPath(download, args.artifact);
if (!artifactPath) throw new Error('O arquivo baixado do EAS não foi localizado para cálculo do SHA-256.');

const buildId = firstValue(view, [/^id$/i, /^buildId$/i]);
const status = firstValue(view, [/^status$/i]);
const detectedPlatform = firstValue(view, [/^platform$/i]);
const appVersion = firstValue(view, [/^appVersion$/i, /^version$/i]);
const buildNumber = firstValue(view, [/^appBuildVersion$/i, /^versionCode$/i, /^buildNumber$/i]);
const artifactUrl = firstValue(view, [/^buildUrl$/i, /^artifactUrl$/i, /^url$/i]);

if (!buildId) throw new Error('Build ID ausente no retorno do EAS.');
if (status && !['FINISHED', 'finished', 'complete', 'completed'].includes(status)) {
  throw new Error(`O build ${buildId} ainda não está concluído: ${status}.`);
}
if (detectedPlatform && detectedPlatform.toLowerCase() !== platform) {
  throw new Error(`Plataforma divergente: esperado ${platform}, recebido ${detectedPlatform}.`);
}
if (appVersion && appVersion !== '0.11.0') throw new Error(`Versão divergente no build: ${appVersion}.`);
if (artifactUrl && !artifactUrl.startsWith('https://')) throw new Error('A URL do artefato deve usar HTTPS.');

const output = resolve(args.output);
mkdirSync(dirname(output), { recursive: true });
const captured = {
  schemaVersion: '1.0',
  release: '0.11.0-rc.1',
  generatedBy: 'Tehkné Solutions',
  generatedAt: new Date().toISOString(),
  sourceCommit: args['source-commit'].toLowerCase(),
  privacy: { containsPersonalData: false, containsClinicalData: false },
  platform,
  status: 'captured',
  buildId,
  buildNumber,
  appVersion: appVersion ?? '0.11.0',
  artifactFileName: basename(artifactPath),
  artifactSizeBytes: statSync(artifactPath).size,
  artifactUrl,
  artifactSha256: sha256(artifactPath),
};
writeFileSync(output, `${JSON.stringify(captured, null, 2)}\n`, 'utf8');
console.log(`Metadados do build ${platform} salvos em ${output}.`);
console.log(`SHA-256: ${captured.artifactSha256}`);
console.log('Tehkné Solutions');
