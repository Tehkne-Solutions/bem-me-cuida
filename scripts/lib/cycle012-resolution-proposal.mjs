import { createHash } from 'node:crypto';
import { assertQueueReconciliationSafe } from './cycle012-queue-reconciliation.mjs';

const SHA_PATTERN = /^[a-f0-9]{40}$/i;
const RECORD_ID_PATTERN = /^queue-update-[a-f0-9]{20}$/i;
const ACTION_PATTERN = /^[a-z][a-z0-9-]{2,95}$/;
const RAW_IDENTITY_PATTERN = /(actorId|actor_id|email|login|username|token|password|secretValue)/i;
const FREE_TEXT_KEY_PATTERN = /(note|notes|comment|comments|description|message|freeText|reason)/i;

const proposerFingerprint = (actorId) => {
  const normalized = String(actorId ?? '').trim();
  if (!/^\d+$/.test(normalized)) throw new Error('actorId inválido para fingerprint pseudonimizado.');
  return `sha256:${createHash('sha256').update(`cycle012-resolution-proposal:${normalized}`).digest('hex')}`;
};

function targetForItem(item, targetType) {
  if (targetType === 'none') return { type: 'none', ref: 'none' };
  if (targetType === 'queue-update-record') return { type: targetType, ref: `queue-update:${item.recordId}` };
  if (targetType === 'reconciliation-item-source') return { type: targetType, ref: `source:${item.source}` };
  if (targetType === 'queue-catalog') return { type: targetType, ref: 'release/cycle-0.12.0/operations-queue-config.json' };
  throw new Error(`Tipo de alvo não permitido: ${targetType}.`);
}

export function buildResolutionProposal({ report, reconciliationPolicy, proposalPolicy, recordId, requestedAction, actorId, submittedAt }) {
  assertQueueReconciliationSafe(report, reconciliationPolicy);
  if (report.activationAllowed !== false || report.mutationAllowed !== false) throw new Error('Relatório precisa permanecer bloqueado.');
  if (proposalPolicy?.cycleVersion !== '0.12.0' || proposalPolicy.controls?.proposalOnly !== true) {
    throw new Error('Política de proposta incompatível.');
  }

  const normalizedRecordId = String(recordId ?? '').trim();
  if (!RECORD_ID_PATTERN.test(normalizedRecordId)) throw new Error('recordId inválido.');
  const item = (report.items ?? []).find((candidate) => candidate.recordId === normalizedRecordId);
  if (!item) throw new Error(`Registro não encontrado na reconciliação: ${normalizedRecordId}.`);

  const action = String(requestedAction ?? '').trim();
  if (!ACTION_PATTERN.test(action)) throw new Error('requestedAction inválida.');
  const allowedActions = proposalPolicy.actionsByClassification?.[item.classification] ?? [];
  if (!allowedActions.includes(action)) throw new Error(`Ação não permitida para ${item.classification}: ${action}.`);

  const submitted = String(submittedAt ?? '');
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(submitted) || Number.isNaN(Date.parse(submitted))) {
    throw new Error('submittedAt deve ser uma data ISO UTC.');
  }
  if (!SHA_PATTERN.test(report.sourceCommit ?? '')) throw new Error('sourceCommit da reconciliação inválido.');

  const fingerprint = proposerFingerprint(actorId);
  const targetType = proposalPolicy.targetByClassification?.[item.classification];
  const target = targetForItem(item, targetType);
  const seed = [report.sourceCommit.toLowerCase(), normalizedRecordId, item.classification, action, target.type, target.ref, fingerprint, submitted].join('|');
  const proposalId = `resolution-proposal-${createHash('sha256').update(seed).digest('hex').slice(0, 20)}`;

  const proposal = {
    schemaVersion: '1.0',
    product: 'BemMeCuida',
    generatedBy: 'Tehkné Solutions',
    cycleVersion: '0.12.0',
    artifactType: 'cycle012-human-resolution-proposal',
    proposalId,
    status: 'proposal-awaiting-independent-human-review',
    effect: 'proposal-only-no-source-mutation',
    submittedAt: submitted,
    sourceCommit: report.sourceCommit.toLowerCase(),
    reconciliation: {
      recordId: normalizedRecordId,
      queueItemId: item.queueItemId,
      classification: item.classification,
      severity: item.severity,
      source: item.source,
      recordSourceCommit: item.recordSourceCommit,
      currentSourceCommit: item.currentSourceCommit,
    },
    requestedAction: action,
    target,
    proposerFingerprint: fingerprint,
    controls: { ...proposalPolicy.controls },
    privacy: {
      containsPersonalData: false,
      containsClinicalData: false,
      containsRawFeedback: false,
      containsJournalContent: false,
      containsSecrets: false,
      containsRawIdentity: false,
      containsPseudonymousProposerReference: true,
    },
  };
  return assertResolutionProposalSafe(proposal, proposalPolicy);
}

export function assertResolutionProposalSafe(proposal, policy) {
  if (proposal?.cycleVersion !== '0.12.0' || proposal?.artifactType !== 'cycle012-human-resolution-proposal') {
    throw new Error('Proposta de resolução incompatível.');
  }
  if (proposal.status !== 'proposal-awaiting-independent-human-review' || proposal.effect !== 'proposal-only-no-source-mutation') {
    throw new Error('Proposta não pode produzir efeito operacional direto.');
  }
  if (!/^sha256:[a-f0-9]{64}$/i.test(proposal.proposerFingerprint ?? '')) throw new Error('Fingerprint pseudonimizado inválido.');
  const text = JSON.stringify(proposal);
  if (RAW_IDENTITY_PATTERN.test(text.replace(/proposerFingerprint/g, ''))) throw new Error('Proposta contém identidade ou segredo não permitido.');
  for (const key of Object.keys(proposal)) if (FREE_TEXT_KEY_PATTERN.test(key)) throw new Error(`Campo de texto livre proibido: ${key}.`);
  const allowed = policy.actionsByClassification?.[proposal.reconciliation?.classification] ?? [];
  if (!allowed.includes(proposal.requestedAction)) throw new Error('Ação divergente da classificação.');
  if (proposal.target?.type !== policy.targetByClassification?.[proposal.reconciliation?.classification]) {
    throw new Error('Alvo divergente da classificação.');
  }
  for (const control of [
    'proposalOnly', 'requiresIndependentHumanReview', 'doesNotRewriteQueueUpdates', 'doesNotChangeQueueReadiness',
    'doesNotResolveDependencies', 'doesNotChangeReviews', 'doesNotChangeGates', 'doesNotActivateCycle',
    'doesNotAuthorizeMigrations', 'doesNotAuthorizeImplementation', 'doesNotMergePullRequests',
    'doesNotPublishBuilds', 'doesNotDeleteEnvironments',
  ]) {
    if (proposal.controls?.[control] !== true || policy.controls?.[control] !== true) throw new Error(`Controle ausente: ${control}.`);
  }
  return proposal;
}

export function renderResolutionProposalMarkdown(proposal) {
  const lines = [
    '## Proposta humana de resolução — BemMeCuida 0.12.0',
    '',
    `**Proposta:** \`${proposal.proposalId}\``,
    `**Registro reconciliado:** \`${proposal.reconciliation.recordId}\``,
    `**Pendência:** \`${proposal.reconciliation.queueItemId}\``,
    `**Classificação:** \`${proposal.reconciliation.classification}\``,
    `**Severidade:** \`${proposal.reconciliation.severity}\``,
    `**Ação solicitada:** \`${proposal.requestedAction}\``,
    `**Alvo controlado:** \`${proposal.target.type}\` / \`${proposal.target.ref}\``,
    '',
    '- Aplicação automática: **não**',
    '- Alteração da fonte de verdade: **não**',
    '- Merge automático: **não**',
    '- Revisão humana independente: **obrigatória**',
    '- Ativação do ciclo: **bloqueada**',
    '',
    '> Esta proposta somente direciona a divergência à fonte responsável.',
    '> A eventual correção deve ocorrer em outro PR, com validação específica da fonte de verdade.',
    '',
    '**Tehkné Solutions**',
    '',
  ];
  const markdown = lines.join('\n');
  if (/proposerFingerprint|sha256:[a-f0-9]{64}|actorId|actor_id|@[a-z0-9_-]+/i.test(markdown)) {
    throw new Error('Markdown da proposta contém identidade não permitida.');
  }
  return markdown;
}
