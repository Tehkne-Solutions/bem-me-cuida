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
const readJson = (path) => JSON.parse(readFileSync(resolve(path), 'utf8'));
const save = (path, value) => { const output = resolve(path); mkdirSync(dirname(output), { recursive: true }); writeFileSync(output, `${JSON.stringify(value, null, 2)}\n`, 'utf8'); return output; };
const args = argsMap(process.argv.slice(2));
if (!args.capture || !args['ota-output'] || !args['validation-output']) throw new Error('Use --capture, --ota-output e --validation-output.');
const capture = readJson(args.capture);
const ota = readJson(args['ota-source'] ?? 'release/rc-0.11.0/ota-validation.json');
const validation = readJson(args['validation-source'] ?? 'release/rc-0.11.0/ota-device-validation.json');
if (capture.release !== '0.11.0-rc.1' || capture.status !== 'captured' || !['publish', 'rollback'].includes(capture.action)) throw new Error('Captura OTA inválida.');
if (capture.runtimeVersion !== '0.11.0' || capture.channel !== 'rc-0-11') throw new Error('Runtime ou canal divergente.');
if (!/^[a-f0-9]{40}$/i.test(capture.sourceCommit ?? '') || !/^[a-f0-9-]{16,}$/i.test(capture.groupId ?? '')) throw new Error('Commit ou Group ID inválido.');
const evidenceUrl = args['evidence-url'] ?? null;
if (evidenceUrl && !String(evidenceUrl).startsWith('https://')) throw new Error('A evidência deve usar HTTPS.');
if (capture.action === 'publish') {
  if (ota.publish?.groupId && ota.publish.groupId !== capture.groupId) throw new Error('Já existe outro grupo de publicação registrado.');
  ota.publish = { ...(ota.publish ?? {}), status: 'captured', groupId: capture.groupId, sourceCommit: capture.sourceCommit, publishedAt: capture.generatedAt, evidenceUrl };
  validation.actions.publish.groupId = capture.groupId;
  validation.actions.publish.status = validation.actions.publish.status === 'passed' ? 'passed' : 'pending-physical-validation';
  validation.status = 'in-progress';
} else {
  if (ota.rollback?.rollbackGroupId && ota.rollback.rollbackGroupId !== capture.groupId) throw new Error('Já existe outro grupo de rollback registrado.');
  ota.rollback = { ...(ota.rollback ?? {}), status: 'captured', sourceGroupId: capture.sourceGroupId, rollbackGroupId: capture.groupId, sourceCommit: capture.sourceCommit, validatedAt: capture.generatedAt, evidenceUrl };
  validation.actions.rollback.groupId = capture.groupId;
  validation.actions.rollback.status = validation.actions.rollback.status === 'passed' ? 'passed' : 'pending-physical-validation';
  validation.status = 'in-progress';
}
ota.updatedAt = new Date().toISOString();
validation.updatedAt = new Date().toISOString();
console.log(`Registro OTA salvo em ${save(args['ota-output'], ota)}.`);
console.log(`Registro físico OTA salvo em ${save(args['validation-output'], validation)}.`);
console.log('Nenhum gate foi aprovado automaticamente.');
console.log('Tehkné Solutions');
