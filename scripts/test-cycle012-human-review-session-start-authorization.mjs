import assert from 'node:assert/strict';
import { buildSessionStartAuthorization } from './cycle012-human-review-session-start-authorization.mjs';

const base = {
  reviewer: 'human-reviewer',
  decidedAt: '2026-07-28T00:00:00Z',
  rationale: 'Pacote administrativo vigente e compatível.',
  sessionPackageId: 'session-package-001',
  sessionPackageValidationCommit: '4f1270f98961ed32572294ee41e706def2fd51c7',
  sessionPackageClassification: 'current-and-compatible',
  decision: 'authorize-human-review-session-start'
};

const first = buildSessionStartAuthorization(base);
const second = buildSessionStartAuthorization(base);
assert.equal(first.authorizationId, second.authorizationId);
assert.equal(first.controls.sessionStartAuthorizationRecordingAllowed, true);
for (const key of ['reviewSessionExecutionAllowed','functionalBranchCreationAllowed','pullRequestOpeningAllowed','patchGenerationAllowed','sourceMutationAllowed','executionAllowed','correctionAuthorized','mergeAllowed','activationAllowed']) {
  assert.equal(first.controls[key], false, key);
}
assert.equal(first.controls.humanReviewRequired, true);
assert.throws(() => buildSessionStartAuthorization({ ...base, sessionPackageClassification: 'stale-source-validation' }), /ineligible-session-package/);
assert.throws(() => buildSessionStartAuthorization({ ...base, decision: 'start-session-now' }), /invalid-decision/);
assert.throws(() => buildSessionStartAuthorization({ ...base, reviewer: '' }), /missing:reviewer/);
console.log('Sprint 53 authorization tests passed.');
