import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const readJson = (path) => JSON.parse(readFileSync(resolve(path), 'utf8'));
const builds = readJson(process.env.RC011_BUILDS_PATH ?? 'release/rc-0.11.0/builds.json');
const ota = readJson(process.env.RC011_OTA_VALIDATION_PATH ?? 'release/rc-0.11.0/ota-validation.json');
const matrix = readJson(process.env.RC011_DEVICE_MATRIX_PATH ?? 'release/rc-0.11.0/device-matrix.json');
const tests = readJson(process.env.RC011_TEST_RESULTS_PATH ?? 'release/rc-0.11.0/test-results.json');
const blockers = [];

for (const platform of ['android', 'ios']) {
  const item = builds.platforms?.[platform];
  if (item?.status !== 'captured') blockers.push(`build_${platform}_pending`);
  if (!item?.artifactSha256) blockers.push(`checksum_${platform}_missing`);
}
for (const profile of matrix.profiles?.filter((item) => item.required) ?? []) {
  if (profile.status !== 'passed') blockers.push(`device_${profile.id}_${profile.status}`);
  if (!profile.evidenceUrl?.startsWith('https://')) blockers.push(`device_${profile.id}_evidence_missing`);
}
for (const suite of tests.suites?.filter((item) => item.required) ?? []) {
  if (suite.status !== 'passed') blockers.push(`suite_${suite.id}_${suite.status}`);
  if (!suite.evidenceUrl?.startsWith('https://')) blockers.push(`suite_${suite.id}_evidence_missing`);
}
if (ota.publish?.status !== 'passed') blockers.push('ota_publish_not_approved');
if (ota.rollback?.status !== 'passed') blockers.push('ota_rollback_not_approved');

const payload = {
  schemaVersion: '1.0',
  product: 'BemMeCuida',
  release: '0.11.0-rc.1',
  generatedBy: 'Tehkné Solutions',
  generatedAt: new Date().toISOString(),
  privacy: { containsPersonalData: false, containsClinicalData: false },
  recommendation: blockers.length === 0 ? 'promote' : 'hold',
  blockerCount: blockers.length,
  blockers,
  summary: {
    buildsCaptured: Object.values(builds.platforms ?? {}).filter((item) => item.status === 'captured').length,
    requiredDevicesPassed: (matrix.profiles ?? []).filter((item) => item.required && item.status === 'passed').length,
    requiredDevicesTotal: (matrix.profiles ?? []).filter((item) => item.required).length,
    requiredSuitesPassed: (tests.suites ?? []).filter((item) => item.required && item.status === 'passed').length,
    requiredSuitesTotal: (tests.suites ?? []).filter((item) => item.required).length,
    otaPublishStatus: ota.publish?.status ?? 'pending',
    otaRollbackStatus: ota.rollback?.status ?? 'pending',
  },
  controls: {
    serverRemainsAuthority: true,
    requiresIndependentGateApproval: true,
    doesNotMutateReleaseState: true,
  },
};

const jsonOutput = resolve(process.env.RC011_DECISION_PACKAGE_OUTPUT ?? 'artifacts/bemmecuida-0.11.0-rc.1-decision.json');
const markdownOutput = resolve(process.env.RC011_DECISION_PACKAGE_MARKDOWN_OUTPUT ?? 'artifacts/bemmecuida-0.11.0-rc.1-decision.md');
mkdirSync(dirname(jsonOutput), { recursive: true });
mkdirSync(dirname(markdownOutput), { recursive: true });
writeFileSync(jsonOutput, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
const markdown = [
  '# BemMeCuida 0.11.0-rc.1 — decisão de homologação',
  '',
  `- Recomendação: **${payload.recommendation === 'promote' ? 'PROMOVER' : 'MANTER BLOQUEADA'}**`,
  `- Bloqueadores: ${payload.blockerCount}`,
  `- Builds capturados: ${payload.summary.buildsCaptured}/2`,
  `- Aparelhos obrigatórios aprovados: ${payload.summary.requiredDevicesPassed}/${payload.summary.requiredDevicesTotal}`,
  `- Suítes obrigatórias aprovadas: ${payload.summary.requiredSuitesPassed}/${payload.summary.requiredSuitesTotal}`,
  `- OTA: ${payload.summary.otaPublishStatus}`,
  `- Rollback OTA: ${payload.summary.otaRollbackStatus}`,
  '',
  '## Bloqueadores',
  '',
  ...(blockers.length ? blockers.map((item) => `- ${item}`) : ['- Nenhum.']),
  '',
  '> Documento técnico agregado. Não contém dados pessoais ou clínicos.',
  '',
  '**Tehkné Solutions**',
  '',
].join('\n');
writeFileSync(markdownOutput, markdown, 'utf8');
console.log(`Pacote de decisão salvo em ${jsonOutput} e ${markdownOutput}.`);
console.log(`Recomendação: ${payload.recommendation}.`);
console.log('Tehkné Solutions');
