import { createHash } from 'node:crypto';

const SHA_PATTERN = /^[a-f0-9]{40}$/i;
const ID_PATTERN = /^[a-z0-9][a-z0-9-]{7,127}$/;

export function buildProposalDecision({ validationItem, decision, actorId, sourceCommit, decidedAt, policy }) {
  if (!validationItem?.proposalId || !ID_PATTERN.test(validationItem.proposalId)) throw new Error('Proposta inválida.');
  if (!SHA_PATTERN.test(sourceCommit ?? '')) throw new Error('sourceCommit inválido.');
  if (!policy.decisions?.includes(decision)) throw new Error('Decisão não permitida.');
  const allowed = policy.allowedValidationClassifications?.[decision] ?? [];
  if (!allowed.includes(validationItem.classification)) throw new Error('Decisão incompatível com a validação atual.');
  if (!actorId) throw new Error('Ator obrigatório.');
  const decisionId = `decision-${createHash('sha256').update(`${validationItem.proposalId}:${decision}:${sourceCommit}`).digest('hex').slice(0, 24)}`;
  return assertProposalDecisionSafe({
    schemaVersion: '1.0',
    product: 'BemMeCuida',
    generatedBy: 'Tehkné Solutions',
    cycleVersion: '0.12.0',
    artifactType: 'cycle012-proposal-decision',
    decisionId,
    proposalId: validationItem.proposalId,
    proposalValidationClassification: validationItem.classification,
    decision,
    sourceCommit,
    decidedAt,
    deciderFingerprint: `sha256:${createHash('sha256').update(`cycle012:${actorId}`).digest('hex')}`,
    executionAllowed: false,
    correctionAuthorized: false,
    activationAllowed: false,
    controls: { ...policy.controls },
  }, policy);
}

export function assertProposalDecisionSafe(record, policy) {
  if (record?.artifactType !== 'cycle012-proposal-decision' || record?.cycleVersion !== '0.12.0') throw new Error('Registro incompatível.');
  if (!policy.decisions.includes(record.decision)) throw new Error('Decisão inválida.');
  if (!policy.allowedValidationClassifications[record.decision]?.includes(record.proposalValidationClassification)) throw new Error('Classificação incompatível.');
  if (record.executionAllowed !== false || record.correctionAuthorized !== false || record.activationAllowed !== false) throw new Error('Decisão não pode executar ou ativar.');
  const text = JSON.stringify(record);
  if (/email|login|username|password|secretValue|actorId|actor_id/i.test(text)) throw new Error('Identidade ou segredo não permitido.');
  for (const [key, value] of Object.entries(policy.controls)) if (value === true && record.controls?.[key] !== true) throw new Error(`Controle ausente: ${key}`);
  return record;
}

export function renderProposalDecisionMarkdown(record) {
  return [
    '## Decisão humana sobre proposta — BemMeCuida 0.12.0', '',
    `**Proposta:** \`${record.proposalId}\``,
    `**Classificação validada:** \`${record.proposalValidationClassification}\``,
    `**Decisão:** \`${record.decision}\``, '',
    '**Execução permitida:** `false`',
    '**Correção autorizada:** `false`',
    '**Ativação permitida:** `false`', '',
    '> Esta decisão registra orientação humana, mas não executa a proposta nem altera sua fonte.', '',
    '**Tehkné Solutions**', '',
  ].join('\n');
}
