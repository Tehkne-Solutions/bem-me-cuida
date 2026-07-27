import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const failures = [];
const required = [
  '.github/workflows/cycle012-activation-proposal.yml',
  '.github/workflows/sprint34.yml',
  'release/cycle-0.12.0/review-consolidation-config.json',
  'scripts/lib/cycle012-review-consolidation.mjs',
  'scripts/consolidate-cycle012-reviews.mjs',
  'scripts/generate-cycle012-activation-proposal-from-consolidation.mjs',
  'scripts/test-cycle012-review-consolidation.mjs',
  'scripts/verify-cycle012-review-consolidation.mjs',
  'scripts/verify-sprint34-readiness.mjs',
  'docs/SPRINT-34.md',
  'docs/ADR-038-consolidacao-auditavel-e-proposta-protegida.md',
];
for (const path of required) if (!existsSync(join(root, path))) failures.push(`arquivo obrigatório ausente: ${path}`);

const qualityWorkflow = existsSync(join(root, '.github/workflows/sprint34.yml')) ? readFileSync(join(root, '.github/workflows/sprint34.yml'), 'utf8') : '';
for (const marker of ['verify-sprint34-readiness.mjs', 'test-cycle012-review-consolidation.mjs', 'verify-cycle012-review-consolidation.mjs structure']) {
  if (!qualityWorkflow.includes(marker)) failures.push(`workflow Sprint 34 sem marcador: ${marker}`);
}
const proposalWorkflow = existsSync(join(root, '.github/workflows/cycle012-activation-proposal.yml')) ? readFileSync(join(root, '.github/workflows/cycle012-activation-proposal.yml'), 'utf8') : '';
for (const marker of ['workflow_dispatch', 'consolidate-cycle012-reviews.mjs', 'generate-cycle012-activation-proposal-from-consolidation.mjs', 'gh pr create']) {
  if (!proposalWorkflow.includes(marker)) failures.push(`workflow de proposta sem marcador: ${marker}`);
}
for (const forbidden of ['supabase db push', 'eas build', 'gh pr merge', 'gh api --method DELETE']) {
  if (qualityWorkflow.includes(forbidden) || proposalWorkflow.includes(forbidden)) failures.push(`operação proibida detectada: ${forbidden}`);
}

const packageText = existsSync(join(root, 'package.json')) ? readFileSync(join(root, 'package.json'), 'utf8') : '';
for (const marker of ['cycle012:consolidation:test', 'cycle012:consolidation:structure', 'cycle012:consolidation:build', 'cycle012:proposal:build', 'sprint34:check', 'verify-sprint34-readiness.mjs']) {
  if (!packageText.includes(marker)) failures.push(`package.json sem integração: ${marker}`);
}

if (failures.length) {
  console.error('Sprint 34 reprovado:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log('Sprint 34 aprovado: consolidação auditável e proposta humana continuam fail-closed.');
console.log('Tehkné Solutions');
