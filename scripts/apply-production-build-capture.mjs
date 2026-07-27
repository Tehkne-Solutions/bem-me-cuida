import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

function argsMap(values) {
  const result = {};
  for (let index = 0; index < values.length; index += 2) {
    const key = values[index]; const value = values[index + 1];
    if (!key?.startsWith('--') || value === undefined) throw new Error(`Argumento inválido próximo de ${key ?? 'fim'}.`);
    result[key.slice(2)] = value;
  }
  return result;
}
const args = argsMap(process.argv.slice(2));
if (!args.capture || !args.output) throw new Error('Use --capture e --output.');
const readJson = (path) => JSON.parse(readFileSync(resolve(path), 'utf8'));
const source = readJson(args.source ?? 'release/rc-0.11.0/production-artifacts.json');
const capture = readJson(args.capture);
if (capture.release !== '0.11.0' || capture.candidate !== '0.11.0-rc.1' || capture.status !== 'captured') throw new Error('Captura de produção inválida.');
if (!['android', 'ios'].includes(capture.platform)) throw new Error('Plataforma inválida.');
if (!/^[a-f0-9]{40}$/i.test(capture.sourceCommit ?? '')) throw new Error('Commit inválido.');
if (!/^[a-f0-9]{64}$/i.test(capture.artifactSha256 ?? '')) throw new Error('SHA-256 inválido.');
if (!capture.artifactUrl?.startsWith('https://')) throw new Error('URL HTTPS do artefato ausente.');
if (source.sourceCommit && source.sourceCommit !== capture.sourceCommit) throw new Error('Os builds oficiais pertencem a commits diferentes.');
const expected = capture.platform === 'android' ? 'com.tehknesolutions.bemmecuida' : 'com.tehknesolutions.bemmecuida';
if (capture.applicationIdentifier !== expected) throw new Error('Identificador oficial divergente.');
source.sourceCommit = capture.sourceCommit;
source.platforms[capture.platform] = {
  ...source.platforms[capture.platform], status: 'captured', buildId: capture.buildId, buildNumber: capture.buildNumber,
  artifactUrl: capture.artifactUrl, artifactSha256: capture.artifactSha256, artifactSizeBytes: capture.artifactSizeBytes,
  capturedAt: capture.generatedAt, evidenceUrl: args['evidence-url'] ?? null,
};
if (args['evidence-url'] && !args['evidence-url'].startsWith('https://')) throw new Error('Evidência deve usar HTTPS.');
source.status = Object.values(source.platforms).every((item) => item.status === 'captured') ? 'captured' : 'partially-captured';
source.updatedAt = new Date().toISOString();
const output = resolve(args.output); mkdirSync(dirname(output), { recursive: true }); writeFileSync(output, `${JSON.stringify(source, null, 2)}\n`, 'utf8');
console.log(`Artefato oficial ${capture.platform} aplicado em ${output}.`);
console.log('A alteração permanece sujeita a revisão por PR.');
console.log('Tehkné Solutions');
