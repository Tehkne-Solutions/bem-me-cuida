import assert from 'node:assert/strict';
import { applyQueueUpdates, buildQueueUpdateRecord } from './lib/cycle012-queue-update.mjs';

const sourceCommit = 'a'.repeat(40);
const policy = {
  progressStates: ['not-started', 'in-progress', 'blocked', 'evidence-submitted', 'review-requested'],
  dependencyStates: ['unchanged', 'blocked', 'partially-resolved', 'resolution-reported'],
  evidenceKinds: ['none', 'review', 'cycle-closure', 'environment-cleanup', 'feedback-summary', 'scope-approval', 'migration-plan'],
  evidence: { requiredForProgressStates: ['evidence-submitted', 'review-requested'], httpsOnly: true, credentialsForbidden: true, localHostsForbidden: true },
  controls: {
    informationalOnly: true,
    doesNotCompleteItems: true,
    doesNotChangeQueueReadiness: true,
    doesNotResolveDependencies: true,
    doesNotChangeGates: true,
    doesNotActivateCycle: true,
    doesNotAuthorizeMigrations: true,
    doesNotAuthorizeImplementation: true,
    doesNotMergePullRequests: true,
    doesNotPublishBuilds: true,
    doesNotDeleteEnvironments: true,
  },
};
const queue = {
  cycleVersion: '0.12.0',
  activationAllowed: false,
  executionAllowed: false,
  summary: { totalItems: 2, readyItems: 1, waitingItems: 1 },
  items: [
    {
      id: 'external-source-cycle-closure',
      status: 'ready-for-human-action',
      priority: 'critical',
      dependencies: [],
      ready: true,
      executionAllowed: false,
    },
    {
      id: 'external-environment-cleanup',
      status: 'waiting-on-dependencies',
      priority: 'high',
      dependencies: ['external-source-cycle-closure'],
      ready: false,
      executionAllowed: false,
    },
  ],
};

const base = {
  sourceCommit,
  queue,
  policy,
  actorId: '1001',
  submittedAt: '2026-07-27T17:20:00.000Z',
};
const progress = buildQueueUpdateRecord({
  ...base,
  queueItemId: 'external-source-cycle-closure',
  progressState: 'in-progress',
  dependencyState: 'unchanged',
  dependencyIds: '',
  evidenceKind: 'none',
  evidenceUrl: '',
});
assert.equal(progress.status, 'reported-awaiting-human-review');
assert.equal(progress.effect, 'informational-only');
assert.equal(progress.progress.state, 'in-progress');
assert.match(progress.reporterFingerprint, /^sha256:[a-f0-9]{64}$/);
assert.equal(JSON.stringify(progress).includes('1001'), false);
assert.equal(progress.controls.doesNotCompleteItems, true);
assert.equal(progress.controls.doesNotChangeGates, true);

const dependency = buildQueueUpdateRecord({
  ...base,
  submittedAt: '2026-07-27T17:21:00.000Z',
  queueItemId: 'external-environment-cleanup',
  progressState: 'blocked',
  dependencyState: 'partially-resolved',
  dependencyIds: 'external-source-cycle-closure',
  evidenceKind: 'none',
  evidenceUrl: '',
});
assert.deepEqual(dependency.progress.dependencyIds, ['external-source-cycle-closure']);

const evidence = buildQueueUpdateRecord({
  ...base,
  submittedAt: '2026-07-27T17:22:00.000Z',
  queueItemId: 'external-source-cycle-closure',
  progressState: 'evidence-submitted',
  dependencyState: 'unchanged',
  dependencyIds: '',
  evidenceKind: 'cycle-closure',
  evidenceUrl: 'https://example.com/evidence/closure',
});
const enriched = applyQueueUpdates(queue, [progress, dependency, evidence], policy);
assert.equal(enriched.activationAllowed, false);
assert.equal(enriched.executionAllowed, false);
assert.equal(enriched.items[0].status, 'ready-for-human-action');
assert.equal(enriched.items[0].ready, true);
assert.equal(enriched.items[0].reportedProgress.state, 'evidence-submitted');
assert.equal(enriched.items[1].status, 'waiting-on-dependencies');
assert.equal(enriched.items[1].ready, false);
assert.equal(enriched.summary.mergedUpdateCount, 3);
assert.equal(enriched.summary.itemsWithUpdates, 2);
assert.equal(JSON.stringify(enriched).includes('reporterFingerprint'), false);
assert.equal(JSON.stringify(enriched).includes('sha256:'), false);

assert.throws(() => buildQueueUpdateRecord({ ...base, queueItemId: 'unknown-item', progressState: 'in-progress', dependencyState: 'unchanged', evidenceKind: 'none' }));
assert.throws(() => buildQueueUpdateRecord({ ...base, queueItemId: 'external-source-cycle-closure', progressState: 'completed', dependencyState: 'unchanged', evidenceKind: 'none' }));
assert.throws(() => buildQueueUpdateRecord({ ...base, queueItemId: 'external-source-cycle-closure', progressState: 'evidence-submitted', dependencyState: 'unchanged', evidenceKind: 'cycle-closure', evidenceUrl: '' }));
assert.throws(() => buildQueueUpdateRecord({ ...base, queueItemId: 'external-source-cycle-closure', progressState: 'evidence-submitted', dependencyState: 'unchanged', evidenceKind: 'cycle-closure', evidenceUrl: 'http://example.com/evidence' }));
assert.throws(() => buildQueueUpdateRecord({ ...base, queueItemId: 'external-source-cycle-closure', progressState: 'in-progress', dependencyState: 'unchanged', evidenceKind: 'review', evidenceUrl: 'https://user:pass@example.com/evidence' }));
assert.throws(() => buildQueueUpdateRecord({ ...base, queueItemId: 'external-environment-cleanup', progressState: 'blocked', dependencyState: 'blocked', dependencyIds: 'unknown-item', evidenceKind: 'none' }));
assert.throws(() => buildQueueUpdateRecord({ ...base, queueItemId: 'external-environment-cleanup', progressState: 'blocked', dependencyState: 'blocked', dependencyIds: '', evidenceKind: 'none' }));

console.log('Testes de atualizações protegidas da fila 0.12.0 aprovados.');
console.log('Tehkné Solutions');
