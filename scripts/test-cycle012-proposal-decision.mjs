import assert from 'node:assert/strict';
import { buildProposalDecision } from './lib/cycle012-proposal-decision.mjs';
import policy from '../release/cycle-0.12.0/proposal-decision-policy.json' with { type: 'json' };

const sourceCommit = 'a'.repeat(40);
const base = { proposalId: 'proposal-12345678', classification: 'current-and-compatible' };
const accepted = buildProposalDecision({ validationItem: base, decision: 'accept-for-future-correction', actorId: '42', sourceCommit, decidedAt: '2026-07-27T18:30:00.000Z', policy });
assert.equal(accepted.executionAllowed, false);
assert.equal(accepted.correctionAuthorized, false);
assert.equal(accepted.activationAllowed, false);
assert.match(accepted.deciderFingerprint, /^sha256:[a-f0-9]{64}$/);

assert.throws(() => buildProposalDecision({ validationItem: { ...base, classification: 'stale-reconciliation' }, decision: 'accept-for-future-correction', actorId: '42', sourceCommit, decidedAt: '2026-07-27T18:30:00.000Z', policy }), /incompatível/);

for (const classification of ['current-and-compatible','stale-reconciliation','duplicate-proposal','conflicting-proposal','source-item-missing','action-classification-mismatch','invalid-proposal-reference']) {
  const rejected = buildProposalDecision({ validationItem: { ...base, classification }, decision: 'reject-proposal', actorId: '42', sourceCommit, decidedAt: '2026-07-27T18:30:00.000Z', policy });
  assert.equal(rejected.decision, 'reject-proposal');
}

for (const classification of ['stale-reconciliation','duplicate-proposal','conflicting-proposal','source-item-missing','action-classification-mismatch','invalid-proposal-reference']) {
  const replacement = buildProposalDecision({ validationItem: { ...base, classification }, decision: 'request-replacement', actorId: '42', sourceCommit, decidedAt: '2026-07-27T18:30:00.000Z', policy });
  assert.equal(replacement.decision, 'request-replacement');
}

console.log('Decisões humanas do ciclo 0.12.0 validadas em modo fail-closed.');
console.log('Tehkné Solutions');
