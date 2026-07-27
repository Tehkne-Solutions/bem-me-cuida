import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
const root = process.cwd();
const failures = [];
const required = [
  '.github/workflows/sprint40.yml',
  'release/cycle-0.12.0/proposal-validation-policy.json',
  'scripts/lib/cycle012-proposal-validation.mjs',
  'scripts/validate-cycle012-resolution-proposals.mjs',
  'scripts/test-cycle012-proposal-validation.mjs',
  'scripts/verify-sprint40-readiness.mjs',
  'docs/SPRINT-40.md',
  'docs/ADR-044-validacao-protegida-das-propostas.md'
];
for (const path of required) if (!existsSync(join(root, path))) failures.push(`arquivo obrigatório ausente: ${path}`);
const workflow = existsSync(join(root, '.github/workflows/sprint40.yml')) ? readFileSync(join(root, '.github/workflows/sprint40.yml'), 'utf8') : '';
for (const marker of ['verify-sprint40-readiness.mjs','test-cycle012-proposal-validation.mjs','validate-cycle012-resolution-proposals.mjs']) if (!workflow.includes(marker)) failures.push(`workflow sem marcador: ${marker}`);
for (const forbidden of ['contents: write','pull-requests: write','gh pr merge','supabase db push','eas build','eas submit','git push']) if (workflow.includes(forbidden)) failures.push(`workflow contém operação proibida: ${forbidden}`);
const migrationDir = join(root, 'supabase/migrations');
if (existsSync(migrationDir)) {
  const premature = readdirSync(migrationDir).filter((name) => /^(022|023|024|025|026|027|028|029)[_-]/.test(name));
  if (premature.length) failures.push(`migrations prematuras detectadas: ${premature.join(', ')}`);
}
if (failures.length) {
  console.error('Sprint 40 reprovado:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log('Sprint 40 aprovado: validação protegida sem aprovação ou execução automática.');
console.log('Tehkné Solutions');
