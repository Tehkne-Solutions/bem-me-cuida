import assert from 'node:assert/strict';
import { discoverIosBuilds, selectIosBuild, createIosHomologationPlan } from './lib/rc011-ios-artifact.mjs';
import { createIosPhysicalSession, applyIosPhysicalSession, createMultiplatformReview } from './lib/rc011-ios-multiplatform-validation.mjs';

const sha = '0123456789abcdef0123456789abcdef01234567';
const iosBuildId = '123e4567-e89b-42d3-a456-426614174000';
const androidBuildId = '223e4567-e89b-42d3-a456-426614174000';
const checksum = 'a'.repeat(64);
const evidence = 'https://github.com/Tehkne-Solutions/bem-me-cuida/actions/runs/100';
const easBuild = {
  id: iosBuildId, platform: 'ios', status: 'finished', appVersion: '0.11.0', appBuildVersion: '11001',
  appIdentifier: 'com.tehknesolutions.bemmecuida.rc011', buildProfile: 'rc011', gitCommitHash: sha,
};
assert.equal(discoverIosBuilds([easBuild], sha).status, 'unique');
assert.equal(selectIosBuild([easBuild], { sourceCommit: sha }).selected.id, iosBuildId);
assert.equal(discoverIosBuilds([{ ...easBuild, platform: 'android' }], sha).rejected[0].reason, 'plataforma-divergente');
assert.throws(() => selectIosBuild([easBuild, { ...easBuild, id: '323e4567-e89b-42d3-a456-426614174000' }], { sourceCommit: sha }), /Mais de um build/);

const builds = {
  release: '0.11.0-rc.1', sourceCommit: sha,
  platforms: {
    android: { status: 'captured', buildId: androidBuildId, buildNumber: '11001', artifactUrl: evidence, artifactSha256: checksum },
    ios: { status: 'captured', buildId: iosBuildId, buildNumber: '11001', artifactUrl: evidence, artifactSha256: checksum },
  },
};
const matrix = {
  release: '0.11.0-rc.1', generatedBy: 'Tehkné Solutions', privacy: { containsPersonalData: false, containsClinicalData: false },
  profiles: [
    { id: 'android-mainstream', platform: 'android', class: 'mainstream', formFactor: 'phone', memoryClass: 'standard', required: true, status: 'passed', evidenceUrl: evidence },
    { id: 'ios-mainstream', platform: 'ios', class: 'mainstream', formFactor: 'phone', memoryClass: 'standard', required: true, status: 'pending', evidenceUrl: null },
  ],
};
const tests = {
  release: '0.11.0-rc.1', generatedBy: 'Tehkné Solutions', privacy: { containsPersonalData: false, containsClinicalData: false, usesSyntheticAccounts: true },
  suites: [
    { id: 'fresh-install', name: 'Instalação', required: true, requiredPlatforms: ['android', 'ios'], status: 'pending', evidenceUrl: null, platformResults: { android: { status: 'passed', evidenceUrl: evidence } } },
    { id: 'privacy', name: 'Privacidade', required: true, requiredPlatforms: ['android', 'ios'], status: 'pending', evidenceUrl: null, platformResults: { android: { status: 'passed', evidenceUrl: evidence } } },
  ],
};
const iosPlan = createIosHomologationPlan({ builds, deviceMatrix: matrix, testResults: tests, evidenceUrl: evidence });
assert.equal(iosPlan.devices.length, 1);
assert.equal(iosPlan.devices[0].status, 'pending');

const baseSessionArgs = {
  builds, plan: iosPlan, sourceCommit: sha, buildId: iosBuildId, profileId: 'ios-mainstream', deviceStatus: 'passed',
  installationMode: 'fresh', osVersion: '18.0', suiteResults: 'fresh-install=passed,privacy=passed', evidenceUrl: evidence,
};
const session = createIosPhysicalSession({ ...baseSessionArgs, sessionId: '423e4567-e89b-42d3-a456-426614174000', capturedAt: '2026-07-26T20:00:00.000Z' });
const applied = applyIosPhysicalSession({ plan: iosPlan, deviceMatrix: matrix, testResults: tests, session });
assert.equal(applied.plan.status, 'ready-for-review');
assert.equal(applied.deviceMatrix.profiles[1].status, 'passed');
assert.equal(applied.testResults.suites[0].platformResults.ios.status, 'passed');
assert.equal(applied.testResults.suites[0].status, 'passed');
assert.equal(applyIosPhysicalSession({ plan: applied.plan, deviceMatrix: applied.deviceMatrix, testResults: applied.testResults, session }).duplicate, true);

const androidPlan = { release: '0.11.0-rc.1', platform: 'android', status: 'ready-for-review' };
const hold = createMultiplatformReview({ builds, deviceMatrix: applied.deviceMatrix, testResults: applied.testResults, androidPlan, iosPlan: applied.plan, ota: { publish: { status: 'pending' }, rollback: { status: 'pending' } } });
assert.equal(hold.recommendation, 'hold');
assert.ok(hold.blockers.includes('ota-ou-rollback-pendente'));
const promote = createMultiplatformReview({ builds, deviceMatrix: applied.deviceMatrix, testResults: applied.testResults, androidPlan, iosPlan: applied.plan, ota: { publish: { status: 'passed' }, rollback: { status: 'passed' } } });
assert.equal(promote.recommendation, 'promote');
assert.equal(promote.controls.automaticPromotion, false);

const failedSession = createIosPhysicalSession({
  ...baseSessionArgs, deviceStatus: 'failed', installationMode: 'retest', suiteResults: 'privacy=failed',
  sessionId: '523e4567-e89b-42d3-a456-426614174000', capturedAt: '2026-07-26T21:00:00.000Z',
});
const failed = applyIosPhysicalSession({ plan: iosPlan, deviceMatrix: matrix, testResults: tests, session: failedSession });
assert.equal(failed.plan.status, 'retest-required');
assert.equal(failed.testResults.suites.find((item) => item.id === 'privacy').status, 'failed');
assert.throws(() => createIosPhysicalSession({ ...baseSessionArgs, evidenceUrl: 'https://user:pass@example.com/evidence' }), /sem credenciais/);

console.log('Custódia iOS e consolidação multiplataforma aprovadas.');
console.log('Tehkné Solutions');
