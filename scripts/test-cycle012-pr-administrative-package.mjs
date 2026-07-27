import assert from 'node:assert/strict';
import fs from 'node:fs';
import { buildAdministrativePackage, packageId } from './lib/cycle012-pr-administrative-package.mjs';

const policy = JSON.parse(fs.readFileSync('release/cycle-0.12.0/pr-administrative-package-policy.json', 'utf8'));
const base = {
  cycle: '0.12.0',
  authorizationId: 'auth-001',
  authorizationValidationCommit: 'abc123',
  authorizationClassification: 'current-and-compatible',
  planId: 'plan-001',
  decisionId: 'decision-001',
  proposalId: 'proposal-001',
  title: 'fix: prepare reviewed correction',
  summary: 'Administrative metadata only; no implementation is included.',
  allowedScope: ['apps/mobile/src/example.ts', 'docs/example.md'],
  riskNotes: ['No source mutation is authorized.'],
  controls: {
    pullRequestPreparationAllowed: false,
    patchGenerationAllowed: false,
    sourceMutationAllowed: false,
    executionAllowed: false
  }
};

const pkg = buildAdministrativePackage(base, policy);
assert.equal(pkg.packageKind, 'pr-administrative-review-package');
assert.equal(pkg.controls.administrativePackageGenerationAllowed, true);
assert.equal(pkg.controls.functionalBranchCreationAllowed, false);
assert.equal(pkg.controls.pullRequestOpeningAllowed, false);
assert.equal(pkg.controls.patchGenerationAllowed, false);
assert.equal(pkg.controls.sourceMutationAllowed, false);
assert.equal(pkg.controls.executionAllowed, false);
assert.equal(pkg.controls.mergeAllowed, false);
assert.equal(pkg.controls.activationAllowed, false);
assert.equal(pkg.controls.humanReviewRequired, true);
assert.deepEqual(pkg.allowedScope, ['apps/mobile/src/example.ts', 'docs/example.md']);
assert.equal(packageId(base), packageId({ ...base, allowedScope: [...base.allowedScope].reverse() }));

assert.throws(() => buildAdministrativePackage({ ...base, authorizationClassification: 'stale-plan-validation' }, policy), /authorization-not-current/);
assert.throws(() => buildAdministrativePackage({ ...base, authorizationId: '' }, policy), /missing-authorization-reference/);
assert.throws(() => buildAdministrativePackage({ ...base, allowedScope: [] }, policy), /allowed-scope-required/);
assert.throws(() => buildAdministrativePackage({ ...base, controls: { executionAllowed: true } }, policy), /source-controls-must-remain-closed/);
assert.throws(() => buildAdministrativePackage({ ...base, summary: 'diff --git a/x b/x' }, policy), /forbidden-operational-content/);
assert.throws(() => buildAdministrativePackage(base, { ...policy, controls: { ...policy.controls, pullRequestOpeningAllowed: true } }), /unsafe-policy-control/);

console.log('Sprint 47 administrative package tests passed.');
