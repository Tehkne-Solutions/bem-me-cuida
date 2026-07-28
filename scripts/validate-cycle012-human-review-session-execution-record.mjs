import fs from 'node:fs';

const policyPath = new URL('../governance/cycle-0.12/human-review-session-execution-record-validation-policy.json', import.meta.url);
const policy = JSON.parse(fs.readFileSync(policyPath, 'utf8'));

export function validateExecutionRecord({ record, records = [], currentExecutionPackageId, currentExecutionPackageValidationCommit, executionPackageClassification }) {
  if (!record) return result('source-record-missing');

  const serialized = JSON.stringify(record);
  if (policy.forbiddenTokens.some((token) => serialized.includes(token))) return result('forbidden-operational-content');
  if (record.artifactType !== 'human-review-session-execution-record') return result('invalid-record-reference');
  if (record.references?.executionPackageId !== currentExecutionPackageId) return result('invalid-record-reference');
  if (record.references?.executionPackageValidationCommit !== currentExecutionPackageValidationCommit) return result('stale-execution-package-validation');
  if (executionPackageClassification !== 'current-and-compatible') return result('stale-execution-package-validation');
  if (policy.requiredSections.some((section) => record[section] == null)) return result('incomplete-record');
  if (!policy.allowedOutcomes.includes(record.decisionRecord?.outcome)) return result('invalid-decision');

  const evidenceIds = record.evidenceRecords.map((evidence) => evidence.evidenceId);
  if (new Set(evidenceIds).size !== evidenceIds.length) return result('evidence-divergence');
  if (record.reviewChecklistResults.some((item) => item.evidenceId && !evidenceIds.includes(item.evidenceId))) return result('evidence-divergence');

  const sameSession = records.filter((candidate) => candidate?.sessionIdentity?.sessionId === record.sessionIdentity?.sessionId);
  const exact = sameSession.filter((candidate) => JSON.stringify(candidate) === serialized);
  if (exact.length > 1) return result('duplicate-record');
  if (sameSession.some((candidate) => JSON.stringify(candidate) !== serialized)) return result('conflicting-record');

  return result('current-and-compatible');
}

function result(classification) {
  return {
    classification,
    compatible: classification === 'current-and-compatible',
    controls: policy.controls
  };
}

if (process.argv[1] === new URL(import.meta.url).pathname) {
  const input = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
  process.stdout.write(`${JSON.stringify(validateExecutionRecord(input), null, 2)}\n`);
}
