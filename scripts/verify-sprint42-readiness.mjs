import { existsSync, readFileSync } from 'node:fs';

const required = [
  'release/cycle-0.12.0/decision-validation-policy.json',
  'scripts/lib/cycle012-decision-validation.mjs',
  'scripts/test-cycle012-decision-validation.mjs',
  '.github/workflows/sprint42.yml',
  'docs/SPRINT-42.md',
  'docs/ADR-046-validacao-das-decisoes-humanas.md'
];
for (const file of required) if (!existsSync(file)) throw new Error(`Arquivo obrigatório ausente: ${file}`);
const policy = JSON.parse(readFileSync(required[0], 'utf8'));
if (policy.cycleVersion !== '0.12.0' || policy.controls.readOnly !== true) throw new Error('Política incompatível.');
for (const control of ['doesNotApproveDecisions','doesNotExecuteCorrections','doesNotRewriteDecisions','doesNotChangeProposals','doesNotChangeGates','doesNotAuthorizeMigrations','doesNotAuthorizeImplementation','doesNotActivateCycle']) {
  if (policy.controls[control] !== true) throw new Error(`Controle ausente: ${control}`);
}
const forbidden = ['supabase/migrations/022', 'supabase/migrations/023', 'supabase/migrations/024', 'supabase/migrations/025', 'supabase/migrations/026', 'supabase/migrations/027', 'supabase/migrations/028', 'supabase/migrations/029'];
for (const path of forbidden) if (existsSync(path)) throw new Error(`Migration proibida detectada: ${path}`);
console.log('Sprint 42: estrutura pronta e ativação bloqueada.');
