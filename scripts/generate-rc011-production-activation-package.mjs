import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { createFinalRcDecision } from './lib/rc011-ota-final-validation.mjs';
import { assertBaseDocument, evaluateStoreReadiness, validateAttestations, validateProductionArtifacts } from './lib/rc011-production-rollout.mjs';

const readJson = (path) => JSON.parse(readFileSync(resolve(path), 'utf8'));
const hashFile = (path) => createHash('sha256').update(readFileSync(resolve(path))).digest('hex');
const infrastructure = readJson(process.env.RC011_INFRASTRUCTURE_PATH ?? 'release/rc-0.11.0/infrastructure-readiness.json');
const builds = readJson(process.env.RC011_BUILDS_PATH ?? 'release/rc-0.11.0/builds.json');
const deviceMatrix = readJson(process.env.RC011_DEVICE_MATRIX_PATH ?? 'release/rc-0.11.0/device-matrix.json');
const testResults = readJson(process.env.RC011_TEST_RESULTS_PATH ?? 'release/rc-0.11.0/test-results.json');
const androidPlan = readJson(process.env.RC011_ANDROID_PLAN_PATH ?? 'release/rc-0.11.0/android-homologation-plan.json');
const iosPlan = readJson(process.env.RC011_IOS_PLAN_PATH ?? 'release/rc-0.11.0/ios-homologation-plan.json');
const ota = readJson(process.env.RC011_OTA_VALIDATION_PATH ?? 'release/rc-0.11.0/ota-validation.json');
const otaDeviceValidation = readJson(process.env.RC011_OTA_DEVICE_VALIDATION_PATH ?? 'release/rc-0.11.0/ota-device-validation.json');
const attestations = readJson(process.env.RC011_ATTESTATIONS_PATH ?? 'release/rc-0.11.0/final-attestations.json');
const productionArtifacts = readJson(process.env.RC011_PRODUCTION_ARTIFACTS_PATH ?? 'release/rc-0.11.0/production-artifacts.json');
const productionEnvironment = readJson(process.env.RC011_PRODUCTION_ENVIRONMENT_PATH ?? 'release/rc-0.11.0/production-environment.json');
const store = readJson(process.env.RC011_STORE_READINESS_PATH ?? 'release/rc-0.11.0/store-submission-readiness.json');
const rollout = readJson(process.env.RC011_ROLLOUT_PATH ?? 'release/rc-0.11.0/production-rollout.json');
const publication = readJson(process.env.RC011_RELEASE_PUBLICATION_PATH ?? 'release/rc-0.11.0/release-publication.json');

for (const [label, document] of Object.entries({ attestations, productionArtifacts, productionEnvironment, store, rollout, publication })) assertBaseDocument(document, label);
const finalRc = createFinalRcDecision({ infrastructure, builds, deviceMatrix, testResults, androidPlan, iosPlan, ota, otaDeviceValidation });
const blockers = [];
if (finalRc.recommendation !== 'promote') blockers.push(...finalRc.blockers.map((item) => `rc:${item}`));
const attestationBlockers = validateAttestations(attestations);
const artifactBlockers = validateProductionArtifacts(productionArtifacts);
const environmentBlockers = [];
if (productionEnvironment.status !== 'ready') environmentBlockers.push(`production_environment_${productionEnvironment.status}`);
for (const [name, value] of Object.entries(productionEnvironment.checks ?? {})) if (value !== true) environmentBlockers.push(`production_environment_${name}_pending`);
if (!productionEnvironment.evidenceUrl?.startsWith('https://')) environmentBlockers.push('production_environment_evidence_missing');
const storeBlockers = evaluateStoreReadiness(store, productionArtifacts, attestations);

let recommendation = 'hold';
if (finalRc.recommendation === 'promote') {
  if (attestationBlockers.length) recommendation = 'await-final-attestations';
  else if (environmentBlockers.length) recommendation = 'await-production-environment';
  else if (publication.githubRelease?.status === 'pending') recommendation = 'ready-to-create-draft-release';
  else if (artifactBlockers.length) recommendation = 'ready-for-production-builds';
  else if (storeBlockers.some((item) => item.startsWith('store_'))) recommendation = 'await-store-metadata';
  else {
    const storeStatuses = Object.values(store.platforms ?? {}).map((item) => item.status);
    if (storeStatuses.some((status) => status === 'rejected' || status === 'blocked')) recommendation = 'hold';
    else if (storeStatuses.some((status) => status === 'pending')) recommendation = 'ready-for-store-submission';
    else if (storeStatuses.some((status) => status !== 'approved')) recommendation = 'await-store-approval';
    else if (rollout.status === 'pause-required' || rollout.pause?.status === 'required') recommendation = 'pause-rollout';
    else if (rollout.rollback?.status === 'requested') recommendation = 'rollback-production';
    else if (rollout.status === 'completed') recommendation = 'release-complete';
    else if (rollout.currentStage === null) recommendation = 'ready-for-rollout-1';
    else if (rollout.status === 'ready-for-next-stage') recommendation = 'ready-for-next-rollout-stage';
    else recommendation = 'hold';
  }
}

if (recommendation === 'hold') blockers.push(...attestationBlockers, ...environmentBlockers, ...artifactBlockers, ...storeBlockers);
const documents = [...new Set(store.documents ?? [])].map((path) => ({ path, exists: existsSync(resolve(path)), sha256: existsSync(resolve(path)) ? hashFile(path) : null }));
for (const item of documents) if (!item.exists) blockers.push(`document_missing:${item.path}`);

const payload = {
  schemaVersion: '1.0', product: 'BemMeCuida', release: '0.11.0', candidate: '0.11.0-rc.1', generatedBy: 'Tehkné Solutions', generatedAt: new Date().toISOString(),
  privacy: { containsPersonalData: false, containsClinicalData: false },
  recommendation, blockerCount: [...new Set(blockers)].length, blockers: [...new Set(blockers)],
  finalRc: { recommendation: finalRc.recommendation, blockerCount: finalRc.blockerCount },
  attestations: { status: attestations.status, approved: Object.values(attestations.attestations ?? {}).filter((item) => item.status === 'approved').length, required: 3 },
  productionEnvironment: { status: productionEnvironment.status, environment: productionEnvironment.environment },
  publication: { status: publication.githubRelease?.status ?? 'pending', tag: publication.tag },
  productionArtifacts: { status: productionArtifacts.status, captured: Object.values(productionArtifacts.platforms ?? {}).filter((item) => item.status === 'captured').length, required: 2 },
  stores: Object.fromEntries(Object.entries(store.platforms ?? {}).map(([platform, value]) => [platform, value.status])),
  rollout: { status: rollout.status, currentStage: rollout.currentStage, stagesPassed: rollout.stages.filter((stage) => stage.status === 'passed').length, stagesTotal: rollout.stages.length },
  documents,
  controls: {
    requiresIndependentHumanApproval: true,
    requiresProtectedProductionEnvironment: true,
    requiresPrReviewedEvidence: true,
    doesNotBuildSubmitPublishOrAdvance: true,
    serverRemainsAuthority: true
  }
};
const jsonOutput = resolve(process.env.RC011_PRODUCTION_PACKAGE_OUTPUT ?? 'artifacts/bemmecuida-0.11.0-production-activation.json');
const markdownOutput = resolve(process.env.RC011_PRODUCTION_PACKAGE_MARKDOWN_OUTPUT ?? 'artifacts/bemmecuida-0.11.0-production-activation.md');
mkdirSync(dirname(jsonOutput), { recursive: true });
mkdirSync(dirname(markdownOutput), { recursive: true });
writeFileSync(jsonOutput, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
const markdown = [
  '# BemMeCuida 0.11.0 — ativação de produção', '',
  `- Recomendação: **${recommendation}**`,
  `- Bloqueadores: ${payload.blockerCount}`,
  `- Atestações: ${payload.attestations.approved}/${payload.attestations.required}`,
  `- Environment: ${payload.productionEnvironment.status}`,
  `- Artefatos oficiais: ${payload.productionArtifacts.captured}/${payload.productionArtifacts.required}`,
  `- Google Play: ${payload.stores.android}`,
  `- App Store: ${payload.stores.ios}`,
  `- Rollout: ${payload.rollout.status} (${payload.rollout.stagesPassed}/${payload.rollout.stagesTotal})`, '',
  '## Bloqueadores', '', ...(payload.blockers.length ? payload.blockers.map((item) => `- ${item}`) : ['- Nenhum bloqueador registrado.']), '',
  '> O pacote não cria build, submissão, release ou avanço de rollout. Toda ação externa exige aprovação humana e environment protegido.', '',
  '**Tehkné Solutions**', ''
].join('\n');
writeFileSync(markdownOutput, markdown, 'utf8');
console.log(`Pacote de ativação salvo em ${jsonOutput} e ${markdownOutput}.`);
console.log(`Recomendação: ${recommendation}.`);
console.log('Tehkné Solutions');
