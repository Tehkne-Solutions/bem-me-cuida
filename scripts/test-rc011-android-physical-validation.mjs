import assert from 'node:assert/strict';
import {
  applyAndroidPhysicalSession,
  assertSanitizedAndroidSession,
  createAndroidGateProposal,
  createAndroidHomologationReport,
  createAndroidPhysicalSession,
  parseAndroidSuiteResults,
} from './lib/rc011-android-physical-validation.mjs';

const sourceCommit = '0123456789abcdef0123456789abcdef01234567';
const buildId = '123e4567-e89b-42d3-a456-426614174000';
const checksum = 'a'.repeat(64);
const builds = {
  release: '0.11.0-rc.1',
  sourceCommit,
  platforms: {
    android: {
      status: 'captured',
      buildId,
      buildNumber: '11001',
      artifactSha256: checksum,
      artifactUrl: 'https://expo.dev/artifacts/example.apk',
    },
  },
};
const basePlan = {
  release: '0.11.0-rc.1',
  platform: 'android',
  status: 'pending-physical-validation',
  sourceCommit,
  build: { buildId, buildNumber: '11001', artifactSha256: checksum },
  devices: [
    { id: 'android-minimum', class: 'minimum-supported', formFactor: 'phone', memoryClass: 'low', required: true, status: 'pending', evidenceUrl: null },
    { id: 'android-mainstream', class: 'mainstream', formFactor: 'phone', memoryClass: 'standard', required: true, status: 'pending', evidenceUrl: null },
  ],
  suites: [
    { id: 'fresh-install', name: 'Instalação limpa', required: true, status: 'pending', evidenceUrl: null },
    { id: 'upgrade-010-011', name: 'Upgrade', required: true, status: 'pending', evidenceUrl: null },
    { id: 'privacy', name: 'Privacidade', required: true, status: 'pending', evidenceUrl: null },
  ],
  summary: { requiredDevices: 2, passedRequiredDevices: 0, requiredSuites: 3, passedRequiredSuites: 0 },
};
const baseMatrix = {
  release: '0.11.0-rc.1', generatedBy: 'Tehkné Solutions', privacy: { containsPersonalData: false, containsClinicalData: false },
  profiles: basePlan.devices.map((item) => ({ ...item, platform: 'android' })),
};
const baseTests = {
  release: '0.11.0-rc.1', generatedBy: 'Tehkné Solutions', privacy: { containsPersonalData: false, containsClinicalData: false },
  suites: basePlan.suites.map((item) => ({ ...item })),
};
const gateMap = {
  gates: [
    { gateKey: 'physical_device', sourceType: 'device-matrix', sourceIds: [], required: true },
    { gateKey: 'rc_build', sourceType: 'suite', sourceIds: ['fresh-install', 'upgrade-010-011'], required: true },
    { gateKey: 'privacy', sourceType: 'suite', sourceIds: ['privacy'], required: true },
  ],
};

assert.deepEqual(parseAndroidSuiteResults('fresh-install=passed,privacy=failed', ['fresh-install', 'privacy']), [
  { id: 'fresh-install', status: 'passed' },
  { id: 'privacy', status: 'failed' },
]);
assert.throws(() => parseAndroidSuiteResults('unknown=passed', ['fresh-install']), /não prevista/);
assert.throws(() => parseAndroidSuiteResults('fresh-install=passed,fresh-install=failed', ['fresh-install']), /duplicada/);

const first = createAndroidPhysicalSession({
  builds,
  plan: basePlan,
  sourceCommit,
  buildId,
  profileId: 'android-minimum',
  deviceStatus: 'passed',
  installationMode: 'fresh',
  osVersion: '10',
  suiteResults: 'fresh-install=passed,privacy=passed',
  evidenceUrl: 'https://github.com/Tehkne-Solutions/bem-me-cuida/actions/runs/100',
  sessionId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  capturedAt: '2026-07-26T20:00:00.000Z',
});
assert.equal(first.privacy.containsDeviceIdentifiers, false);
assert.equal(first.controls.automaticApproval, false);

const firstApplied = applyAndroidPhysicalSession({ plan: basePlan, deviceMatrix: baseMatrix, testResults: baseTests, session: first });
assert.equal(firstApplied.plan.status, 'in-progress');
assert.equal(firstApplied.deviceMatrix.profiles[0].status, 'passed');
assert.equal(firstApplied.testResults.suites.find((item) => item.id === 'fresh-install').status, 'pending');
assert.equal(firstApplied.testResults.suites.find((item) => item.id === 'fresh-install').platformResults.android.status, 'passed');

const failed = createAndroidPhysicalSession({
  builds,
  plan: firstApplied.plan,
  sourceCommit,
  buildId,
  profileId: 'android-mainstream',
  deviceStatus: 'failed',
  installationMode: 'upgrade',
  osVersion: '14',
  suiteResults: 'upgrade-010-011=failed',
  evidenceUrl: 'https://github.com/Tehkne-Solutions/bem-me-cuida/actions/runs/101',
  sessionId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
  capturedAt: '2026-07-26T21:00:00.000Z',
});
const failedApplied = applyAndroidPhysicalSession({
  plan: firstApplied.plan,
  deviceMatrix: firstApplied.deviceMatrix,
  testResults: firstApplied.testResults,
  session: failed,
});
assert.equal(failedApplied.plan.status, 'retest-required');
assert.equal(failedApplied.plan.retests.length, 2);
assert.equal(failedApplied.testResults.suites.find((item) => item.id === 'upgrade-010-011').status, 'failed');

const retest = createAndroidPhysicalSession({
  builds,
  plan: failedApplied.plan,
  sourceCommit,
  buildId,
  profileId: 'android-mainstream',
  deviceStatus: 'passed',
  installationMode: 'retest',
  osVersion: '14',
  suiteResults: 'upgrade-010-011=passed',
  evidenceUrl: 'https://github.com/Tehkne-Solutions/bem-me-cuida/actions/runs/102',
  sessionId: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
  capturedAt: '2026-07-26T22:00:00.000Z',
});
const retestApplied = applyAndroidPhysicalSession({
  plan: failedApplied.plan,
  deviceMatrix: failedApplied.deviceMatrix,
  testResults: failedApplied.testResults,
  session: retest,
});
assert.equal(retestApplied.plan.status, 'ready-for-review');
assert.equal(retestApplied.plan.summary.passedRequiredDevices, 2);
assert.equal(retestApplied.plan.summary.passedRequiredSuites, 3);
assert.equal(retestApplied.testResults.suites.find((item) => item.id === 'upgrade-010-011').status, 'pending');

const duplicate = applyAndroidPhysicalSession({
  plan: retestApplied.plan,
  deviceMatrix: retestApplied.deviceMatrix,
  testResults: retestApplied.testResults,
  session: retest,
});
assert.equal(duplicate.duplicate, true);
assert.equal(duplicate.plan.sessions.length, 3);

const proposal = createAndroidGateProposal({ plan: retestApplied.plan, gateMap });
assert.equal(proposal.readyForAndroidReview, true);
assert.equal(proposal.controls.automaticApproval, false);
const report = createAndroidHomologationReport({ plan: retestApplied.plan, proposal });
assert.equal(report.globalApprovalChanged, false);
assert.equal(report.sessionCount, 3);

const unsafe = structuredClone(first);
unsafe.device.osVersion = 'tester@example.com';
assert.throws(() => assertSanitizedAndroidSession(unsafe), /e-mail/);
assert.throws(() => createAndroidPhysicalSession({ ...first, builds, plan: basePlan, sourceCommit: 'f'.repeat(40) }), /commit/);

console.log('Sessões físicas Android, falhas, retestes e gates revisáveis aprovados.');
console.log('Tehkné Solutions');
