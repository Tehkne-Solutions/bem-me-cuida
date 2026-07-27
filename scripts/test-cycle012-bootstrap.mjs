import assert from 'node:assert/strict';
import { applyCleanupCapture, applyFeedbackCapture, buildCleanupCapture, buildFeedbackCapture, evaluateCycle012, parseThemeCounts } from './lib/cycle012-bootstrap.mjs';

const sha = 'a'.repeat(40);
const evidence = 'https://example.com/evidence/123';

assert.deepEqual(parseThemeCounts('reliability=8,accessibility=3'), [
  { id: 'reliability', count: 8, rank: 1 },
  { id: 'accessibility', count: 3, rank: 2 },
]);
assert.throws(() => parseThemeCounts('user-email=2'), /não permitido/);
assert.throws(() => parseThemeCounts('reliability=2,reliability=3'), /duplicado/);

const feedbackCapture = buildFeedbackCapture({
  sourceCommit: sha,
  themeCounts: 'reliability=8,accessibility=3',
  impacts: { blocking: 0, high: 4, medium: 5, low: 2 },
  excludedSensitiveItems: 1,
  evidenceUrl: evidence,
  capturedAt: '2026-07-27T12:00:00.000Z',
});
assert.equal(feedbackCapture.status, 'ready-for-human-review');
assert.equal(feedbackCapture.sample.includedItems, 11);
const feedbackRecord = applyFeedbackCapture({ status: 'pending', themes: [], sample: {}, impactDistribution: {}, evidenceUrl: null }, feedbackCapture);
assert.equal(feedbackRecord.themes.length, 2);
assert.equal(feedbackRecord.evidenceUrl, evidence);

assert.throws(() => buildCleanupCapture({ sourceCommit: sha, environment: 'production-release', status: 'deleted', evidenceUrl: evidence, capturedAt: '2026-07-27T12:00:00.000Z' }), /protegido/);
const cleanupBase = {
  status: 'blocked-awaiting-cycle-closure',
  temporaryEnvironments: [
    { name: 'rc-011-build', status: 'retained', evidenceUrl: null },
    { name: 'rc-011-homologation', status: 'retained', evidenceUrl: null },
  ],
};
const buildDeleted = buildCleanupCapture({ sourceCommit: sha, environment: 'rc-011-build', status: 'deleted', evidenceUrl: evidence, capturedAt: '2026-07-27T12:00:00.000Z' });
const homDeleted = buildCleanupCapture({ sourceCommit: sha, environment: 'rc-011-homologation', status: 'deleted', evidenceUrl: evidence, capturedAt: '2026-07-27T12:10:00.000Z' });
const cleanupPartial = applyCleanupCapture(cleanupBase, buildDeleted);
assert.equal(cleanupPartial.status, 'in-progress');
const cleanupComplete = applyCleanupCapture(cleanupPartial, homDeleted);
assert.equal(cleanupComplete.status, 'completed');

const blocked = evaluateCycle012({
  sourceClosure: { status: 'blocked' }, cleanup: cleanupBase,
  feedback: { status: 'pending' }, scope: { approval: { status: 'pending' } }, migrationPlan: { approval: { status: 'pending' } },
});
assert.equal(blocked.recommendation, 'hold');
assert.ok(blocked.blockers.length >= 5);

const ready = evaluateCycle012({
  sourceClosure: { status: 'closed', evidenceUrl: evidence },
  cleanup: cleanupComplete,
  feedback: { status: 'approved', evidenceUrl: evidence },
  scope: { approval: { status: 'approved', evidenceUrl: evidence } },
  migrationPlan: { approval: { status: 'approved', evidenceUrl: evidence } },
});
assert.equal(ready.recommendation, 'ready-for-human-activation');
assert.equal(ready.blockers.length, 0);
assert.equal(ready.controls.doesNotActivateAutomatically, true);

console.log('Sprint 29 aprovado: fechamento, limpeza, feedback agregado e abertura 0.12.0 permanecem fail-closed.');
console.log('Tehkné Solutions');
