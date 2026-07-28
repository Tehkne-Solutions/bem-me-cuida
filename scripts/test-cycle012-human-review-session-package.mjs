import assert from 'node:assert/strict';
import fs from 'node:fs';
import { buildHumanReviewSessionPackage, sessionPackageId } from './lib/cycle012-human-review-session-package.mjs';

const policy = JSON.parse(fs.readFileSync('release/cycle-0.12.0/human-review-session-package-policy.json', 'utf8'));
const base = {
  cycle: '0.12.0',
  recordClassification: 'current-and-compatible',
  reviewRecordId: 'review-record-001',
  recordValidationCommit: 'abc123',
  packageId: 'pkg-001',
  authorizationId: 'auth-001',
  planId: 'plan-001',
  decisionId: 'decision-001',
  proposalId: 'proposal-001',
  context: 'Review administrative metadata only.',
  reviewQuestions: ['Are references current?', 'Is the declared scope understandable?'],
  riskNotes: ['No implementation is included.'],
  sourceControls: {
    reviewSessionExecutionAllowed: false,
    patchGenerationAllowed: false,
    sourceMutationAllowed: false
  }
};

const pkg = buildHumanReviewSessionPackage(base, policy);
assert.equal(pkg.packageKind, 'human-review-session-package');
assert.equal(pkg.controls.sessionPackageGenerationAllowed, true);
assert.equal(pkg.controls.reviewSessionExecutionAllowed, false);
assert.equal(pkg.controls.patchGenerationAllowed, false);
assert.equal(pkg.controls.sourceMutationAllowed, false);
assert.equal(pkg.controls.executionAllowed, false);
assert.equal(pkg.controls.mergeAllowed, false);
assert.equal(pkg.controls.activationAllowed, false);
assert.equal(pkg.controls.humanReviewRequired, true);
assert.deepEqual(pkg.decisionFields, policy.allowedDecisionFields);
assert.equal(sessionPackageId(base), sessionPackageId({ ...base }));

assert.throws(() => buildHumanReviewSessionPackage({ ...base, recordClassification: 'stale-package-validation' }, policy), /not-current-and-compatible/);
assert.throws(() => buildHumanReviewSessionPackage({ ...base, reviewRecordId: '' }, policy), /missing-reference/);
assert.throws(() => buildHumanReviewSessionPackage({ ...base, reviewQuestions: [] }, policy), /review-questions-required/);
assert.throws(() => buildHumanReviewSessionPackage({ ...base, sourceControls: { executionAllowed: true } }, policy), /source-controls-must-remain-closed/);
assert.throws(() => buildHumanReviewSessionPackage({ ...base, context: 'diff --git a/x b/x' }, policy), /forbidden-operational-content/);
assert.throws(() => buildHumanReviewSessionPackage(base, { ...policy, controls: { ...policy.controls, reviewSessionExecutionAllowed: true } }), /unsafe-policy-control/);

console.log('Sprint 51 human review session package tests passed.');
