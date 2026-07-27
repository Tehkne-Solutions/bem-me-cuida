import assert from 'node:assert/strict';
import { buildDecisionValidation } from './lib/cycle012-decision-validation.mjs';

const policy = JSON.parse(await (await import('node:fs/promises')).readFile('release/cycle-0.12.0/decision-validation-policy.json', 'utf8'));
const sourceCommit = 'a'.repeat(40);
const proposalValidation = {
  cycleVersion: '0.12.0', sourceCommit,
  items: [
    { proposalId: 'proposal-current', classification: 'current-and-compatible' },
    { proposalId: 'proposal-stale', classification: 'stale-reconciliation' }
  ]
};
const decision = (overrides = {}) => ({
  decisionId: 'decision-1', proposalId: 'proposal-current', decision: 'accept-for-future-correction',
  proposalValidationSourceCommit: sourceCommit, ...overrides
});
const build = (decisions) => buildDecisionValidation({ decisions, proposalValidation, policy, generatedAt: '2026-07-27T00:00:00.000Z' });

assert.equal(build([decision()]).items[0].classification, 'current-and-compatible');
assert.equal(build([decision({ proposalValidationSourceCommit: 'b'.repeat(40) })]).items[0].classification, 'stale-proposal-validation');
assert.ok(build([decision(), decision({ decisionId: 'decision-2' })]).items.every((item) => item.classification === 'duplicate-decision'));
assert.ok(build([decision(), decision({ decisionId: 'decision-2', decision: 'reject-proposal' })]).items.every((item) => item.classification === 'conflicting-decision'));
assert.equal(build([decision({ proposalId: 'missing' })]).items[0].classification, 'proposal-missing');
assert.equal(build([decision({ proposalId: 'proposal-stale' })]).items[0].classification, 'decision-classification-mismatch');
assert.equal(build([{ decisionId: '', proposalId: '', decision: '' }]).items[0].classification, 'invalid-decision-reference');
assert.equal(build([]).executionAllowed, false);
console.log('Sprint 42: testes da validação das decisões aprovados.');
