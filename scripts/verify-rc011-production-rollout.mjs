import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createFinalRcDecision } from './lib/rc011-ota-final-validation.mjs';
import { ROLLOUT_STAGES, assertBaseDocument, evaluateStoreReadiness, validateAttestations, validateProductionArtifacts } from './lib/rc011-production-rollout.mjs';

const mode = process.argv[2] ?? 'structure';
if (!['structure', 'build', 'submission', 'rollout'].includes(mode)) throw new Error('Modo inválido. Use structure, build, submission ou rollout.');
const readJson = (path) => JSON.parse(readFileSync(resolve(path), 'utf8'));
const paths = {
  attestations: 'release/rc-0.11.0/final-attestations.json', environment: 'release/rc-0.11.0/production-environment.json',
  artifacts: 'release/rc-0.11.0/production-artifacts.json', store: 'release/rc-0.11.0/store-submission-readiness.json',
  rollout: 'release/rc-0.11.0/production-rollout.json', publication: 'release/rc-0.11.0/release-publication.json',
};
const failures = [];
for (const path of Object.values(paths)) if (!existsSync(path)) failures.push(`Arquivo ausente: ${path}`);
if (failures.length) { console.error('Produção RC 0.11 reprovada:'); failures.forEach((item) => console.error(`- ${item}`)); process.exit(1); }
const attestations = readJson(paths.attestations); const environment = readJson(paths.environment); const artifacts = readJson(paths.artifacts);
const store = readJson(paths.store); const rollout = readJson(paths.rollout); const publication = readJson(paths.publication);
for (const [label, document] of Object.entries({ attestations, environment, artifacts, store, rollout, publication })) {
  try { assertBaseDocument(document, label); } catch (error) { failures.push(error.message); }
}
if (environment.environment !== 'production-release') failures.push('Environment protegido deve ser production-release.');
if (artifacts.platforms?.android?.package !== 'com.tehknesolutions.bemmecuida') failures.push('Package Android oficial divergente.');
if (artifacts.platforms?.ios?.bundleIdentifier !== 'com.tehknesolutions.bemmecuida') failures.push('Bundle iOS oficial divergente.');
if (JSON.stringify(rollout.stages.map((item) => item.percentage)) !== JSON.stringify(ROLLOUT_STAGES)) failures.push('Sequência de rollout divergente.');
for (const value of Object.values(rollout.thresholds ?? {})) if (!Number.isFinite(value)) failures.push('Threshold de rollout inválido.');
if (publication.tag !== 'v0.11.0') failures.push('Tag de publicação divergente.');
if ((store.documents ?? []).some((path) => !existsSync(path))) failures.push('Pacote editorial referencia documento ausente.');

if (mode !== 'structure') {
  const finalRc = createFinalRcDecision({
    infrastructure: readJson('release/rc-0.11.0/infrastructure-readiness.json'), builds: readJson('release/rc-0.11.0/builds.json'),
    deviceMatrix: readJson('release/rc-0.11.0/device-matrix.json'), testResults: readJson('release/rc-0.11.0/test-results.json'),
    androidPlan: readJson('release/rc-0.11.0/android-homologation-plan.json'), iosPlan: readJson('release/rc-0.11.0/ios-homologation-plan.json'),
    ota: readJson('release/rc-0.11.0/ota-validation.json'), otaDeviceValidation: readJson('release/rc-0.11.0/ota-device-validation.json'),
  });
  if (finalRc.recommendation !== 'promote') failures.push('A candidata ainda não possui recomendação final de promoção.');
  failures.push(...validateAttestations(attestations));
  if (environment.status !== 'ready') failures.push('Environment de produção ainda não está pronto.');
  for (const [name, value] of Object.entries(environment.checks ?? {})) if (value !== true) failures.push(`Environment sem check: ${name}.`);
  if (!environment.evidenceUrl?.startsWith('https://')) failures.push('Environment sem evidência HTTPS.');
  if (publication.githubRelease?.status !== 'draft') failures.push('Release GitHub em rascunho ainda não foi registrada.');
}
if (mode === 'submission' || mode === 'rollout') failures.push(...validateProductionArtifacts(artifacts), ...evaluateStoreReadiness(store, artifacts, attestations));
if (mode === 'rollout') {
  for (const [platform, item] of Object.entries(store.platforms ?? {})) if (item.status !== 'approved') failures.push(`Loja ${platform} ainda não aprovou a versão.`);
}
if (failures.length) {
  console.error(`Produção RC 0.11 reprovada no modo ${mode}:`);
  [...new Set(failures)].forEach((item) => console.error(`- ${item}`));
  process.exit(1);
}
console.log(`Produção RC 0.11 aprovada no modo ${mode}.`);
console.log('Nenhuma operação externa foi executada pelo verificador.');
console.log('Tehkné Solutions');
