import fs from 'node:fs';

const requiredFiles = [
  'governance/cycle-0.12/human-review-session-start-authorization-validation.policy.json',
  'scripts/cycle012-human-review-session-start-authorization-validation.mjs',
  'scripts/test-cycle012-human-review-session-start-authorization-validation.mjs',
  'docs/sprint-54-human-review-session-start-authorization-validation.md',
  'docs/adr/058-human-review-session-start-authorization-validation.md',
  '.github/workflows/sprint54.yml'
];

for (const file of requiredFiles) {
  if (!fs.existsSync(file)) throw new Error(`Arquivo obrigatório ausente: ${file}`);
}

const policy = JSON.parse(fs.readFileSync(requiredFiles[0], 'utf8'));
if (policy.mode !== 'read-only-fail-closed') throw new Error('A política deve permanecer fail-closed e somente leitura.');
if (policy.controls.reviewSessionExecutionAllowed !== false) throw new Error('A execução da sessão deve permanecer bloqueada.');
if (policy.controls.humanReviewRequired !== true) throw new Error('A revisão humana deve continuar obrigatória.');

console.log('Sprint 54 readiness verified.');
