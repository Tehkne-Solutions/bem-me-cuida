import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => JSON.parse(readFileSync(path, 'utf8'));
const review = read('release/cycle-0.12.0/review-package.json');
const threats = read('release/cycle-0.12.0/threat-model.json');
const policy = read('release/cycle-0.12.0/approval-policy.json');

assert.equal(review.generatedBy, 'Tehkné Solutions');
assert.equal(review.status, 'review-blocked');
assert.equal(review.recommendation, 'hold');
assert.equal(review.decision.status, 'blocked');
assert.equal(review.decision.eligibleForHumanApproval, false);
assert.ok(review.reviewTracks.every((track) => track.status === 'pending'));
assert.equal(new Set(review.reviewTracks.map((track) => track.requiredRole)).size, review.reviewTracks.length);
assert.equal(review.controls.selfApprovalForbidden, true);
assert.equal(review.controls.doesNotActivateCycleAutomatically, true);
assert.equal(review.controls.doesNotAuthorizeMigrations, true);
assert.equal(review.controls.doesNotAuthorizeImplementation, true);

assert.ok(threats.threats.length >= 5);
assert.ok(threats.threats.every((threat) => threat.mitigations.length >= 2));
assert.ok(threats.threats.every((threat) => ['low', 'medium'].includes(threat.residualRisk)));
assert.equal(threats.controls.noRuntimeActivation, true);
assert.equal(threats.controls.noSensitiveEvidence, true);

assert.ok(policy.reviewerRules.minimumDistinctReviewers >= 3);
assert.equal(policy.reviewerRules.authorCannotApprove, true);
assert.equal(policy.reviewerRules.securityAndPrivacyMustBeDistinct, true);
assert.equal(policy.approvalRecord.status, 'pending');
assert.deepEqual(policy.approvalRecord.reviewers, []);
assert.equal(policy.activationRules.automaticActivationAllowed, false);
assert.equal(policy.activationRules.migrationsRemainBlockedUntilActivation, true);
assert.equal(policy.activationRules.implementationRemainsBlockedUntilActivation, true);

for (const value of Object.values(review.privacy)) assert.equal(value, false);

console.log('Testes do pacote de revisão 0.12.0 aprovados.');
console.log('Tehkné Solutions');
