import assert from 'node:assert/strict';
import { createAndroidHomologationPlan, discoverAndroidBuilds, selectAndroidBuild } from './lib/rc011-android-artifact.mjs';

const sourceCommit = '0123456789abcdef0123456789abcdef01234567';
const buildId = '123e4567-e89b-42d3-a456-426614174000';
const secondBuildId = '223e4567-e89b-42d3-a456-426614174000';
const matchingBuild = {
  id: buildId,
  platform: 'ANDROID',
  status: 'FINISHED',
  appVersion: '0.11.0',
  appBuildVersion: '11001',
  appIdentifier: 'com.tehknesolutions.bemmecuida.rc011',
  buildProfile: 'rc011',
  gitCommitHash: sourceCommit,
  completedAt: '2026-07-26T20:00:00.000Z',
};

const unique = discoverAndroidBuilds([matchingBuild], sourceCommit);
assert.equal(unique.status, 'unique');
assert.equal(unique.candidates[0].id, buildId);
assert.equal(unique.privacy.containsSecrets, false);

const selected = selectAndroidBuild([matchingBuild], { sourceCommit });
assert.equal(selected.status, 'selected');
assert.equal(selected.selected.buildProfile, 'rc011');

const ambiguousPayload = [
  matchingBuild,
  { ...matchingBuild, id: secondBuildId, completedAt: '2026-07-26T20:05:00.000Z' },
];
assert.equal(discoverAndroidBuilds(ambiguousPayload, sourceCommit).status, 'ambiguous');
assert.throws(
  () => selectAndroidBuild(ambiguousPayload, { sourceCommit }),
  /Mais de um build/,
);
assert.equal(selectAndroidBuild(ambiguousPayload, { sourceCommit, buildId: secondBuildId }).selected.id, secondBuildId);

assert.throws(
  () => selectAndroidBuild([{ ...matchingBuild, appVersion: '0.10.0' }], { sourceCommit }),
  /Nenhum build Android/,
);
assert.throws(
  () => selectAndroidBuild([{ ...matchingBuild, gitCommitHash: 'f'.repeat(40) }], { sourceCommit }),
  /Nenhum build Android/,
);

const builds = {
  release: '0.11.0-rc.1',
  sourceCommit,
  platforms: {
    android: {
      status: 'captured',
      buildId,
      buildNumber: '11001',
      artifactUrl: 'https://example.test/bemmecuida.apk',
      artifactSha256: 'a'.repeat(64),
      artifactSizeBytes: 123456,
    },
  },
};
const plan = createAndroidHomologationPlan({
  builds,
  evidenceUrl: 'https://github.com/Tehkne-Solutions/bem-me-cuida/actions/runs/123',
  deviceMatrix: {
    profiles: [
      { id: 'android-minimum', platform: 'android', class: 'minimum', formFactor: 'phone', memoryClass: 'low', osRange: 'mínimo', required: true },
      { id: 'ios-minimum', platform: 'ios', class: 'minimum', formFactor: 'phone', memoryClass: 'standard', osRange: 'mínimo', required: true },
    ],
  },
  testResults: {
    suites: [{ id: 'fresh-install', name: 'Instalação limpa', required: true }],
  },
});
assert.equal(plan.status, 'pending-physical-validation');
assert.equal(plan.devices.length, 1);
assert.equal(plan.devices[0].status, 'pending');
assert.equal(plan.suites[0].status, 'pending');
assert.equal(plan.summary.passedRequiredDevices, 0);
assert.equal(plan.privacy.usesSyntheticAccounts, true);

console.log('Descoberta, seleção e plano Android aprovados.');
console.log('Tehkné Solutions');
