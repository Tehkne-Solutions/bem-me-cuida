import assert from 'node:assert/strict';
import { validateExecutionRecord } from './validate-cycle012-human-review-session-execution-record.mjs';

const record = {
  artifactType: 'human-review-session-execution-record',
  sessionIdentity: { sessionId: 'session-001', startedAt: '2026-07-28T12:00:00Z', endedAt: '2026-07-28T13:00:00Z' },
  participants: [{ name: 'Reviewer', role: 'facilitator' }],
  responses: [{ questionId: 'q1', answer: 'Reviewed' }],
  reviewChecklistResults: [{ itemId: 'c1', status: 'completed', evidenceId: 'e1' }],
  evidenceRecords: [{ evidenceId: 'e1', description: 'Administrative note', sourceReference: 'minutes', capturedAt: '2026-07-28T12:30:00Z', capturedBy: 'Reviewer' }],
  decisionRecord: { outcome: 'approved-with-follow-up', rationale: 'Administrative follow-up required', decidedBy: 'Reviewer', decidedAt: '2026-07-28T12:55:00Z' },
  closureRecord: { status: 'closed', closedAt: '2026-07-28T13:00:00Z', closedBy: 'Reviewer', nextAdministrativeStep: 'Validate record' },
  references: { executionPackageId: 'package-001', executionPackageValidationCommit: 'abc123' }
};
const context = { record, records: [record], currentExecutionPackageId: 'package-001', currentExecutionPackageValidationCommit: 'abc123', executionPackageClassification: 'current-and-compatible' };

assert.equal(validateExecutionRecord(context).classification, 'current-and-compatible');
assert.equal(validateExecutionRecord({ ...context, record: null }).classification, 'source-record-missing');
assert.equal(validateExecutionRecord({ ...context, currentExecutionPackageValidationCommit: 'new' }).classification, 'stale-execution-package-validation');
assert.equal(validateExecutionRecord({ ...context, records: [record, structuredClone(record)] }).classification, 'duplicate-record');
assert.equal(validateExecutionRecord({ ...context, records: [record, { ...structuredClone(record), decisionRecord: { ...record.decisionRecord, outcome: 'changes-required' } }] }).classification, 'conflicting-record');
assert.equal(validateExecutionRecord({ ...context, record: { ...record, responses: undefined } }).classification, 'incomplete-record');
assert.equal(validateExecutionRecord({ ...context, record: { ...record, decisionRecord: { ...record.decisionRecord, outcome: 'deploy-now' } } }).classification, 'invalid-decision');
assert.equal(validateExecutionRecord({ ...context, record: { ...record, evidenceRecords: [{ ...record.evidenceRecords[0] }, { ...record.evidenceRecords[0] }] } }).classification, 'evidence-divergence');
assert.equal(validateExecutionRecord({ ...context, record: { ...record, references: { ...record.references, executionPackageId: 'other' } } }).classification, 'invalid-record-reference');
assert.equal(validateExecutionRecord({ ...context, record: { ...record, responses: [{ questionId: 'q1', answer: 'BEGIN PATCH' }] } }).classification, 'forbidden-operational-content');
assert.equal(validateExecutionRecord(context).controls.executionAllowed, false);
assert.equal(validateExecutionRecord(context).controls.humanReviewRequired, true);

console.log('Sprint 58 execution record validation tests passed.');
