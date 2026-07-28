import fs from 'node:fs';
import crypto from 'node:crypto';

const policyPath = new URL('../governance/cycle-0.12/post-review-follow-up-package-policy.json', import.meta.url);
const policy = JSON.parse(fs.readFileSync(policyPath, 'utf8'));

export function generatePostReviewFollowUpPackage(input) {
  if (input.executionRecordClassification !== policy.requiredSourceClassification) {
    throw new Error('execution record must be current-and-compatible');
  }
  if (!policy.allowedDecisionOutcomes.includes(input.decisionSummary?.outcome)) {
    throw new Error('decision outcome is not eligible for follow-up packaging');
  }
  const serializedInput = JSON.stringify(input);
  if (policy.forbiddenTokens.some((token) => serializedInput.includes(token))) {
    throw new Error('forbidden operational content');
  }
  for (const item of input.followUpItems ?? []) {
    if (!policy.allowedPriorities.includes(item.priority)) throw new Error('invalid follow-up priority');
    if (!policy.allowedStatuses.includes(item.status)) throw new Error('invalid follow-up status');
    for (const field of ['itemId', 'title', 'owner', 'priority', 'status', 'completionCriterion']) {
      if (!item[field]) throw new Error(`missing follow-up field: ${field}`);
    }
  }
  const canonical = {
    artifactType: policy.artifactType,
    packageIdentity: input.packageIdentity,
    decisionSummary: input.decisionSummary,
    followUpItems: input.followUpItems ?? [],
    completionCriteria: input.completionCriteria ?? [],
    riskNotes: input.riskNotes ?? [],
    references: input.references,
    controls: policy.controls
  };
  const packageId = crypto.createHash('sha256').update(JSON.stringify(canonical)).digest('hex');
  return { ...canonical, packageId };
}

if (process.argv[1] === new URL(import.meta.url).pathname) {
  const input = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
  process.stdout.write(`${JSON.stringify(generatePostReviewFollowUpPackage(input), null, 2)}\n`);
}
