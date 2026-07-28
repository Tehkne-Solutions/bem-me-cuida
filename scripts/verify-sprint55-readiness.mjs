import fs from 'node:fs';

const required = [
  'governance/cycle-0.12/human-review-session-execution-package.policy.json',
  'scripts/cycle012-human-review-session-execution-package.mjs',
  'scripts/test-cycle012-human-review-session-execution-package.mjs',
  'docs/sprint-55-human-review-session-execution-package.md',
  'docs/adr/059-human-review-session-execution-package.md',
  '.github/workflows/sprint55.yml',
];
for (const file of required) {
  if (!fs.existsSync(file)) throw new Error(`Arquivo obrigatório ausente: ${file}`);
}
const policy = JSON.parse(fs.readFileSync(required[0], 'utf8'));
if (policy.controls.reviewSessionExecutionAllowed !== false) throw new Error('Execução da sessão deve permanecer bloqueada.');
if (policy.controls.patchGenerationAllowed !== false) throw new Error('Geração de patch deve permanecer bloqueada.');
if (policy.controls.humanReviewRequired !== true) throw new Error('Revisão humana deve permanecer obrigatória.');
console.log('Sprint 55 readiness: OK');
