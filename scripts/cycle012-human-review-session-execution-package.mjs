import crypto from 'node:crypto';

const FORBIDDEN = [
  /diff --git/i,
  /BEGIN PATCH/i,
  /replacementContent/i,
  /migrationSql/i,
  /supabase db push/i,
  /git apply/i,
  /npm run deploy/i,
  /eas submit/i,
];

const stable = (value) => JSON.stringify(value, Object.keys(value).sort());

export function buildHumanReviewSessionExecutionPackage(input) {
  if (input.authorizationClassification !== 'current-and-compatible') {
    throw new Error('A autorização de início da sessão não está current-and-compatible.');
  }
  if (!input.authorizationId || !input.authorizationValidationCommit) {
    throw new Error('Referências da autorização são obrigatórias.');
  }

  const sections = {
    sessionIdentity: {
      cycle: '0.12.0',
      title: input.title ?? 'Sessão humana de revisão administrativa',
      mode: 'manual-only',
    },
    participants: input.participants ?? [],
    agenda: input.agenda ?? [
      'Confirmar escopo e referências',
      'Responder perguntas de revisão',
      'Executar checklist administrativo',
      'Registrar evidências não operacionais',
      'Encerrar com decisão e pendências',
    ],
    reviewQuestions: input.reviewQuestions ?? [],
    reviewChecklist: input.reviewChecklist ?? [],
    evidenceFields: ['evidenceId', 'description', 'sourceReference', 'capturedAt', 'capturedBy'],
    decisionFields: ['reviewOutcome', 'reviewNotes', 'followUpRequired', 'reviewedAt', 'reviewedBy'],
    closureFields: ['sessionStatus', 'closedAt', 'closedBy', 'openQuestions', 'nextAdministrativeStep'],
    riskNotes: input.riskNotes ?? [
      'O pacote não autoriza edição de código.',
      'O pacote não autoriza execução de comandos.',
      'O pacote não autoriza criação de branch funcional ou PR operacional.',
    ],
    references: {
      authorizationId: input.authorizationId,
      authorizationValidationCommit: input.authorizationValidationCommit,
      sessionPackageId: input.sessionPackageId ?? null,
    },
  };

  const serialized = JSON.stringify(sections);
  if (FORBIDDEN.some((pattern) => pattern.test(serialized))) {
    throw new Error('Conteúdo operacional proibido detectado no pacote.');
  }

  const packageId = `hrsx-${crypto.createHash('sha256').update(stable(sections)).digest('hex').slice(0, 16)}`;
  return {
    artifactType: 'human-review-session-execution-package',
    packageId,
    generatedAt: input.generatedAt ?? null,
    ...sections,
    controls: {
      executionPackageGenerationAllowed: true,
      reviewSessionExecutionAllowed: false,
      functionalBranchCreationAllowed: false,
      pullRequestOpeningAllowed: false,
      patchGenerationAllowed: false,
      sourceMutationAllowed: false,
      executionAllowed: false,
      correctionAuthorized: false,
      mergeAllowed: false,
      activationAllowed: false,
      humanReviewRequired: true,
    },
  };
}
