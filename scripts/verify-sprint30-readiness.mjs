import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const failures = [];
const required = [
  '.github/workflows/sprint30.yml',
  'release/cycle-0.12.0/backlog.json',
  'release/cycle-0.12.0/acceptance-gates.json',
  'scripts/test-cycle012-planning.mjs',
  'scripts/verify-cycle012-planning.mjs',
  'scripts/verify-sprint30-readiness.mjs',
  'docs/SPRINT-30.md',
  'docs/ADR-034-planejamento-verificavel-do-ciclo-0.12.md',
];
for (const path of required) {
  if (!existsSync(join(root, path))) failures.push(`arquivo obrigatório ausente: ${path}`);
}

const workflowPath = join(root, '.github/workflows/sprint30.yml');
const workflow = existsSync(workflowPath) ? readFileSync(workflowPath, 'utf8') : '';
for (const marker of [
  'verify-sprint30-readiness.mjs',
  'test-cycle012-planning.mjs',
  'verify-cycle012-planning.mjs structure',
]) {
  if (!workflow.includes(marker)) failures.push(`workflow Sprint 30 sem marcador: ${marker}`);
}
if (workflow.includes('supabase db push') || workflow.includes('gh api --method DELETE') || workflow.includes('eas build')) {
  failures.push('workflow Sprint 30 contém operação externa ou destrutiva.');
}

const packagePath = join(root, 'package.json');
const packageText = existsSync(packagePath) ? readFileSync(packagePath, 'utf8') : '';
for (const marker of [
  'cycle012:planning:test',
  'cycle012:planning:structure',
  'sprint30:check',
  'verify-sprint30-readiness.mjs',
]) {
  if (!packageText.includes(marker)) failures.push(`package.json sem integração: ${marker}`);
}

const backlogPath = join(root, 'release/cycle-0.12.0/backlog.json');
const gatesPath = join(root, 'release/cycle-0.12.0/acceptance-gates.json');
const backlog = existsSync(backlogPath) ? JSON.parse(readFileSync(backlogPath, 'utf8')) : {};
const gates = existsSync(gatesPath) ? JSON.parse(readFileSync(gatesPath, 'utf8')) : {};
if (backlog.status !== 'draft-blocked') failures.push('backlog do Sprint 30 não permanece bloqueado.');
if (gates.overallStatus !== 'hold' || gates.controls?.failClosed !== true) {
  failures.push('gates do Sprint 30 não permanecem fail-closed.');
}

if (failures.length) {
  console.error('Sprint 30 reprovado:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('Sprint 30 aprovado: backlog verificável, critérios de aceite e ativação bloqueada.');
console.log('Tehkné Solutions');
