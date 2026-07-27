import fs from 'node:fs';

const required = [
  'release/cycle-0.12.0/correction-plan-validation-policy.json',
  'scripts/lib/cycle012-correction-plan-validation.mjs',
  'scripts/test-cycle012-correction-plan-validation.mjs',
  'docs/SPRINT-44.md',
  'docs/ADR-048-validacao-dos-planos-de-correcao.md',
  '.github/workflows/sprint44.yml'
];
for (const file of required) {
  if (!fs.existsSync(file)) throw new Error(`Missing Sprint 44 file: ${file}`);
}
const policy = JSON.parse(fs.readFileSync(required[0], 'utf8'));
for (const key of ['executionAllowed','correctionAuthorized','pullRequestPreparationAllowed','activationAllowed','mutationAllowed']) {
  if (policy.controls[key] !== false) throw new Error(`${key} must remain false`);
}
console.log('Sprint 44 readiness verified');
