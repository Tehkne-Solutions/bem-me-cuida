import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => JSON.parse(readFileSync(path, 'utf8'));
const scope = read('release/cycle-0.12.0/scope.json');
const backlog = read('release/cycle-0.12.0/backlog.json');
const gates = read('release/cycle-0.12.0/acceptance-gates.json');

assert.equal(backlog.generatedBy, 'Tehkné Solutions');
assert.equal(gates.generatedBy, 'Tehkné Solutions');
assert.deepEqual(
  backlog.items.map((item) => item.id).sort(),
  scope.items.map((item) => item.id).sort(),
);
assert.equal(backlog.controls.doesNotActivateCycleAutomatically, true);
assert.equal(gates.controls.failClosed, true);
assert.equal(gates.permissions.implementationBranchesAllowed, false);
assert.equal(gates.permissions.migrationsAllowed, false);
assert.equal(gates.permissions.automaticActivationAllowed, false);
assert.ok(gates.gates.every((gate) => gate.status === 'pending' || gate.status === 'blocked'));
assert.ok(backlog.items.every((item) => item.implementationStatus === 'blocked-awaiting-cycle-activation'));
assert.ok(backlog.items.every((item) => item.acceptanceCriteria.length >= 3));
assert.equal(backlog.privacy.containsPersonalData, false);
assert.equal(backlog.privacy.containsClinicalData, false);
assert.equal(backlog.privacy.containsRawFeedback, false);

console.log('Testes do planejamento 0.12.0 aprovados.');
console.log('Tehkné Solutions');
