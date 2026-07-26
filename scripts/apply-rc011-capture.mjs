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

function readJson(path) {
  return JSON.parse(readFileSync(resolve(path), 'utf8'));
}

function save(path, value) {
  const output = resolve(path);
  mkdirSync(dirname(output), { recursive: true });
  writeFileSync(output, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
  return output;
}

const args = argsMap(process.argv.slice(2));
if (!['build', 'ota'].includes(args.kind)) throw new Error('--kind deve ser build ou ota.');
if (!args.capture || !args.output) throw new Error('Use --capture e --output.');
const capture = readJson(args.capture);
if (capture.release !== '0.11.0-rc.1' || capture.status !== 'captured') {
  throw new Error('A captura não corresponde à RC 0.11.0-rc.1 ou não está concluída.');
}
if (args['evidence-url'] && !args['evidence-url'].startsWith('https://')) {
  throw new Error('A URL da evidência deve usar HTTPS.');
}

if (args.kind === 'build') {
  const source = readJson(args.source ?? 'release/rc-0.11.0/builds.json');
  if (!['android', 'ios'].includes(capture.platform)) throw new Error('Plataforma da captura inválida.');
  if (!/^[a-f0-9]{64}$/i.test(capture.artifactSha256 ?? '')) throw new Error('SHA-256 da captura inválido.');
  source.sourceCommit = capture.sourceCommit;
  source.platforms[capture.platform] = {
    status: 'captured',
    buildId: capture.buildId,
    buildNumber: capture.buildNumber,
    artifactUrl: capture.artifactUrl,
    artifactSha256: capture.artifactSha256,
    artifactSizeBytes: capture.artifactSizeBytes,
    capturedAt: capture.generatedAt,
    evidenceUrl: args['evidence-url'] ?? null,
  };
  source.updatedAt = new Date().toISOString();
  console.log(`Registro de build atualizado em ${save(args.output, source)}.`);
} else {
  const source = readJson(args.source ?? 'release/rc-0.11.0/ota-validation.json');
  if (!['publish', 'rollback'].includes(capture.action)) throw new Error('Ação OTA inválida.');
  if (capture.runtimeVersion !== '0.11.0' || capture.channel !== 'rc-0-11') {
    throw new Error('Runtime ou canal da captura OTA divergente.');
  }
  if (capture.action === 'publish') {
    source.publish = {
      status: 'captured',
      groupId: capture.groupId,
      sourceCommit: capture.sourceCommit,
      publishedAt: capture.generatedAt,
      evidenceUrl: args['evidence-url'] ?? null,
    };
  } else {
    source.rollback = {
      status: 'captured',
      sourceGroupId: capture.sourceGroupId,
      rollbackGroupId: capture.groupId,
      validatedAt: capture.generatedAt,
      evidenceUrl: args['evidence-url'] ?? null,
    };
  }
  source.updatedAt = new Date().toISOString();
  console.log(`Registro OTA atualizado em ${save(args.output, source)}.`);
}
console.log('O resultado deve ser revisado e versionado por PR.');
console.log('Tehkné Solutions');
