import crypto from 'node:crypto';

const REQUIRED_CLASSIFICATION = 'current-and-compatible';
const ALLOWED_OUTCOMES = new Set([
  'approved-administratively',
  'approved-with-follow-up',
  'changes-required',
  'inconclusive',
  'cancelled'
]);
const FORBIDDEN = [
  'diff --git',
  'BEGIN PATCH',
  'replacementContent',
  'migrationSql',
  'supabase db push',
  'git apply',
  'npm run deploy',
  'eas submit'
];

function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stable(value[key])]));
  }
  return value;
}

function assertText(value, name) {
  if (typeof value !== 'string' || !value.trim()) throw new Error(`${name} is required`);
  return value.trim();
}

function assertNoOperationalContent(value) {
  const serialized = JSON.stringify(value);
  const match = FORBIDDEN.find((pattern) => serialized.includes(pattern));
  if (match) throw new Error(`forbidden operational content: ${match}`);
}

export function createHumanReviewSessionExecutionRecord(input) {
  if (input.executionPackageClassification !== REQUIRED_CLASSIFICATION) {
    throw new Error('execution package must be current-and-compatible');
  }

  const outcome = assertText(input.decisionRecord?.outcome, 'decisionRecord.outcome');
  if (!ALLOWED_OUTCOMES.has(outcome)) throw new Error('unsupported decision outcome');

  const record = stable({
    artifactType: 'cycle012-human-review-session-execution-record',
    schemaVersion: '1.0.0',
    cycle: '0.12.0',
    sessionIdentity: {
      sessionId: assertText(input.sessionIdentity?.sessionId, 'sessionIdentity.sessionId'),
      startedAt: assertText(input.sessionIdentity?.startedAt, 'sessionIdentity.startedAt'),
      endedAt: assertText(input.sessionIdentity?.endedAt, 'sessionIdentity.endedAt'),
      facilitator: assertText(input.sessionIdentity?.facilitator, 'sessionIdentity.facilitator'),
      mode: 'manual-human-review'
    },
    participants: Array.isArray(input.participants) ? input.participants : [],
    responses: Array.isArray(input.responses) ? input.responses : [],
    reviewChecklistResults: Array.isArray(input.reviewChecklistResults) ? input.reviewChecklistResults : [],
    evidenceRecords: Array.isArray(input.evidenceRecords) ? input.evidenceRecords : [],
    decisionRecord: {
      outcome,
      rationale: assertText(input.decisionRecord?.rationale, 'decisionRecord.rationale'),
      decidedBy: assertText(input.decisionRecord?.decidedBy, 'decisionRecord.decidedBy'),
      decidedAt: assertText(input.decisionRecord?.decidedAt, 'decisionRecord.decidedAt'),
      followUpRequired: Boolean(input.decisionRecord?.followUpRequired)
    },
    closureRecord: {
      status: assertText(input.closureRecord?.status, 'closureRecord.status'),
      closedAt: assertText(input.closureRecord?.closedAt, 'closureRecord.closedAt'),
      closedBy: assertText(input.closureRecord?.closedBy, 'closureRecord.closedBy'),
      openQuestions: Array.isArray(input.closureRecord?.openQuestions) ? input.closureRecord.openQuestions : [],
      nextAdministrativeStep: assertText(input.closureRecord?.nextAdministrativeStep, 'closureRecord.nextAdministrativeStep')
    },
    references: {
      executionPackageId: assertText(input.executionPackageId, 'executionPackageId'),
      executionPackageValidationCommit: assertText(input.executionPackageValidationCommit, 'executionPackageValidationCommit')
    },
    controls: {
      executionRecordGenerationAllowed: true,
      reviewSessionExecutionAllowed: false,
      functionalBranchCreationAllowed: false,
      pullRequestOpeningAllowed: false,
      patchGenerationAllowed: false,
      sourceMutationAllowed: false,
      executionAllowed: false,
      correctionAuthorized: false,
      mergeAllowed: false,
      activationAllowed: false,
      humanReviewRequired: true
    }
  });

  assertNoOperationalContent(record);
  const canonical = JSON.stringify(record);
  return Object.freeze({
    ...record,
    recordId: `cycle012-session-record-${crypto.createHash('sha256').update(canonical).digest('hex').slice(0, 16)}`
  });
}
