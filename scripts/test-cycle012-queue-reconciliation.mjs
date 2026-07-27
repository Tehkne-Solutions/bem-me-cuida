import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { buildQueueUpdateRecord } from './lib/cycle012-queue-update.mjs';
import { buildQueueReconciliation, renderQueueReconciliationMarkdown } from './lib/cycle012-queue-reconciliation.mjs';

const read = (path) => JSON.parse(readFileSync(path, 'utf8'));
const updatePolicy = read('release/cycle-0.12.0/queue-update-policy.json');
const policy = read('release/cycle-0.12.0/queue-reconciliation-policy.json');
const currentCommit = 'a'.repeat(40);
const staleCommit = 'b'.repeat(40);
const generatedAt = '2026-07-27T18:00:00.000Z';
const queueConfig = {
  reviewTracks: { architecture: {}, security: {}, privacy: {}, accessibility: {}, database: {} },
  externalGates: {
    'source-cycle-closure': {},
    'environment-cleanup': {},
    'feedback-summary': {},
    'scope-approval': {},
    'migration-plan-approval': {},
  },
};
const currentQueue = {
  cycleVersion: '0.12.0',
  sourceCommit: currentCommit,
  activationAllowed: false,
  executionAllowed: false,
  items: [
    {
      id: 'review-track-architecture',
      source: 'review:architecture',
      status: 'ready-for-human-action',
      ready: true,
      dependencies: [],
    },
    {
      id: 'review-track-security',
      source: 'review:security',
      status: 'ready-for-human-action',
      ready: true,
      dependencies: [],
    },
    {
      id: 'external-environment-cleanup',
      source: 'external:environment-cleanup',
      status: 'waiting-on-dependencies',
      ready: false,
      dependencies: ['external-source-cycle-closure'],
    },
  ],
};
const historicalQueue = {
  ...currentQueue,
  items: [
    ...currentQueue.items,
    {
      id: 'external-feedback-summary',
      source: 'external:feedback-summary',
      status: 'ready-for-human-action',
      ready: true,
      dependencies: [],
    },
  ],
};

const build = (input) => buildQueueUpdateRecord({
  sourceCommit: input.sourceCommit ?? currentCommit,
  queue: input.queue ?? currentQueue,
  policy: updatePolicy,
  queueItemId: input.queueItemId,
  progressState: input.progressState,
  dependencyState: input.dependencyState ?? 'unchanged',
  dependencyIds: input.dependencyIds ?? [],
  evidenceKind: input.evidenceKind ?? 'none',
  evidenceUrl: input.evidenceUrl ?? '',
  actorId: input.actorId,
  submittedAt: input.submittedAt,
});

const records = [
  build({
    queueItemId: 'review-track-architecture',
    progressState: 'in-progress',
    actorId: '101',
    submittedAt: '2026-07-27T18:00:01.000Z',
  }),
  build({
    sourceCommit: staleCommit,
    queueItemId: 'review-track-security',
    progressState: 'in-progress',
    actorId: '102',
    submittedAt: '2026-07-27T18:00:02.000Z',
  }),
  build({
    queueItemId: 'review-track-architecture',
    progressState: 'review-requested',
    evidenceKind: 'review',
    evidenceUrl: 'https://evidence.example/review/architecture',
    actorId: '103',
    submittedAt: '2026-07-27T18:00:03.000Z',
  }),
  build({
    queueItemId: 'external-environment-cleanup',
    progressState: 'in-progress',
    dependencyState: 'partially-resolved',
    dependencyIds: ['external-source-cycle-closure'],
    actorId: '104',
    submittedAt: '2026-07-27T18:00:04.000Z',
  }),
  build({
    queueItemId: 'review-track-security',
    progressState: 'evidence-submitted',
    evidenceKind: 'cycle-closure',
    evidenceUrl: 'https://evidence.example/conflict',
    actorId: '105',
    submittedAt: '2026-07-27T18:00:05.000Z',
  }),
  build({
    queue: historicalQueue,
    queueItemId: 'external-feedback-summary',
    progressState: 'review-requested',
    evidenceKind: 'feedback-summary',
    evidenceUrl: 'https://evidence.example/feedback/summary',
    actorId: '106',
    submittedAt: '2026-07-27T18:00:06.000Z',
  }),
];
const invalidRecord = {
  ...records[0],
  recordId: 'queue-update-ffffffffffffffffffff',
  queueItemId: 'external-unknown-gate',
  submittedAt: '2026-07-27T18:00:07.000Z',
};
records.push(invalidRecord);

const report = buildQueueReconciliation({
  queue: currentQueue,
  records,
  queueConfig,
  updatePolicy,
  policy,
  generatedAt,
});

assert.equal(report.activationAllowed, false);
assert.equal(report.mutationAllowed, false);
assert.equal(report.status, 'critical-divergence-review-required');
assert.equal(report.summary.recordCount, 7);
assert.equal(report.summary.byClassification['aligned-open-item'], 1);
assert.equal(report.summary.byClassification['stale-source-commit'], 1);
assert.equal(report.summary.byClassification['evidence-awaiting-source-reflection'], 1);
assert.equal(report.summary.byClassification['dependency-report-not-reflected'], 1);
assert.equal(report.summary.byClassification['state-conflict'], 1);
assert.equal(report.summary.byClassification['source-reflected-closed'], 1);
assert.equal(report.summary.byClassification['invalid-item-reference'], 1);
assert.equal(JSON.stringify(report).includes('reporterFingerprint'), false);
assert.equal(JSON.stringify(report).includes('sha256:'), false);
assert.ok(report.items.every((item) => item.mutationAllowed === false));

const markdown = renderQueueReconciliationMarkdown(report);
assert.match(markdown, /Correção automática.*false/);
assert.match(markdown, /Ativação permitida.*false/);
assert.match(markdown, /Tehkné Solutions/);
assert.equal(markdown.includes('reporterFingerprint'), false);
assert.equal(markdown.includes('sha256:'), false);

const emptyReport = buildQueueReconciliation({
  queue: currentQueue,
  records: [],
  queueConfig,
  updatePolicy,
  policy,
  generatedAt,
});
assert.equal(emptyReport.status, 'reconciliation-informational-only');
assert.equal(emptyReport.recommendation, 'no-reconciliation-action-required');
assert.equal(emptyReport.summary.recordCount, 0);

console.log('Testes da reconciliação da fila 0.12.0 aprovados.');
console.log('Tehkné Solutions');
