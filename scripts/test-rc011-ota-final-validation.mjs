import assert from 'node:assert/strict';
import { createOtaDeviceSession, applyOtaDeviceSession, createFinalRcDecision } from './lib/rc011-ota-final-validation.mjs';

const sha = '0123456789abcdef0123456789abcdef01234567';
const androidBuildId = '123e4567-e89b-42d3-a456-426614174000';
const iosBuildId = '223e4567-e89b-42d3-a456-426614174000';
const publishGroup = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const rollbackGroup = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const evidence = 'https://github.com/Tehkne-Solutions/bem-me-cuida/actions/runs/100';
const builds = { release: '0.11.0-rc.1', sourceCommit: sha, platforms: {
  android: { status: 'captured', buildId: androidBuildId, buildNumber: '11001', artifactSha256: 'a'.repeat(64) },
  ios: { status: 'captured', buildId: iosBuildId, buildNumber: '11001', artifactSha256: 'b'.repeat(64) },
} };
const ota = { release: '0.11.0-rc.1', runtimeVersion: '0.11.0', channel: 'rc-0-11',
  publish: { status: 'captured', groupId: publishGroup, sourceCommit: sha },
  rollback: { status: 'captured', sourceGroupId: publishGroup, rollbackGroupId: rollbackGroup, sourceCommit: sha },
};
const matrix = { profiles: [
  { id: 'android-mainstream', platform: 'android', class: 'mainstream', formFactor: 'phone', required: true, status: 'passed', evidenceUrl: evidence },
  { id: 'ios-mainstream', platform: 'ios', class: 'mainstream', formFactor: 'phone', required: true, status: 'passed', evidenceUrl: evidence },
] };
const validation = { release: '0.11.0-rc.1', runtimeVersion: '0.11.0', channel: 'rc-0-11', status: 'in-progress', sessions: [], actions: {
  publish: { status: 'pending-physical-validation', groupId: publishGroup, platforms: {
    android: { status: 'pending', requiredProfiles: ['android-mainstream'], profiles: {} }, ios: { status: 'pending', requiredProfiles: ['ios-mainstream'], profiles: {} },
  } },
  rollback: { status: 'pending-physical-validation', groupId: rollbackGroup, platforms: {
    android: { status: 'pending', requiredProfiles: ['android-mainstream'], profiles: {} }, ios: { status: 'pending', requiredProfiles: ['ios-mainstream'], profiles: {} },
  } },
} };
const publishChecks = 'update-received=passed,restart-applied=passed,local-data-preserved=passed,offline-startup=passed';
const rollbackChecks = 'rollback-received=passed,restart-applied=passed,local-data-preserved=passed,offline-startup=passed';
function session(platform, action, id) {
  return createOtaDeviceSession({ builds, ota, deviceMatrix: matrix, sourceCommit: sha, platform,
    buildId: platform === 'android' ? androidBuildId : iosBuildId, profileId: `${platform}-mainstream`, osVersion: platform === 'android' ? '15' : '18.0',
    action, groupId: action === 'publish' ? publishGroup : rollbackGroup, checkResults: action === 'publish' ? publishChecks : rollbackChecks,
    evidenceUrl: evidence, sessionId: id, capturedAt: '2026-07-27T12:00:00.000Z' });
}
let current = applyOtaDeviceSession({ validation, session: session('android', 'publish', '323e4567-e89b-42d3-a456-426614174000') }).validation;
assert.equal(current.actions.publish.status, 'in-progress');
current = applyOtaDeviceSession({ validation: current, session: session('ios', 'publish', '423e4567-e89b-42d3-a456-426614174000') }).validation;
assert.equal(current.actions.publish.status, 'passed');
current = applyOtaDeviceSession({ validation: current, session: session('android', 'rollback', '523e4567-e89b-42d3-a456-426614174000') }).validation;
current = applyOtaDeviceSession({ validation: current, session: session('ios', 'rollback', '623e4567-e89b-42d3-a456-426614174000') }).validation;
assert.equal(current.status, 'ready-for-final-review');
assert.equal(applyOtaDeviceSession({ validation: current, session: session('ios', 'rollback', '623e4567-e89b-42d3-a456-426614174000') }).duplicate, true);
assert.throws(() => createOtaDeviceSession({ builds, ota, deviceMatrix: matrix, sourceCommit: sha, platform: 'ios', buildId: iosBuildId, profileId: 'ios-mainstream', osVersion: '18', action: 'publish', groupId: publishGroup, checkResults: publishChecks, evidenceUrl: 'https://user:pass@example.com' }), /sem credenciais/);

const tests = { suites: [{ id: 'privacy', required: true, status: 'passed', evidenceUrl: evidence }] };
const infrastructure = { scopes: { build: { status: 'ready' }, homologation: { status: 'ready' }, services: { status: 'ready' } } };
const passedOta = { ...ota, publish: { ...ota.publish, status: 'passed' }, rollback: { ...ota.rollback, status: 'passed' } };
const promote = createFinalRcDecision({ infrastructure, builds, deviceMatrix: matrix, testResults: tests,
  androidPlan: { status: 'ready-for-review' }, iosPlan: { status: 'ready-for-review' }, ota: passedOta, otaDeviceValidation: current });
assert.equal(promote.recommendation, 'promote');
assert.equal(promote.controls.automaticPromotion, false);
const hold = createFinalRcDecision({ infrastructure, builds, deviceMatrix: matrix, testResults: tests,
  androidPlan: { status: 'ready-for-review' }, iosPlan: { status: 'ready-for-review' }, ota, otaDeviceValidation: current });
assert.equal(hold.recommendation, 'hold');
assert.ok(hold.blockers.includes('ota_publish_captured'));
console.log('OTA físico e decisão final aprovados.');
console.log('Tehkné Solutions');
