import assert from 'node:assert/strict';
import fs from 'node:fs';
import { validateAdministrativePackage } from './lib/cycle012-pr-administrative-package-validation.mjs';

const policy = JSON.parse(fs.readFileSync('release/cycle-0.12.0/pr-administrative-package-validation-policy.json', 'utf8'));
const pkg = {
  packageId: 'pkg-001',
  packageKind: 'pr-administrative-review-package',
  references: {
    authorizationId: 'auth-001',
    authorizationValidationCommit: 'abc123'
  },
  allowedScope: ['apps/mobile/src/example.ts'],
  reviewChecklist: [...policy.requiredChecklist],
  controls: { executionAllowed: false }
};
const currentAuthorization = {
  authorizationId: 'auth-001',
  validationCommit: 'abc123',
  classification: 'current-and-compatible',
  allowedScope: ['apps/mobile/src/example.ts']
};

assert.equal(validateAdministrativePackage({ pkg, currentAuthorization }, policy).classification, 'current-and-compatible');
assert.equal(validateAdministrativePackage({ pkg: null, currentAuthorization }, policy).classification, 'source-package-missing');
assert.equal(validateAdministrativePackage({ pkg: { ...pkg, packageKind: 'wrong' }, currentAuthorization }, policy).classification, 'invalid-package-reference');
assert.equal(validateAdministrativePackage({ pkg, currentAuthorization: { ...currentAuthorization, validationCommit: 'new' } }, policy).classification, 'stale-authorization-validation');
assert.equal(validateAdministrativePackage({ pkg: { ...pkg, summary: 'diff --git a/x b/x' }, currentAuthorization }, policy).classification, 'forbidden-operational-content');
assert.equal(validateAdministrativePackage({ pkg: { ...pkg, allowedScope: ['docs/other.md'] }, currentAuthorization }, policy).classification, 'scope-divergence');
assert.equal(validateAdministrativePackage({ pkg, currentAuthorization, siblingPackages: [{ ...pkg, packageId: 'pkg-002' }] }, policy).classification, 'duplicate-package');
assert.equal(validateAdministrativePackage({ pkg, currentAuthorization, siblingPackages: [{ ...pkg, packageId: 'pkg-003', allowedScope: ['docs/other.md'] }] }, policy).classification, 'conflicting-package');
assert.throws(() => validateAdministrativePackage({ pkg, currentAuthorization }, { ...policy, controls: { ...policy.controls, mergeAllowed: true } }), /unsafe-policy-control/);

console.log('Sprint 48 administrative package validation tests passed.');
