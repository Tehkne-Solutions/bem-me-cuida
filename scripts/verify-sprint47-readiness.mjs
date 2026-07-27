import fs from 'node:fs';

const required = [
  'release/cycle-0.12.0/pr-administrative-package-policy.json',
  'scripts/lib/cycle012-pr-administrative-package.mjs',
  'scripts/test-cycle012-pr-administrative-package.mjs',
  'docs/SPRINT-47.md',
  'docs/ADR-051-pacote-administrativo-de-pr-sem-operacao.md',
  '.github/workflows/sprint47.yml'
];
for (const path of required) {
  if (!fs.existsSync(path)) throw new Error(`missing:${path}`);
}
const policy = JSON.parse(fs.readFileSync(required[0], 'utf8'));
const c = policy.controls;
if (c.administrativePackageGenerationAllowed !== true || c.humanReviewRequired !== true) throw new Error('invalid-review-controls');
for (const key of ['functionalBranchCreationAllowed','pullRequestOpeningAllowed','patchGenerationAllowed','sourceMutationAllowed','executionAllowed','correctionAuthorized','mergeAllowed','activationAllowed']) {
  if (c[key] !== false) throw new Error(`unsafe-control:${key}`);
}
console.log('Sprint 47 readiness verified.');
