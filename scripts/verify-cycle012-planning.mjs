import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const mode = process.argv[2] ?? 'structure';
const failures = [];
const readJson = (path) => JSON.parse(readFileSync(join(root, path), 'utf8'));

const required = [
  'release/cycle-0.12.0/scope.json',
  'release/cycle-0.12.0/backlog.json',
  'release/cycle-0.12.0/acceptance-gates.json',
];
for (const path of required) {
  if (!existsSync(join(root, path))) failures.push(`arquivo obrigatório ausente: ${path}`);
}

if (!failures.length) {
  const scope = readJson(required[0]);
  const backlog = readJson(required[1]);
  const gates = readJson(required[2]);
  const scopeIds = new Set((scope.items ?? []).map((item) => item.id));
  const backlogIds = new Set((backlog.items ?? []).map((item) => item.id));

  if (scope.cycleVersion !== '0.12.0' || backlog.cycleVersion !== '0.12.0' || gates.cycleVersion !== '0.12.0') {
    failures.push('artefatos com versão de ciclo divergente.');
  }
  if (scopeIds.size !== backlogIds.size || [...scopeIds].some((id) => !backlogIds.has(id))) {
    failures.push('backlog não corresponde integralmente ao escopo proposto.');
  }
  if (backlog.status !== 'draft-blocked') failures.push('backlog inicial precisa permanecer draft-blocked.');
  if (backlog.controls?.noImplementationBeforeActivation !== true || backlog.controls?.noMigrationBeforeApproval !== true) {
    failures.push('backlog não está fail-closed para implementação e migrations.');
  }
  if (gates.overallStatus !== 'hold') failures.push('gates iniciais precisam recomendar hold.');
  if (
    gates.permissions?.implementationBranchesAllowed !== false ||
    gates.permissions?.migrationsAllowed !== false ||
    gates.permissions?.automaticActivationAllowed !== false
  ) {
    failures.push('permissões iniciais não estão bloqueadas.');
  }

  for (const item of backlog.items ?? []) {
    if (item.implementationStatus !== 'blocked-awaiting-cycle-activation') {
      failures.push(`${item.id}: implementação não está bloqueada.`);
    }
    if (!Array.isArray(item.acceptanceCriteria) || item.acceptanceCriteria.length < 3) {
      failures.push(`${item.id}: critérios de aceite insuficientes.`);
    }
    if (!item.ownerRole) failures.push(`${item.id}: ownerRole ausente.`);
  }

  const reservations = (backlog.items ?? []).flatMap((item) => item.migrationReservations ?? []);
  if (reservations.some((value) => !Number.isInteger(value) || value < 22 || value > 29)) {
    failures.push('reserva de migration fora da faixa 022–029.');
  }
  if (new Set(reservations).size !== reservations.length) failures.push('reserva de migration duplicada.');

  const migrationDir = join(root, 'supabase/migrations');
  if (existsSync(migrationDir)) {
    const premature = readdirSync(migrationDir).filter((name) => /^(022|023|024|025|026|027|028|029)[_-]/.test(name));
    if (premature.length) failures.push(`migrations prematuras detectadas: ${premature.join(', ')}`);
  }

  if (mode === 'report') {
    console.log(
      JSON.stringify(
        {
          cycleVersion: backlog.cycleVersion,
          backlogStatus: backlog.status,
          overallStatus: gates.overallStatus,
          itemCount: backlog.items.length,
          reservedMigrations: reservations,
        },
        null,
        2,
      ),
    );
  } else if (mode !== 'structure') {
    failures.push(`modo inválido: ${mode}`);
  }
}

if (failures.length) {
  console.error('Planejamento do ciclo 0.12.0 reprovado:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('Planejamento do ciclo 0.12.0 aprovado em modo fail-closed.');
console.log('Tehkné Solutions');
