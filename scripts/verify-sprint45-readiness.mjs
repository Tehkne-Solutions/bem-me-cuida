import fs from 'node:fs';

const requiredFiles = [
  'release/cycle-0.12.0/pr-preparation-authorization-policy.json',
  'scripts/lib/cycle012-pr-preparation-authorization.mjs',
  'scripts/test-cycle012-pr-preparation-authorization.mjs',
  'docs/SPRINT-45.md',
  'docs/ADR-049-autorizacao-para-preparar-pr-sem-execucao.md',
  '.github/workflows/sprint45.yml'
];
for (const file of requiredFiles) {
  if (!fs.existsSync(file)) throw new Error(`missing-file:${file}`);
}
const policy = JSON.parse(fs.readFileSync(requiredFiles[0], 'utf8'));
if (policy.eligiblePlanClassification !== 'current-and-compatible') throw new Error('invalid-eligibility');
if (policy.allowedDecision !== 'authorize-pr-preparation') throw new Error('invalid-decision');
if (policy.controls.pullRequestPreparationAllowed !== true) throw new Error('preparation-not-enabled');
for (const field of ['patchGenerationAllowed', 'sourceMutationAllowed', 'executionAllowed', 'correctionAuthorized', 'mergeAllowed', 'activationAllowed']) {
  if (policy.controls[field] !== false) throw new Error(`unsafe-control:${field}`);
}
if (!Array.isArray(policy.forbiddenTargets) || policy.forbiddenTargets.length !== 8) throw new Error('invalid-forbidden-targets');
console.log('Sprint 45 readiness verified in fail-closed mode.');
