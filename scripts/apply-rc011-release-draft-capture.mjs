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
const source = readJson(args.source ?? 'release/rc-0.11.0/release-publication.json');
const capture = readJson(args.capture);
if (capture.release !== '0.11.0' || capture.candidate !== '0.11.0-rc.1' || capture.status !== 'captured') throw new Error('Captura da release inválida.');
if (capture.tag !== 'v0.11.0' || !capture.releaseUrl?.startsWith('https://')) throw new Error('Tag ou URL da release inválida.');
if (!/^[a-f0-9]{40}$/i.test(capture.sourceCommit ?? '')) throw new Error('Commit da release inválido.');
source.sourceCommit = capture.sourceCommit;
source.status = 'draft';
source.githubRelease = {
  status: 'draft', draft: true, releaseUrl: capture.releaseUrl, evidenceUrl: args['evidence-url'] ?? capture.releaseUrl,
  createdAt: capture.generatedAt, publishedAt: null,
};
source.updatedAt = new Date().toISOString();
const output = resolve(args.output); mkdirSync(dirname(output), { recursive: true }); writeFileSync(output, `${JSON.stringify(source, null, 2)}\n`, 'utf8');
console.log(`Rascunho da release aplicado em ${output}.`);
console.log('A release permanece não publicada.');
console.log('Tehkné Solutions');
