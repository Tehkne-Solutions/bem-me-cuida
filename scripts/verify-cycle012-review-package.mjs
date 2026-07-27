import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const mode = process.argv[2] ?? 'structure';
const failures = [];
const readJson = (path) => JSON.parse(readFileSync(join(root, path), 'utf8'));

const required = [
  'release/cycle-0.12.0/backlog.json',
  'release/cycle-0.12.0/architecture-contracts.json',
  'release/cycle-0.12.0/implementation-plans.json',
  'release/cycle-0.12.0/migration-plan.json',
  'release/cycle-0.12.0/threat-model.json',
  'release/cycle-0.12.0/approval-policy.json',
  'release/cycle-0.12.0/review-package.json',
];
for (const path of required) {
  if (!existsSync(join(root, path))) failures.push(`arquivo obrigatório ausente: ${path}`);
}

if (!failures.length) {
  const backlog = readJson(required[0]);
  const contracts = readJson(required[1]);
  const plans = readJson(required[2]);
  const migrations = readJson(required[3]);
  const threats = readJson(required[4]);
  const policy = readJson(required[5]);
  const review = readJson(required[6]);

  const versions = [backlog, contracts, plans, migrations, threats, policy, review].map((item) => item.cycleVersion);
  if (versions.some((version) => version !== '0.12.0')) failures.push('artefatos com versão divergente do ciclo 0.12.0.');

  const expectedTracks = ['architecture', 'security', 'privacy', 'accessibility', 'database'];
  const actualTracks = (review.reviewTracks ?? []).map((track) => track.id).sort();
  if (JSON.stringify(actualTracks) !== JSON.stringify([...expectedTracks].sort())) {
    failures.push('trilhas do pacote de revisão incompletas ou divergentes.');
  }
  if (JSON.stringify([...(policy.requiredTracks ?? [])].sort()) !== JSON.stringify([...expectedTracks].sort())) {
    failures.push('política de aprovação não exige todas as trilhas.');
  }
  if ((review.reviewTracks ?? []).some((track) => track.status !== 'pending')) {
    failures.push('trilha foi aprovada sem evidência humana.');
  }
  if (review.status !== 'review-blocked' || review.recommendation !== 'hold') {
    failures.push('pacote inicial precisa permanecer review-blocked e hold.');
  }
  if (review.decision?.status !== 'blocked' || review.decision?.eligibleForHumanApproval !== false) {
    failures.push('decisão inicial não permanece bloqueada.');
  }
  for (const key of ['doesNotActivateCycleAutomatically', 'doesNotAuthorizeMigrations', 'doesNotAuthorizeImplementation']) {
    if (review.controls?.[key] !== true) failures.push(`controle ausente ou inválido: ${key}.`);
  }

  if ((threats.threats ?? []).length < 5) failures.push('modelo de ameaças insuficiente.');
  for (const threat of threats.threats ?? []) {
    if (!threat.id || !threat.category || !threat.scenario || !threat.impact) failures.push('ameaça incompleta.');
    if (!Array.isArray(threat.mitigations) || threat.mitigations.length < 2) failures.push(`${threat.id}: mitigações insuficientes.`);
    if (!['low', 'medium'].includes(threat.residualRisk)) failures.push(`${threat.id}: risco residual não aceitável para revisão.`);
    if (!threat.verification) failures.push(`${threat.id}: verificação ausente.`);
  }

  if ((policy.reviewerRules?.minimumDistinctReviewers ?? 0) < 3) failures.push('mínimo de revisores independentes insuficiente.');
  if (policy.reviewerRules?.authorCannotApprove !== true) failures.push('autor pode aprovar a própria mudança.');
  if (policy.reviewerRules?.securityAndPrivacyMustBeDistinct !== true) failures.push('segurança e privacidade não exigem revisores distintos.');
  if (policy.approvalRecord?.status !== 'pending' || (policy.approvalRecord?.reviewers ?? []).length !== 0) {
    failures.push('registro de aprovação inicial foi preenchido prematuramente.');
  }
  if (policy.activationRules?.automaticActivationAllowed !== false) failures.push('ativação automática não está bloqueada.');

  for (const field of ['containsPersonalData', 'containsClinicalData', 'containsRawFeedback', 'containsJournalContent', 'containsSecrets']) {
    if (review.privacy?.[field] !== false) failures.push(`pacote declara conteúdo proibido: ${field}.`);
  }

  const migrationDir = join(root, 'supabase/migrations');
  if (existsSync(migrationDir)) {
    const premature = readdirSync(migrationDir).filter((name) => /^(022|023|024|025|026|027|028|029)[_-]/.test(name));
    if (premature.length) failures.push(`migrations prematuras detectadas: ${premature.join(', ')}`);
  }

  if (mode === 'report') {
    console.log(JSON.stringify({
      cycleVersion: review.cycleVersion,
      status: review.status,
      recommendation: review.recommendation,
      reviewTracks: review.reviewTracks.map((track) => ({ id: track.id, status: track.status })),
      threatCount: threats.threats.length,
      minimumDistinctReviewers: policy.reviewerRules.minimumDistinctReviewers,
      automaticActivationAllowed: policy.activationRules.automaticActivationAllowed,
    }, null, 2));
  } else if (mode !== 'structure') {
    failures.push(`modo inválido: ${mode}`);
  }
}

if (failures.length) {
  console.error('Pacote de revisão do ciclo 0.12.0 reprovado:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('Pacote de revisão do ciclo 0.12.0 aprovado em modo fail-closed.');
console.log('Tehkné Solutions');
