import assert from 'node:assert/strict';
import { generateFollowUpRecord } from './generate-cycle012-post-review-follow-up-record.mjs';

const base = {
  followUpPackageClassification: 'current-and-compatible',
  recordIdentity: { recordId: 'follow-up-record-001', createdAt: '2026-07-28T18:00:00Z', createdBy: 'human-review-board' },
  itemUpdates: [{ itemId: 'item-001', owner: 'product-owner', status: 'planned', updatedAt: '2026-07-28T18:00:00Z', updatedBy: 'facilitator', summary: 'Acompanhamento administrativo registrado.' }],
  evidenceRecords: [{ evidenceId: 'evidence-001', itemId: 'item-001', description: 'Ata administrativa.', sourceReference: 'session-record-001', capturedAt: '2026-07-28T18:00:00Z', capturedBy: 'facilitator' }],
  blockers: [{ blockerId: 'blocker-001', itemId: 'item-001', status: 'open', summary: 'Aguardando decisão humana complementar.' }],
  closureSummary: { status: 'open', closedAt: null, closedBy: null, remainingItems: ['item-001'] },
  references: { followUpPackageId: 'follow-up-package-001', followUpPackageValidationCommit: 'commit-001' }
};

const first = generateFollowUpRecord(base);
const second = generateFollowUpRecord({ ...base, itemUpdates: [...base.itemUpdates].reverse() });
assert.deepEqual(first, second);
assert.equal(first.artifactType, 'post-review-follow-up-record');
assert.equal(first.controls.sourceMutationAllowed, false);
assert.equal(Object.isFrozen(first), true);

assert.throws(() => generateFollowUpRecord({ ...base, followUpPackageClassification: 'incomplete-package' }), /current-and-compatible/);
assert.throws(() => generateFollowUpRecord({ ...base, itemUpdates: [{ ...base.itemUpdates[0], owner: '' }] }), /missing item update field/);
assert.throws(() => generateFollowUpRecord({ ...base, itemUpdates: [{ ...base.itemUpdates[0], status: 'implemented' }] }), /invalid item status/);
assert.throws(() => generateFollowUpRecord({ ...base, blockers: [{ ...base.blockers[0], status: 'executing' }] }), /invalid blocker status/);
assert.throws(() => generateFollowUpRecord({ ...base, closureSummary: { notes: 'git apply patch.diff' } }), /forbidden operational content/);

process.stdout.write('Sprint 61 follow-up record tests passed.\n');
