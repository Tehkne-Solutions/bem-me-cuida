import assert from 'node:assert/strict';
import { CLASSIFICATIONS, validateSessionStartAuthorization } from './cycle012-human-review-session-start-authorization-validation.mjs';

const pkg = { id: 'session-package-001', validationCommit: 'commit-current', classification: 'current-and-compatible' };
const authorization = {
  type: 'human-review-session-start-authorization',
  sessionPackageId: pkg.id,
  sessionPackageValidationCommit: pkg.validationCommit,
  decision: 'authorize-human-review-session-start',
  reviewer: 'human-reviewer',
  decidedAt: '2026-07-28T13:00:00Z',
  rationale: 'Pacote administrativo revisado.'
};

const classify = (overrides = {}, input = {}) => validateSessionStartAuthorization({
  authorization: { ...authorization, ...overrides },
  currentSessionPackage: input.currentSessionPackage ?? pkg,
  existingAuthorizations: input.existingAuthorizations ?? []
}).classification;

assert.equal(classify(), CLASSIFICATIONS.CURRENT);
assert.equal(validateSessionStartAuthorization({ authorization: null, currentSessionPackage: pkg }).classification, CLASSIFICATIONS.MISSING);
assert.equal(classify({ type: 'invalid' }), CLASSIFICATIONS.REFERENCE);
assert.equal(classify({ sessionPackageId: 'other' }), CLASSIFICATIONS.REFERENCE);
assert.equal(classify({}, { currentSessionPackage: { ...pkg, validationCommit: 'new-commit' } }), CLASSIFICATIONS.STALE);
assert.equal(classify({}, { currentSessionPackage: { ...pkg, classification: 'stale' } }), CLASSIFICATIONS.STALE);
assert.equal(classify({ decision: 'execute-session' }), CLASSIFICATIONS.DECISION);
assert.equal(classify({}, { existingAuthorizations: [authorization] }), CLASSIFICATIONS.DUPLICATE);
assert.equal(classify({}, { existingAuthorizations: [{ ...authorization, reviewer: 'other-reviewer' }] }), CLASSIFICATIONS.CONFLICT);

const result = validateSessionStartAuthorization({ authorization, currentSessionPackage: pkg });
assert.equal(result.reviewSessionExecutionAllowed, false);
assert.equal(result.operationalActionsRemainBlocked, true);
assert.equal(result.humanReviewRequired, true);

console.log('Sprint 54 authorization validation tests passed.');
