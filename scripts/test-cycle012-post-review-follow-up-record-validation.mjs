import assert from 'node:assert/strict';
import { validateFollowUpRecord } from './validate-cycle012-post-review-follow-up-record.mjs';

const currentFollowUpPackageId = 'follow-up-package-001';
const currentFollowUpPackageValidationCommit = 'validation-commit-001';

function makeRecord() {
  return {
    artifactType: 'post-review-follow-up-record',
    recordIdentity: { recordId: 'follow-up-record-001', createdAt: '2026-07-28T17:00:00Z' },
    itemUpdates: [
      {
        itemId: 'item-001',
        owner: 'governance-owner',
        status: 'completed-administratively',
        updatedAt: '2026-07-28T17:10:00Z',
        updatedBy: 'reviewer',
        summary: 'Acompanhamento documental concluído.'
      }
    ],
    evidenceRecords: [
      {
        evidenceId: 'evidence-001',
        itemId: 'item-001',
        description: 'Registro documental conferido.',
        sourceReference: 'governance://evidence/001',
        capturedAt: '2026-07-28T17:05:00Z',
        capturedBy: 'reviewer'
      }
    ],
    blockers: [
      {
        blockerId: 'blocker-001',
        itemId: 'item-001',
        status: 'resolved',
        description: 'Pendência documental resolvida.',
        recordedAt: '2026-07-28T17:06:00Z',
        recordedBy: 'reviewer'
      }
    ],
    closureSummary: {
      status: 'closed-administratively',
      summary: 'Todos os itens foram encerrados administrativamente.'
    },
    references: {
      followUpPackageId: currentFollowUpPackageId,
      followUpPackageValidationCommit: currentFollowUpPackageValidationCommit
    }
  };
}

function validate(record, records = []) {
  return validateFollowUpRecord({
    record,
    records,
    currentFollowUpPackageId,
    currentFollowUpPackageValidationCommit,
    followUpPackageClassification: 'current-and-compatible'
  });
}

const valid = makeRecord();
assert.equal(validate(valid).classification, 'current-and-compatible');
assert.equal(validate(valid).controls.executionAllowed, false);
assert.equal(validate(valid).controls.activationAllowed, false);

const stale = makeRecord();
stale.references.followUpPackageValidationCommit = 'old';
assert.equal(validate(stale).classification, 'stale-follow-up-package-validation');

const incomplete = makeRecord();
delete incomplete.closureSummary;
assert.equal(validate(incomplete).classification, 'incomplete-record');

const invalidUpdate = makeRecord();
invalidUpdate.itemUpdates[0].status = 'implemented';
assert.equal(validate(invalidUpdate).classification, 'invalid-item-update');

const divergentEvidence = makeRecord();
divergentEvidence.evidenceRecords[0].itemId = 'missing-item';
assert.equal(validate(divergentEvidence).classification, 'evidence-divergence');

const invalidBlocker = makeRecord();
invalidBlocker.blockers[0].status = 'ignored';
assert.equal(validate(invalidBlocker).classification, 'invalid-blocker');

const inconsistentClosure = makeRecord();
inconsistentClosure.itemUpdates[0].status = 'blocked';
inconsistentClosure.blockers[0].status = 'open';
assert.equal(validate(inconsistentClosure).classification, 'inconsistent-closure');

const duplicate = makeRecord();
assert.equal(validate(duplicate, [duplicate, duplicate]).classification, 'duplicate-record');

const conflict = makeRecord();
const conflicting = structuredClone(conflict);
conflicting.closureSummary.summary = 'Resumo divergente.';
assert.equal(validate(conflict, [conflict, conflicting]).classification, 'conflicting-record');

const forbidden = makeRecord();
forbidden.closureSummary.summary = 'npm run deploy';
assert.equal(validate(forbidden).classification, 'forbidden-operational-content');

assert.equal(
  validateFollowUpRecord({
    record: null,
    currentFollowUpPackageId,
    currentFollowUpPackageValidationCommit,
    followUpPackageClassification: 'current-and-compatible'
  }).classification,
  'source-record-missing'
);

process.stdout.write('Sprint 62 follow-up record validation tests passed.\n');
