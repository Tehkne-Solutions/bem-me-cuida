import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  authorizationId,
  buildAdministrativeReviewAuthorization
} from './lib/cycle012-administrative-review-authorization.mjs';

const policy = JSON.parse(fs.readFileSync(
  'release/cycle-0.12.0/administrative-review-authorization-policy.json',
  'utf8'
));

const base = {
  cycle: '0.12.0',
  packageId: 'pkg-001',
  packageValidationCommit: 'abc123',
  packageClassification: 'current-and-compatible',
  authorizationId: 'auth-001',
  planId: 'plan-001',
  decisionId: 'decision-001',
  proposalId: 'proposal-001',
  decision: 'authorize-human-administrative-review',
  reviewer: 'reviewer@example.com',
  reviewedAt: '2026-07-27T23:30:00Z',
  rationale: 'Administrative metadata is ready for human review.'
};

const authorization = buildAdministrativeReviewAuthorization(base, policy);
assert.equal(authorization.authorizationKind, 'administrative-package-human-review-authorization');
assert.equal(authorization.controls.administrativeReviewAuthorizationRecordingAllowed, true);
assert.equal(authorization.controls.humanReviewAllowed, false);
assert.equal(authorization.controls.functionalBranchCreationAllowed, false);
assert.equal(authorization.controls.pullRequestOpeningAllowed, false);
assert.equal(authorization.controls.patchGenerationAllowed, false);
assert.equal(authorization.controls.sourceMutationAllowed, false);
assert.equal(authorization.controls.executionAllowed, false);
assert.equal(authorization.controls.mergeAllowed, false);
assert.equal(authorization.controls.activationAllowed, false);
assert.equal(authorization.controls.humanReviewRequired, true);
assert.equal(authorizationId(base), authorizationId({ ...base }));

assert.throws(() => buildAdministrativeReviewAuthorization({ ...base, packageClassification: 'scope-divergence' }, policy), /package-not-current/);
assert.throws(() => buildAdministrativeReviewAuthorization({ ...base, decision: 'approve-implementation' }, policy), /invalid-review-decision/);
assert.throws(() => buildAdministrativeReviewAuthorization({ ...base, reviewer: '' }, policy), /human-review-metadata-required/);
assert.throws(() => buildAdministrativeReviewAuthorization({ ...base, packageId: '' }, policy), /missing-reference:packageId/);
assert.throws(() => buildAdministrativeReviewAuthorization(base, { ...policy, controls: { ...policy.controls, humanReviewAllowed: true } }), /unsafe-policy-control/);
assert.throws(() => buildAdministrativeReviewAuthorization(base, { ...policy, controls: { ...policy.controls, humanReviewRequired: false } }), /human-review-required/);

console.log('Sprint 49 administrative review authorization tests passed.');
