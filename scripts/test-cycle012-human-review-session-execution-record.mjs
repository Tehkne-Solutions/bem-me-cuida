import assert from 'node:assert/strict';
import { createHumanReviewSessionExecutionRecord } from './cycle012-human-review-session-execution-record.mjs';

const base = {
  executionPackageClassification: 'current-and-compatible',
  executionPackageId: 'pkg-001',
  executionPackageValidationCommit: 'abc123',
  sessionIdentity: {
    sessionId: 'session-001',
    startedAt: '2026-07-28T12:00:00-03:00',
    endedAt: '2026-07-28T13:00:00-03:00',
    facilitator: 'human-reviewer'
  },
  participants: [{ participantId: 'p1', role: 'reviewer', attended: true }],
  responses: [{ questionId: 'q1', response: 'Reviewed', answeredBy: 'p1' }],
  reviewChecklistResults: [{ itemId: 'c1', status: 'completed', notes: 'ok' }],
  evidenceRecords: [{ evidenceId: 'e1', description: 'minutes', sourceReference: 'ref-1', capturedAt: '2026-07-28T12:30:00-03:00', capturedBy: 'p1' }],
  decisionRecord: {
    outcome: 'approved-with-follow-up',
    rationale: 'Administrative follow-up remains required.',
    decidedBy: 'p1',
    decidedAt: '2026-07-28T12:55:00-03:00',
    followUpRequired: true
  },
  closureRecord: {
    status: 'closed',
    closedAt: '2026-07-28T13:00:00-03:00',
    closedBy: 'p1',
    openQuestions: ['Confirm next administrative gate'],
    nextAdministrativeStep: 'Validate the execution record.'
  }
};

const first = createHumanReviewSessionExecutionRecord(base);
const second = createHumanReviewSessionExecutionRecord(structuredClone(base));
assert.deepEqual(first, second);
assert.equal(first.recordId, second.recordId);
assert.equal(first.controls.executionAllowed, false);
assert.equal(first.controls.patchGenerationAllowed, false);
assert.equal(first.controls.reviewSessionExecutionAllowed, false);
assert.equal(first.artifactType, 'cycle012-human-review-session-execution-record');

assert.throws(() => createHumanReviewSessionExecutionRecord({ ...base, executionPackageClassification: 'stale' }), /current-and-compatible/);
assert.throws(() => createHumanReviewSessionExecutionRecord({ ...base, decisionRecord: { ...base.decisionRecord, outcome: 'deploy' } }), /unsupported decision outcome/);
assert.throws(() => createHumanReviewSessionExecutionRecord({ ...base, responses: [{ questionId: 'q1', response: 'diff --git a b' }] }), /forbidden operational content/);
assert.throws(() => createHumanReviewSessionExecutionRecord({ ...base, executionPackageId: '' }), /executionPackageId is required/);

console.log('Sprint 57 execution record tests passed.');
