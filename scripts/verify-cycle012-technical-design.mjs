import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const mode = process.argv[2] ?? 'structure';
const failures = [];
const readJson = (path) => JSON.parse(readFileSync(join(root, path), 'utf8'));
const required = [
  'release/cycle-0.12.0/backlog.json',
  'release/cycle-0.12.0/implementation-plans.json',
  'release/cycle-0.12.0/architecture-contracts.json',
  'release/cycle-0.12.0/migration-plan.json',
];
for (const path of required) if (!existsSync(join(root, path))) failures.push(`arquivo obrigatório ausente: ${path}`);

if (!failures.length) {
  const backlog = readJson(required[0]);
  const implementation = readJson(required[1]);
  const contracts = readJson(required[2]);
  const migrations = readJson(required[3]);
  const backlogIds = new Set((backlog.items ?? []).map((item) => item.id));
  const planIds = new Set((implementation.plans ?? []).map((plan) => plan.itemId));
  const contractIds = new Set((contracts.contracts ?? []).map((contract) => contract.itemId));

  if (implementation.status !== 'design-blocked') failures.push('planos técnicos precisam permanecer design-blocked.');
  if (contracts.status !== 'proposed-blocked') failures.push('contratos precisam permanecer proposed-blocked.');
  if (migrations.status !== 'draft-no-migration-authorized') failures.push('migrations não permanecem bloqueadas.');
  if ([...backlogIds].some((id) => !planIds.has(id) || !contractIds.has(id))) {
    failures.push('cada item do backlog precisa de plano técnico e contrato arquitetural.');
  }
  if (planIds.size !== backlogIds.size || contractIds.size !== backlogIds.size) {
    failures.push('planos ou contratos contêm itens fora do backlog.');
  }

  for (const plan of implementation.plans ?? []) {
    if (plan.implementationStatus !== 'blocked-awaiting-cycle-activation') failures.push(`${plan.itemId}: implementação não bloqueada.`);
    if (plan.securityReview !== 'required' || plan.privacyReview !== 'required') failures.push(`${plan.itemId}: revisões obrigatórias ausentes.`);
    if (!Array.isArray(plan.testStrategy) || plan.testStrategy.length < 3) failures.push(`${plan.itemId}: estratégia de testes insuficiente.`);
    if (!plan.rollback) failures.push(`${plan.itemId}: rollback ausente.`);
  }

  const reservedByBacklog = (backlog.items ?? []).flatMap((item) => item.migrationReservations ?? []).sort((a, b) => a - b);
  const reservedByPlans = (implementation.plans ?? []).flatMap((plan) => plan.migrationPlan ?? []).sort((a, b) => a - b);
  const reservedByMigration = (migrations.plannedChanges ?? []).map((change) => change.number).sort((a, b) => a - b);
  if (JSON.stringify(reservedByBacklog) !== JSON.stringify(reservedByPlans)) failures.push('reservas do backlog e planos técnicos divergem.');
  if (JSON.stringify(reservedByPlans) !== JSON.stringify(reservedByMigration)) failures.push('reservas técnicas e migration-plan divergem.');
  for (const change of migrations.plannedChanges ?? []) {
    if (change.status !== 'reserved-not-created') failures.push(`migration ${change.number}: status inválido.`);
    if (!change.rollbackRequired || !change.rlsRequired || !change.pgtapRequired) failures.push(`migration ${change.number}: controles incompletos.`);
  }

  const obs = (contracts.contracts ?? []).find((contract) => contract.itemId === 'BMC-012-OBS-01');
  for (const forbidden of ['userId', 'email', 'deviceId', 'journalText', 'clinicalSegment']) {
    if (!obs?.forbiddenDimensions?.includes(forbidden)) failures.push(`contrato OBS não bloqueia ${forbidden}.`);
  }
  if (!Number.isInteger(obs?.minimumAggregation) || obs.minimumAggregation < 10) failures.push('limiar mínimo de agregação insuficiente.');

  const ops = (contracts.contracts ?? []).find((contract) => contract.itemId === 'BMC-012-OPS-01');
  for (const protectedName of ['production-release', 'production-observability', 'production-operations']) {
    if (!ops?.protectedEnvironments?.includes(protectedName)) failures.push(`contrato OPS não protege ${protectedName}.`);
  }

  const ux = (contracts.contracts ?? []).find((contract) => contract.itemId === 'BMC-012-UX-01');
  for (const forbidden of ['rawText', 'userId', 'email', 'diagnosis', 'medication', 'journalEntry']) {
    if (!ux?.forbiddenFields?.includes(forbidden)) failures.push(`contrato UX não bloqueia ${forbidden}.`);
  }

  const migrationDir = join(root, 'supabase/migrations');
  if (existsSync(migrationDir)) {
    const premature = readdirSync(migrationDir).filter((name) => /^(022|023|024|025|026|027|028|029)[_-]/.test(name));
    if (premature.length) failures.push(`migrations prematuras detectadas: ${premature.join(', ')}`);
  }

  if (mode === 'report') {
    console.log(JSON.stringify({
      cycleVersion: implementation.cycleVersion,
      status: implementation.status,
      itemCount: implementation.plans.length,
      contractCount: contracts.contracts.length,
      reservedMigrations: reservedByMigration,
      activationAllowed: false,
    }, null, 2));
  } else if (mode !== 'structure') failures.push(`modo inválido: ${mode}`);
}

if (failures.length) {
  console.error('Desenho técnico do ciclo 0.12.0 reprovado:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log('Desenho técnico do ciclo 0.12.0 aprovado e ainda bloqueado para implementação.');
console.log('Tehkné Solutions');
