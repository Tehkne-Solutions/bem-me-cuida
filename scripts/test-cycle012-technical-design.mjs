import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => JSON.parse(readFileSync(path, 'utf8'));
const backlog = read('release/cycle-0.12.0/backlog.json');
const plans = read('release/cycle-0.12.0/implementation-plans.json');
const contracts = read('release/cycle-0.12.0/architecture-contracts.json');
const migrations = read('release/cycle-0.12.0/migration-plan.json');

assert.equal(plans.generatedBy, 'Tehkné Solutions');
assert.equal(contracts.generatedBy, 'Tehkné Solutions');
assert.equal(plans.status, 'design-blocked');
assert.equal(contracts.status, 'proposed-blocked');
assert.equal(migrations.status, 'draft-no-migration-authorized');
assert.deepEqual(
  plans.plans.map((plan) => plan.itemId).sort(),
  backlog.items.map((item) => item.id).sort(),
);
assert.deepEqual(
  contracts.contracts.map((contract) => contract.itemId).sort(),
  backlog.items.map((item) => item.id).sort(),
);
assert.ok(plans.plans.every((plan) => plan.implementationStatus === 'blocked-awaiting-cycle-activation'));
assert.ok(plans.plans.every((plan) => plan.securityReview === 'required'));
assert.ok(plans.plans.every((plan) => plan.privacyReview === 'required'));
assert.ok(migrations.plannedChanges.every((change) => change.status === 'reserved-not-created'));
assert.equal(plans.controls.noImplementationBeforeActivation, true);
assert.equal(plans.controls.noMigrationBeforeApproval, true);
assert.equal(contracts.controls.contractsAreNotRuntimeConfiguration, true);
assert.equal(plans.privacy.containsPersonalData, false);
assert.equal(plans.privacy.containsClinicalData, false);
assert.equal(plans.privacy.containsRawFeedback, false);
assert.equal(plans.privacy.containsSecrets, false);

console.log('Testes do desenho técnico 0.12.0 aprovados.');
console.log('Tehkné Solutions');
