import assert from 'node:assert/strict';
import { generatePostReviewFollowUpPackage } from './generate-cycle012-post-review-follow-up-package.mjs';

const base = {
  executionRecordClassification: 'current-and-compatible',
  packageIdentity: { cycle: '0.12.0', createdAt: '2026-07-28T16:00:00Z', createdBy: 'governance' },
  decisionSummary: { outcome: 'approved-with-follow-up', rationale: 'Acompanhamento administrativo necessário.', decidedBy: 'review-board', decidedAt: '2026-07-28T15:55:00Z' },
  followUpItems: [{ itemId: 'FU-001', title: 'Consolidar critérios', owner: 'governance-owner', priority: 'high', status: 'planned', completionCriterion: 'Critérios revisados e registrados.' }],
  completionCriteria: ['Todos os itens possuem responsável e critério verificável.'],
  riskNotes: ['Nenhuma implementação funcional está autorizada.'],
  references: { executionRecordId: 'record-001', executionRecordValidationCommit: 'abc123' }
};

const first = generatePostReviewFollowUpPackage(base);
const second = generatePostReviewFollowUpPackage(base);
assert.deepEqual(first, second);
assert.equal(first.artifactType, 'post-review-follow-up-package');
assert.equal(first.controls.followUpPackageGenerationAllowed, true);
for (const key of ['reviewSessionExecutionAllowed','functionalBranchCreationAllowed','pullRequestOpeningAllowed','patchGenerationAllowed','sourceMutationAllowed','executionAllowed','correctionAuthorized','mergeAllowed','activationAllowed']) {
  assert.equal(first.controls[key], false);
}
assert.equal(first.controls.humanReviewRequired, true);
assert.throws(() => generatePostReviewFollowUpPackage({ ...base, executionRecordClassification: 'stale-execution-package-validation' }));
assert.throws(() => generatePostReviewFollowUpPackage({ ...base, decisionSummary: { ...base.decisionSummary, outcome: 'cancelled' } }));
assert.throws(() => generatePostReviewFollowUpPackage({ ...base, followUpItems: [{ ...base.followUpItems[0], priority: 'urgent' }] }));
assert.throws(() => generatePostReviewFollowUpPackage({ ...base, riskNotes: ['npm run deploy'] }));
console.log('Sprint 59 follow-up package tests passed.');
