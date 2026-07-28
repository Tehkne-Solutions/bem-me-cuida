import { readFile } from 'node:fs/promises';

const clone = (value) => JSON.parse(JSON.stringify(value));
const stableSort = (items, key) => [...items].sort((a, b) => String(a[key]).localeCompare(String(b[key])));

export async function loadPolicy(path = 'governance/cycle-0.12/administrative-closure-package-policy.json') {
  return JSON.parse(await readFile(path, 'utf8'));
}

function assertNoForbiddenContent(value, policy) {
  const serialized = JSON.stringify(value);
  for (const token of policy.forbiddenOperationalTokens) {
    if (serialized.includes(token)) throw new Error(`forbidden-operational-content:${token}`);
  }
}

export function generateAdministrativeClosurePackage(input, policy) {
  if (!input || typeof input !== 'object') throw new Error('invalid-input');
  if (input.followUpRecordValidation?.classification !== policy.sourceRequirements.followUpRecordValidation) {
    throw new Error('follow-up-record-validation-not-current');
  }
  if (!input.sourceCommit) throw new Error('source-commit-required');

  const remainingItems = stableSort(input.remainingItems ?? [], 'itemId').map((item) => ({
    itemId: item.itemId,
    title: item.title,
    owner: item.owner,
    state: item.state,
    rationale: item.rationale,
  }));

  const acceptedRisks = stableSort(input.acceptedRisks ?? [], 'riskId').map((risk) => ({
    riskId: risk.riskId,
    description: risk.description,
    decision: risk.decision,
    owner: risk.owner,
    rationale: risk.rationale,
  }));

  const transitionCriteria = stableSort(input.transitionCriteria ?? [], 'criterionId').map((criterion) => ({
    criterionId: criterion.criterionId,
    description: criterion.description,
    status: criterion.status,
    evidenceReference: criterion.evidenceReference,
  }));

  const closureState = remainingItems.length === 0
    ? 'closed-administratively'
    : remainingItems.every((item) => ['accepted-risk', 'not-required'].includes(item.state))
      ? 'partially-closed-administratively'
      : 'open-administratively';

  const result = {
    packageIdentity: {
      packageType: 'cycle-0.12-administrative-closure-package',
      policyId: policy.policyId,
      policyVersion: policy.version,
      cycle: policy.cycle,
      sourceCommit: input.sourceCommit,
      generatedAt: input.generatedAt,
      generatedBy: input.generatedBy,
    },
    validatedSources: clone(input.validatedSources ?? []),
    decisionConsolidation: clone(input.decisionConsolidation ?? []),
    followUpConsolidation: clone(input.followUpConsolidation ?? []),
    remainingItems,
    acceptedRisks,
    transitionCriteria,
    closureStatement: {
      state: closureState,
      summary: input.closureSummary,
      implementationAuthorized: false,
      activationAuthorized: false,
      humanReviewRequired: true,
    },
    references: clone(input.references ?? {}),
    controls: clone(policy.controls),
  };

  assertNoForbiddenContent(result, policy);
  return result;
}
