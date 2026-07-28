import assert from 'node:assert/strict';
import fs from 'node:fs';
import { validateHumanReviewSessionPackage } from './lib/cycle012-human-review-session-package-validation.mjs';

const policy = JSON.parse(fs.readFileSync('release/cycle-0.12.0/human-review-session-package-validation-policy.json', 'utf8'));
const questions = ['O escopo continua correto?', 'As referências permanecem atuais?'];
const checklist = ['human-review-required', 'scope-confirmed', 'references-current'];
const pkg = {
  packageId: 'session-pkg-001',
  packageKind: 'human-review-session-package',
  references: {
    reviewRecordId: 'record-001',
    reviewRecordValidationCommit: 'abc123'
  },
  reviewQuestions: questions,
  reviewChecklist: checklist
};
const currentReviewRecord = {
  recordId: 'record-001',
  validationCommit: 'abc123',
  classification: 'current-and-compatible'
};

const validate = (overrides = {}) => validateHumanReviewSessionPackage({
  pkg,
  currentReviewRecord,
  expectedQuestions: questions,
  expectedChecklist: checklist,
  ...overrides
}, policy);

assert.equal(validate().classification, 'current-and-compatible');
assert.equal(validate({ pkg: null }).classification, 'source-package-missing');
assert.equal(validate({ pkg: { ...pkg, packageKind: 'wrong' } }).classification, 'invalid-package-reference');
assert.equal(validate({ currentReviewRecord: { ...currentReviewRecord, validationCommit: 'new' } }).classification, 'stale-source-validation');
assert.equal(validate({ pkg: { ...pkg, reviewQuestions: ['Outra pergunta'] } }).classification, 'questions-divergence');
assert.equal(validate({ pkg: { ...pkg, reviewChecklist: ['outro-item'] } }).classification, 'checklist-divergence');
assert.equal(validate({ pkg: { ...pkg, context: 'diff --git a/x b/x' } }).classification, 'forbidden-operational-content');
assert.equal(validate({ siblingPackages: [{ ...pkg, packageId: 'session-pkg-002' }] }).classification, 'duplicate-package');
assert.equal(validate({ siblingPackages: [{ ...pkg, packageId: 'session-pkg-003', reviewQuestions: ['Conflito'] }] }).classification, 'conflicting-package');
assert.throws(() => validateHumanReviewSessionPackage({ pkg, currentReviewRecord, expectedQuestions: questions, expectedChecklist: checklist }, { ...policy, controls: { ...policy.controls, executionAllowed: true } }), /unsafe-policy-control/);

console.log('Sprint 52 human review session package validation tests passed.');
