import assert from 'node:assert/strict';
import { buildHumanReviewSessionExecutionPackage } from './cycle012-human-review-session-execution-package.mjs';

const base = {
  authorizationClassification: 'current-and-compatible',
  authorizationId: 'auth-session-001',
  authorizationValidationCommit: 'abc123',
  sessionPackageId: 'session-package-001',
  participants: ['reviewer-1', 'facilitator-1'],
  reviewQuestions: ['O escopo está correto?'],
  reviewChecklist: ['Referências confirmadas'],
  generatedAt: '2026-07-28T15:00:00Z',
};

const first = buildHumanReviewSessionExecutionPackage(base);
const second = buildHumanReviewSessionExecutionPackage(base);
assert.equal(first.packageId, second.packageId);
assert.equal(first.artifactType, 'human-review-session-execution-package');
assert.equal(first.controls.reviewSessionExecutionAllowed, false);
assert.equal(first.controls.patchGenerationAllowed, false);
assert.equal(first.controls.sourceMutationAllowed, false);
assert.equal(first.controls.humanReviewRequired, true);
assert.deepEqual(first.evidenceFields, ['evidenceId', 'description', 'sourceReference', 'capturedAt', 'capturedBy']);

assert.throws(
  () => buildHumanReviewSessionExecutionPackage({ ...base, authorizationClassification: 'stale-session-package-validation' }),
  /current-and-compatible/,
);
assert.throws(
  () => buildHumanReviewSessionExecutionPackage({ ...base, authorizationId: '' }),
  /Referências da autorização/,
);
assert.throws(
  () => buildHumanReviewSessionExecutionPackage({ ...base, riskNotes: ['execute git apply agora'] }),
  /Conteúdo operacional proibido/,
);

console.log('Sprint 55: pacote protegido de sessão humana validado.');
