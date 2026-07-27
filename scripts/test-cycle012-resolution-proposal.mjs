import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { buildResolutionProposal, renderResolutionProposalMarkdown } from './lib/cycle012-resolution-proposal.mjs';

const reconciliationPolicy = JSON.parse(readFileSync('release/cycle-0.12.0/queue-reconciliation-policy.json', 'utf8'));
const proposalPolicy = JSON.parse(readFileSync('release/cycle-0.12.0/resolution-proposal-policy.json', 'utf8'));
const sourceCommit = 'a'.repeat(40);
const submittedAt = '2026-07-27T18:00:00.000Z';
const classifications = Object.keys(proposalPolicy.actionsByClassification);

const items = classifications.map((classification, index) => ({
  recordId: `queue-update-${String(index + 1).padStart(20, '0')}`,
  queueItemId: classification === 'invalid-item-reference' ? 'invalid-catalog-item' : `external-test-${index + 1}`,
  classification,
  severity: reconciliationPolicy.severity[classification],
  source: classification.startsWith('invalid') ? 'unknown' : `external:test-${index + 1}`,
  submittedAt,
  recordSourceCommit: classification === 'stale-source-commit' ? 'b'.repeat(40) : sourceCommit,
  currentSourceCommit: sourceCommit,
  progressState: 'in-progress',
  dependencyState: 'unchanged',
  dependencyIds: [],
  evidenceKind: 'none',
  evidenceUrl: null,
  currentItemPresent: classification !== 'source-reflected-closed',
  currentItemStatus: 'waiting-on-dependencies',
  currentItemReady: false,
  currentDependencies: [],
  mutationAllowed: false,
}));

const report = {
  schemaVersion: '1.0',
  product: 'BemMeCuida',
  generatedBy: 'Tehkné Solutions',
  cycleVersion: '0.12.0',
  artifactType: 'cycle012-queue-reconciliation',
  generatedAt: submittedAt,
  sourceCommit,
  status: 'critical-divergence-review-required',
  recommendation: 'human-review-required',
  activationAllowed: false,
  mutationAllowed: false,
  summary: {
    recordCount: items.length,
    criticalCount: items.filter((item) => item.severity === 'critical').length,
    warningCount: items.filter((item) => item.severity === 'warning').length,
    infoCount: items.filter((item) => item.severity === 'info').length,
    byClassification: Object.fromEntries(classifications.map((classification) => [classification, 1])),
  },
  items,
  controls: { ...reconciliationPolicy.controls },
  privacy: {
    containsPersonalData: false,
    containsClinicalData: false,
    containsRawFeedback: false,
    containsJournalContent: false,
    containsSecrets: false,
    containsRawIdentity: false,
    containsPseudonymousActorReference: false,
  },
};

for (const item of items) {
  const requestedAction = proposalPolicy.actionsByClassification[item.classification][0];
  const proposal = buildResolutionProposal({
    report,
    reconciliationPolicy,
    proposalPolicy,
    recordId: item.recordId,
    requestedAction,
    actorId: '196457715',
    submittedAt,
  });
  assert.equal(proposal.reconciliation.classification, item.classification);
  assert.equal(proposal.requestedAction, requestedAction);
  assert.equal(proposal.target.type, proposalPolicy.targetByClassification[item.classification]);
  assert.equal(proposal.status, 'proposal-awaiting-independent-human-review');
  assert.equal(proposal.effect, 'proposal-only-no-source-mutation');
  assert.match(proposal.proposerFingerprint, /^sha256:[a-f0-9]{64}$/);
  assert.equal(proposal.controls.doesNotChangeGates, true);
  assert.equal(proposal.controls.doesNotActivateCycle, true);
  assert.equal(proposal.controls.doesNotAuthorizeMigrations, true);
  assert.equal(proposal.controls.doesNotAuthorizeImplementation, true);
  const serialized = JSON.stringify(proposal);
  assert.equal(serialized.includes('196457715'), false);
  const markdown = renderResolutionProposalMarkdown(proposal);
  assert.equal(markdown.includes('sha256:'), false);
  assert.equal(markdown.includes('Aplicação automática: **não**'), true);
}

assert.throws(() => buildResolutionProposal({
  report,
  reconciliationPolicy,
  proposalPolicy,
  recordId: items[0].recordId,
  requestedAction: 'request-conflict-resolution',
  actorId: '196457715',
  submittedAt,
}), /Ação não permitida/);

assert.throws(() => buildResolutionProposal({
  report,
  reconciliationPolicy,
  proposalPolicy,
  recordId: 'queue-update-ffffffffffffffffffff',
  requestedAction: 'confirm-open-no-source-change',
  actorId: '196457715',
  submittedAt,
}), /Registro não encontrado/);

assert.throws(() => buildResolutionProposal({
  report: { ...report, mutationAllowed: true },
  reconciliationPolicy,
  proposalPolicy,
  recordId: items[0].recordId,
  requestedAction: proposalPolicy.actionsByClassification[items[0].classification][0],
  actorId: '196457715',
  submittedAt,
}), /Reconciliação não pode ativar o ciclo nem produzir mutações/);

assert.throws(() => buildResolutionProposal({
  report,
  reconciliationPolicy,
  proposalPolicy,
  recordId: items[0].recordId,
  requestedAction: proposalPolicy.actionsByClassification[items[0].classification][0],
  actorId: 'actor-name',
  submittedAt,
}), /actorId inválido/);

console.log('Testes das propostas humanas de resolução aprovados.');
console.log('Tehkné Solutions');
