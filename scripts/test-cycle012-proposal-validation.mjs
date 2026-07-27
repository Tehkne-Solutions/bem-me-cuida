import assert from 'node:assert/strict';
import { validateResolutionProposals } from './lib/cycle012-proposal-validation.mjs';

const shaA = 'a'.repeat(40);
const shaB = 'b'.repeat(40);
const validationPolicy = {
  cycleVersion: '0.12.0',
  classifications: ['current-and-compatible','stale-reconciliation','duplicate-proposal','conflicting-proposal','source-item-missing','action-classification-mismatch','invalid-proposal-reference'],
  severity: {
    'current-and-compatible':'info','stale-reconciliation':'warning','duplicate-proposal':'warning','conflicting-proposal':'critical','source-item-missing':'critical','action-classification-mismatch':'critical','invalid-proposal-reference':'critical'
  },
  controls: { readOnly:true, deterministic:true, doesNotApproveProposals:true, doesNotApplyProposals:true, doesNotRewriteProposals:true, doesNotChangeReconciliation:true, doesNotChangeQueue:true, doesNotChangeGates:true, doesNotActivateCycle:true, doesNotAuthorizeMigrations:true, doesNotAuthorizeImplementation:true, doesNotMergePullRequests:true, doesNotPublishBuilds:true },
  privacy: { containsPersonalData:false, containsClinicalData:false, containsRawFeedback:false, containsJournalContent:false, containsSecrets:false, containsRawIdentity:false, containsPseudonymousActorReference:false }
};
const resolutionPolicy = { actionsByClassification: { 'stale-source-commit':['propose-refresh-against-current-source'], 'state-conflict':['request-conflict-resolution'] } };
const reconciliation = { cycleVersion:'0.12.0', mutationAllowed:false, sourceCommit:shaA, items:[{ recordId:'rec-1', classification:'stale-source-commit' }, { recordId:'rec-2', classification:'state-conflict' }] };
const proposal = (overrides={}) => ({ proposalId:'prop-1', cycleVersion:'0.12.0', recordId:'rec-1', requestedAction:'propose-refresh-against-current-source', reconciliationSourceCommit:shaA, ...overrides });

let report = validateResolutionProposals({ reconciliation, proposals:[proposal()], resolutionPolicy, validationPolicy, generatedAt:'2026-07-27T00:00:00.000Z' });
assert.equal(report.items[0].classification, 'current-and-compatible');
assert.equal(report.approvalAllowed, false);
assert.equal(report.executionAllowed, false);

report = validateResolutionProposals({ reconciliation, proposals:[proposal({ reconciliationSourceCommit:shaB })], resolutionPolicy, validationPolicy, generatedAt:'2026-07-27T00:00:00.000Z' });
assert.equal(report.items[0].classification, 'stale-reconciliation');

report = validateResolutionProposals({ reconciliation, proposals:[proposal(), proposal({ proposalId:'prop-2' })], resolutionPolicy, validationPolicy, generatedAt:'2026-07-27T00:00:00.000Z' });
assert.ok(report.items.every((item) => item.classification === 'duplicate-proposal'));

report = validateResolutionProposals({ reconciliation, proposals:[proposal(), proposal({ proposalId:'prop-3', requestedAction:'request-conflict-resolution' })], resolutionPolicy, validationPolicy, generatedAt:'2026-07-27T00:00:00.000Z' });
assert.ok(report.items.some((item) => item.classification === 'conflicting-proposal'));

report = validateResolutionProposals({ reconciliation, proposals:[proposal({ recordId:'missing' })], resolutionPolicy, validationPolicy, generatedAt:'2026-07-27T00:00:00.000Z' });
assert.equal(report.items[0].classification, 'source-item-missing');

report = validateResolutionProposals({ reconciliation, proposals:[proposal({ requestedAction:'request-conflict-resolution' })], resolutionPolicy, validationPolicy, generatedAt:'2026-07-27T00:00:00.000Z' });
assert.equal(report.items[0].classification, 'action-classification-mismatch');

console.log('Testes da validação de propostas 0.12.0 aprovados.');
console.log('Tehkné Solutions');
