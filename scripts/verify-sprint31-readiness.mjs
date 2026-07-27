import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const failures = [];
const required = [
  '.github/workflows/sprint31.yml',
  'release/cycle-0.12.0/implementation-plans.json',
  'release/cycle-0.12.0/architecture-contracts.json',
  'release/cycle-0.12.0/migration-plan.json',
  'scripts/test-cycle012-technical-design.mjs',
  'scripts/verify-cycle012-technical-design.mjs',
  'scripts/verify-sprint31-readiness.mjs',
  'docs/SPRINT-31.md',
  'docs/ADR-035-desenho-tecnico-bloqueado-do-ciclo-0.12.md',
];
for (const path of required) if (!existsSync(join(root, path))) failures.push(`arquivo obrigatório ausente: ${path}`);

const workflowPath = join(root, '.github/workflows/sprint31.yml');
const workflow = existsSync(workflowPath) ? readFileSync(workflowPath, 'utf8') : '';
for (const marker of [
  'verify-sprint31-readiness.mjs',
  'test-cycle012-technical-design.mjs',
  'verify-cycle012-technical-design.mjs structure',
  'verify-cycle012-technical-design.mjs report',
]) {
  if (!workflow.includes(marker)) failures.push(`workflow Sprint 31 sem marcador: ${marker}`);
}
if (workflow.includes('supabase db push') || workflow.includes('gh api --method DELETE') || workflow.includes('eas build')) {
  failures.push('workflow Sprint 31 contém operação externa, destrutiva ou build.');
}

const packagePath = join(root, 'package.json');
const packageText = existsSync(packagePath) ? readFileSync(packagePath, 'utf8') : '';
for (const marker of [
  'cycle012:design:test',
  'cycle012:design:structure',
  'sprint31:check',
  'verify-sprint31-readiness.mjs',
]) {
  if (!packageText.includes(marker)) failures.push(`package.json sem integração: ${marker}`);
}

const plansPath = join(root, 'release/cycle-0.12.0/implementation-plans.json');
const contractsPath = join(root, 'release/cycle-0.12.0/architecture-contracts.json');
const plans = existsSync(plansPath) ? JSON.parse(readFileSync(plansPath, 'utf8')) : {};
const contracts = existsSync(contractsPath) ? JSON.parse(readFileSync(contractsPath, 'utf8')) : {};
if (plans.status !== 'design-blocked') failures.push('planos técnicos não permanecem bloqueados.');
if (contracts.status !== 'proposed-blocked') failures.push('contratos não permanecem bloqueados.');
if (plans.controls?.doesNotActivateCycleAutomatically !== true) failures.push('planos podem ativar o ciclo automaticamente.');

if (failures.length) {
  console.error('Sprint 31 reprovado:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log('Sprint 31 aprovado: desenho técnico verificável e implementação ainda bloqueada.');
console.log('Tehkné Solutions');
