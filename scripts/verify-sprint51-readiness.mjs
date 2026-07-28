import fs from 'node:fs';

const required = [
  'release/cycle-0.12.0/human-review-session-package-policy.json',
  'scripts/lib/cycle012-human-review-session-package.mjs',
  'scripts/test-cycle012-human-review-session-package.mjs',
  'docs/SPRINT-51.md',
  'docs/ADR-055-pacote-protegido-para-sessao-de-revisao-humana.md',
  '.github/workflows/sprint51.yml'
];
for (const path of required) {
  if (!fs.existsSync(path)) throw new Error(`missing:${path}`);
}
const policy = JSON.parse(fs.readFileSync(required[0], 'utf8'));
const controls = policy.controls;
if (controls.sessionPackageGenerationAllowed !== true || controls.humanReviewRequired !== true) {
  throw new Error('invalid-review-controls');
}
for (const key of ['reviewSessionExecutionAllowed','functionalBranchCreationAllowed','pullRequestOpeningAllowed','patchGenerationAllowed','sourceMutationAllowed','executionAllowed','correctionAuthorized','mergeAllowed','activationAllowed']) {
  if (controls[key] !== false) throw new Error(`unsafe-control:${key}`);
}
if (!policy.allowedSections.includes('reviewQuestions') || !policy.allowedSections.includes('decisionFields')) {
  throw new Error('missing-review-sections');
}
console.log('Sprint 51 readiness verified.');
