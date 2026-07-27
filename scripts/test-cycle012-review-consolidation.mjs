import assert from 'node:assert/strict';
import { buildConsolidationArtifact, consolidateReviewRecords } from './lib/cycle012-review-consolidation.mjs';

const sourceCommit = 'a'.repeat(40);
const fingerprints = ['1', '2', '3'].map((value) => `sha256:${value.repeat(64)}`);
const config = {
  requiredTracks: ['architecture', 'security', 'privacy', 'accessibility', 'database'],
  minimumDistinctReviewers: 3,
};
const record = (track, reviewerFingerprint, verdict = 'pass') => ({
  track,
  reviewerFingerprint,
  verdict,
  sourceCommit,
});
const completeRecords = [
  record('architecture', fingerprints[0]),
  record('security', fingerprints[0]),
  record('privacy', fingerprints[1]),
  record('accessibility', fingerprints[1], 'pass-with-residual-risk'),
  record('database', fingerprints[2]),
];

const complete = consolidateReviewRecords({ sourceCommit, records: completeRecords, config });
assert.equal(complete.reviewComplete, true);
assert.deepEqual(complete.missingTracks, []);
assert.equal(complete.distinctReviewerCount, 3);
assert.deepEqual(complete.residualRiskTracks, ['accessibility']);
assert.equal(complete.reviewGates.securityPrivacySeparationPass, true);

const incomplete = consolidateReviewRecords({ sourceCommit, records: completeRecords.slice(0, 4), config });
assert.equal(incomplete.reviewComplete, false);
assert.deepEqual(incomplete.missingTracks, ['database']);

const changesRequired = consolidateReviewRecords({
  sourceCommit,
  records: [...completeRecords, record('security', fingerprints[2], 'changes-required')],
  config,
});
assert.equal(changesRequired.reviewComplete, false);
assert.deepEqual(changesRequired.changesRequiredTracks, ['security']);

const baseExternal = {
  sourceClosure: { status: 'closed' },
  cleanup: { status: 'completed' },
  feedback: { status: 'approved' },
  scope: { approval: { status: 'approved' } },
  migrationPlan: { approval: { status: 'approved' } },
};
const ready = buildConsolidationArtifact({
  sourceCommit,
  records: completeRecords,
  config,
  ...baseExternal,
  generatedAt: '2026-07-27T15:30:00.000Z',
});
assert.equal(ready.status, 'ready-for-human-activation-proposal');
assert.equal(ready.recommendation, 'prepare-human-activation-proposal');
assert.equal(ready.activationAllowed, false);
assert.equal(ready.controls.doesNotActivateAutomatically, true);

const blocked = buildConsolidationArtifact({
  sourceCommit,
  records: completeRecords,
  config,
  ...baseExternal,
  sourceClosure: { status: 'blocked' },
  generatedAt: '2026-07-27T15:30:00.000Z',
});
assert.equal(blocked.status, 'review-complete-external-gates-blocked');
assert.equal(blocked.recommendation, 'hold');
assert.deepEqual(blocked.external.blockers, ['sourceCycleClosure']);
assert.equal(blocked.activationAllowed, false);

console.log('Testes da consolidação de revisões 0.12.0 aprovados.');
console.log('Tehkné Solutions');
