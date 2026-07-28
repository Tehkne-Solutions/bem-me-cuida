import { access, readFile } from 'node:fs/promises';

const requiredFiles = [
  'governance/cycle-0.12/administrative-closure-package-policy.json',
  'scripts/generate-cycle012-administrative-closure-package.mjs',
  'scripts/test-cycle012-administrative-closure-package.mjs',
  'docs/governance/sprint-63-administrative-closure-package.md',
  'docs/adr/067-cycle-012-administrative-closure-package.md',
  '.github/workflows/sprint63.yml',
];

for (const file of requiredFiles) await access(file);

const policy = JSON.parse(await readFile(requiredFiles[0], 'utf8'));
const requiredSections = [
  'packageIdentity',
  'validatedSources',
  'decisionConsolidation',
  'followUpConsolidation',
  'remainingItems',
  'acceptedRisks',
  'transitionCriteria',
  'closureStatement',
  'references',
];

for (const section of requiredSections) {
  if (!policy.requiredSections.includes(section)) throw new Error(`missing-required-section:${section}`);
}

for (const [control, expected] of Object.entries({
  functionalBranchCreationAllowed: false,
  pullRequestOpeningAllowed: false,
  patchGenerationAllowed: false,
  sourceMutationAllowed: false,
  executionAllowed: false,
  correctionAuthorized: false,
  mergeAllowed: false,
  activationAllowed: false,
  humanReviewRequired: true,
})) {
  if (policy.controls[control] !== expected) throw new Error(`invalid-control:${control}`);
}

console.log('Sprint 63 readiness verified');
