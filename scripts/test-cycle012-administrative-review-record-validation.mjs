import assert from 'node:assert/strict';
import fs from 'node:fs';
import { validateAdministrativeReviewRecord } from './lib/cycle012-administrative-review-record-validation.mjs';

const policy = JSON.parse(fs.readFileSync('release/cycle-0.12.0/administrative-review-record-validation-policy.json', 'utf8'));
const record = {
  recordId: 'review-record-001',
  recordKind: 'administrative-review-record',
  packageId: 'pkg-001',
  packageValidationCommit: 'abc123',
  decision: 'allow-human-administrative-review',
  reviewer: 'reviewer-001'
};
const currentPackage = {
  packageId: 'pkg-001',
  validationCommit: 'abc123',
  classification: 'current-and-compatible'
};

assert.equal(validateAdministrativeReviewRecord({ record, currentPackage }, policy).classification, 'current-and-compatible');
assert.equal(validateAdministrativeReviewRecord({ record: null, currentPackage }, policy).classification, 'source-record-missing');
assert.equal(validateAdministrativeReviewRecord({ record: { ...record, recordKind: 'wrong' }, currentPackage }, policy).classification, 'invalid-record-reference');
assert.equal(validateAdministrativeReviewRecord({ record, currentPackage: { ...currentPackage, validationCommit: 'new' } }, policy).classification, 'stale-package-validation');
assert.equal(validateAdministrativeReviewRecord({ record: { ...record, decision: 'deny' }, currentPackage }, policy).classification, 'record-classification-mismatch');
assert.equal(validateAdministrativeReviewRecord({ record, currentPackage, siblingRecords: [{ ...record, recordId: 'review-record-002' }] }, policy).classification, 'duplicate-record');
assert.equal(validateAdministrativeReviewRecord({ record, currentPackage, siblingRecords: [{ ...record, recordId: 'review-record-003', reviewer: 'reviewer-002' }] }, policy).classification, 'conflicting-record');
assert.throws(() => validateAdministrativeReviewRecord({ record, currentPackage }, { ...policy, operationalActionsRemainBlocked: false }), /unsafe-policy/);

console.log('Sprint 50 administrative review record validation tests passed.');
