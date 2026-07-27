import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { buildOperationsQueue, renderOperationsQueueMarkdown } from './lib/cycle012-operations-queue.mjs';
import { parseCycle012OperationsCommand } from './lib/cycle012-operations-command-router.mjs';

const queueConfig = JSON.parse(readFileSync('release/cycle-0.12.0/operations-queue-config.json', 'utf8'));
const dashboardConfig = JSON.parse(readFileSync('release/cycle-0.12.0/operations-dashboard-config.json', 'utf8'));
const commit = 'a'.repeat(40);
const generatedAt = '2026-07-27T16:00:00.000Z';

for (const command of ['status', 'reviews', 'blockers', 'gates']) {
  assert.deepEqual(parseCycle012OperationsCommand(`/cycle012 ${command}`, dashboardConfig, queueConfig), { command, surface: 'dashboard' });
}
for (const command of ['queue', 'owners', 'next']) {
  assert.deepEqual(parseCycle012OperationsCommand(`/cycle012 ${command}`, dashboardConfig, queueConfig), { command, surface: 'queue' });
}
assert.throws(() => parseCycle012OperationsCommand('/cycle012 queue agora', dashboardConfig, queueConfig));
assert.throws(() => parseCycle012OperationsCommand('/cycle012 assign pessoa', dashboardConfig, queueConfig));
assert.throws(() => parseCycle012OperationsCommand('/cycle012 next\ntexto', dashboardConfig, queueConfig));

const pendingSnapshot = {
  cycleVersion: '0.12.0',
  sourceCommit: commit,
  activationAllowed: false,
  status: 'review-incomplete',
  reviews: {
    tracks: ['architecture', 'security', 'privacy', 'accessibility', 'database'].map((id) => ({ id, status: 'pending', residualRisk: false })),
    minimumDistinctReviewersPass: false,
    securityPrivacySeparationPass: false,
    reviewPackageComplete: false,
  },
  externalGates: [
    { id: 'source-cycle-closure', status: 'blocked', passed: false },
    { id: 'environment-cleanup', status: 'pending', passed: false },
    { id: 'feedback-summary', status: 'pending', passed: false },
    { id: 'scope-approval', status: 'pending', passed: false },
    { id: 'migration-plan-approval', status: 'pending', passed: false },
  ],
};

const pendingQueue = buildOperationsQueue({ snapshot: pendingSnapshot, config: queueConfig, generatedAt });
assert.equal(pendingQueue.status, 'blocked-work-queue-open');
assert.equal(pendingQueue.activationAllowed, false);
assert.equal(pendingQueue.executionAllowed, false);
assert.equal(pendingQueue.summary.totalItems, 12);
assert.equal(pendingQueue.items.some((item) => item.id === 'external-environment-cleanup' && item.ready === false), true);
assert.equal(pendingQueue.items.some((item) => item.id === 'review-track-security' && item.ownerRole === 'security_reviewer'), true);
assert.equal(pendingQueue.nextItems.length > 0, true);
assert.equal(JSON.stringify(pendingQueue).includes('reviewerFingerprint'), false);
assert.equal(JSON.stringify(pendingQueue).includes('@'), false);

const changesSnapshot = {
  ...pendingSnapshot,
  reviews: {
    ...pendingSnapshot.reviews,
    tracks: pendingSnapshot.reviews.tracks.map((track) => track.id === 'architecture' ? { ...track, status: 'changes-required' } : track),
  },
};
const changesQueue = buildOperationsQueue({ snapshot: changesSnapshot, config: queueConfig, generatedAt });
const architectureItem = changesQueue.items.find((item) => item.id === 'review-track-architecture');
assert.equal(architectureItem.priority, 'critical');
assert.equal(architectureItem.nextStep, 'resolve-review-changes');

const readySnapshot = {
  cycleVersion: '0.12.0',
  sourceCommit: commit,
  activationAllowed: false,
  status: 'ready-for-human-proposal',
  reviews: {
    tracks: ['architecture', 'security', 'privacy', 'accessibility', 'database'].map((id) => ({ id, status: 'passed', residualRisk: false })),
    minimumDistinctReviewersPass: true,
    securityPrivacySeparationPass: true,
    reviewPackageComplete: true,
  },
  externalGates: [
    { id: 'source-cycle-closure', status: 'closed', passed: true },
    { id: 'environment-cleanup', status: 'completed', passed: true },
    { id: 'feedback-summary', status: 'approved', passed: true },
    { id: 'scope-approval', status: 'approved', passed: true },
    { id: 'migration-plan-approval', status: 'approved', passed: true },
  ],
};
const emptyQueue = buildOperationsQueue({ snapshot: readySnapshot, config: queueConfig, generatedAt });
assert.equal(emptyQueue.status, 'no-operational-pendencies');
assert.equal(emptyQueue.summary.totalItems, 0);
assert.equal(emptyQueue.recommendation, 'prepare-human-proposal-review');
assert.equal(emptyQueue.activationAllowed, false);

for (const command of ['queue', 'owners', 'next']) {
  const markdown = renderOperationsQueueMarkdown(pendingQueue, command);
  assert.match(markdown, /Tehkné Solutions/);
  assert.match(markdown, /Execução automática.*false/);
  assert.equal(markdown.includes('reviewerFingerprint'), false);
  assert.equal(markdown.includes('@'), false);
}

console.log('Testes da fila operacional 0.12.0 aprovados.');
console.log('Tehkné Solutions');
