import fs from 'node:fs';

const required = [
  'governance/cycle-0.12/human-review-session-execution-package-validation.policy.json',
  'scripts/cycle012-human-review-session-execution-package-validation.mjs',
  'scripts/test-cycle012-human-review-session-execution-package-validation.mjs',
  'docs/sprint-56-human-review-session-execution-package-validation.md',
  'docs/adr/060-human-review-session-execution-package-validation.md',
  '.github/workflows/sprint56.yml'
];

const missing = required.filter((path) => !fs.existsSync(path));
if (missing.length) {
  console.error(`Sprint 56 incompleto: ${missing.join(', ')}`);
  process.exit(1);
}

const policy = JSON.parse(fs.readFileSync(required[0], 'utf8'));
if (policy.classifications.length !== 8) throw new Error('Sprint 56 exige oito classificações controladas.');
if (policy.controls.reviewSessionExecutionAllowed !== false) throw new Error('Execução da sessão deve permanecer bloqueada.');
if (policy.controls.sourceMutationAllowed !== false) throw new Error('Mutação de fonte deve permanecer bloqueada.');
if (policy.controls.humanReviewRequired !== true) throw new Error('Revisão humana deve permanecer obrigatória.');

console.log('Sprint 56 readiness verified.');
