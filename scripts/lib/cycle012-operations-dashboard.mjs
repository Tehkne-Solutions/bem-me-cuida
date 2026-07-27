import { evaluateCycle012 } from './cycle012-bootstrap.mjs';
import { consolidateReviewRecords } from './cycle012-review-consolidation.mjs';

const SAFE_COMMAND_PATTERN = /^\/cycle012\s+(status|reviews|blockers|gates)$/;

export function parseOperationsCommand(input, config) {
  const value = String(input ?? '').trim();
  const match = SAFE_COMMAND_PATTERN.exec(value);
  if (!match) throw new Error('Comando inválido. Use /cycle012 status|reviews|blockers|gates.');
  const command = match[1];
  if (config.commands?.prefix !== '/cycle012' || !config.commands?.allowed?.includes(command)) {
    throw new Error('Comando não autorizado pela configuração versionada.');
  }
  if (config.commands?.exactMatchRequired !== true || config.commands?.freeTextAllowed !== false) {
    throw new Error('Configuração de comandos precisa permanecer estrita e sem texto livre.');
  }
  return command;
}

const gate = (id, label, status, passed) => ({ id, label, status: status ?? 'missing', passed: Boolean(passed) });

export function buildOperationsSnapshot({
  sourceCommit,
  records,
  config,
  sourceClosure,
  cleanup,
  feedback,
  scope,
  migrationPlan,
  generatedAt,
}) {
  if (!/^[0-9a-f]{40}$/i.test(String(sourceCommit ?? ''))) throw new Error('sourceCommit inválido.');
  const reviews = consolidateReviewRecords({
    sourceCommit,
    records,
    config: {
      requiredTracks: ['architecture', 'security', 'privacy', 'accessibility', 'database'],
      minimumDistinctReviewers: 3,
    },
  });
  const externalDecision = evaluateCycle012({ sourceClosure, cleanup, feedback, scope, migrationPlan });
  const externalGates = [
    gate('source-cycle-closure', 'Encerramento da 0.11.0', sourceClosure?.status, sourceClosure?.status === 'closed'),
    gate('environment-cleanup', 'Limpeza de environments temporários', cleanup?.status, cleanup?.status === 'completed'),
    gate('feedback-summary', 'Feedback agregado e anonimizado', feedback?.status, ['approved', 'ready-for-human-review'].includes(feedback?.status)),
    gate('scope-approval', 'Escopo do ciclo 0.12.0', scope?.approval?.status, scope?.approval?.status === 'approved'),
    gate('migration-plan-approval', 'Plano de migrations', migrationPlan?.approval?.status, migrationPlan?.approval?.status === 'approved'),
  ];
  const reviewBlockers = [
    ...reviews.missingTracks.map((track) => `review:${track}`),
    ...reviews.changesRequiredTracks.map((track) => `changes-required:${track}`),
  ];
  if (!reviews.reviewGates.minimumDistinctReviewersPass) reviewBlockers.push('review:minimum-distinct-reviewers');
  if (!reviews.reviewGates.securityPrivacySeparationPass) reviewBlockers.push('review:security-privacy-separation');
  const externalBlockers = externalDecision.blockers.map((item) => `external:${item}`);
  const blockers = [...new Set([...reviewBlockers, ...externalBlockers])].sort();
  const externalComplete = externalDecision.recommendation === 'ready-for-human-activation';
  const status = reviews.reviewComplete && externalComplete
    ? 'ready-for-human-proposal'
    : reviews.reviewComplete
      ? 'review-complete-external-blocked'
      : 'review-incomplete';
  const recommendation = status === 'ready-for-human-proposal' ? 'prepare-human-proposal' : 'hold';

  const snapshot = {
    schemaVersion: '1.0',
    product: 'BemMeCuida',
    generatedBy: 'Tehkné Solutions',
    cycleVersion: '0.12.0',
    artifactType: 'cycle012-operations-dashboard',
    generatedAt,
    sourceCommit: String(sourceCommit).toLowerCase(),
    status,
    recommendation,
    activationAllowed: false,
    summary: {
      reviewPackageComplete: reviews.reviewComplete,
      externalGatesComplete: externalComplete,
      blockerCount: blockers.length,
      passingTrackCount: reviews.passingTracks.length,
      requiredTrackCount: 5,
      distinctReviewerCount: reviews.distinctReviewerCount,
    },
    reviews: {
      tracks: ['architecture', 'security', 'privacy', 'accessibility', 'database'].map((track) => ({
        id: track,
        status: reviews.changesRequiredTracks.includes(track)
          ? 'changes-required'
          : reviews.passingTracks.includes(track)
            ? 'passed'
            : 'pending',
        residualRisk: reviews.residualRiskTracks.includes(track),
      })),
      minimumDistinctReviewersPass: reviews.reviewGates.minimumDistinctReviewersPass,
      securityPrivacySeparationPass: reviews.reviewGates.securityPrivacySeparationPass,
      reviewPackageComplete: reviews.reviewComplete,
    },
    externalGates,
    blockers,
    controls: {
      readOnly: true,
      doesNotActivateCycle: true,
      doesNotAuthorizeMigrations: true,
      doesNotAuthorizeImplementation: true,
      doesNotMergePullRequests: true,
      doesNotPublishBuilds: true,
      doesNotDeleteEnvironments: true,
    },
    privacy: {
      containsPersonalData: false,
      containsClinicalData: false,
      containsRawFeedback: false,
      containsJournalContent: false,
      containsSecrets: false,
      containsRawIdentity: false,
      containsReviewIdentifiers: false,
    },
  };
  assertOperationsSnapshotSafe(snapshot, config);
  return snapshot;
}

export function assertOperationsSnapshotSafe(snapshot, config) {
  const text = JSON.stringify(snapshot);
  if (/reviewerFingerprint|actorId|actor_id|repositoryId|repository_id/i.test(text)) {
    throw new Error('Painel contém identidade ou fingerprint bruta.');
  }
  if (snapshot.activationAllowed !== false || snapshot.controls?.readOnly !== true) {
    throw new Error('Painel precisa permanecer somente leitura e sem ativação.');
  }
  for (const control of ['doesNotActivateCycle', 'doesNotAuthorizeMigrations', 'doesNotAuthorizeImplementation', 'doesNotMergePullRequests', 'doesNotPublishBuilds', 'doesNotDeleteEnvironments']) {
    if (snapshot.controls?.[control] !== true || config.controls?.[control] !== true) throw new Error(`Controle ausente: ${control}.`);
  }
  return snapshot;
}

const icon = (status) => status === 'passed' || status === 'closed' || status === 'completed' || status === 'approved' || status === 'ready-for-human-review' ? '✅' : status === 'changes-required' || status === 'blocked' ? '⛔' : '⏳';

export function renderOperationsMarkdown(snapshot, command = 'status') {
  const header = [
    '## Painel operacional — BemMeCuida 0.12.0',
    '',
    `**Estado:** \`${snapshot.status}\``,
    `**Recomendação:** \`${snapshot.recommendation}\``,
    `**Ativação automática:** \`false\``,
    '',
  ];
  const reviews = [
    '### Revisões humanas',
    '',
    '| Trilha | Estado | Risco residual |',
    '|---|---|---|',
    ...snapshot.reviews.tracks.map((row) => `| ${row.id} | ${icon(row.status)} \`${row.status}\` | ${row.residualRisk ? 'sim' : 'não'} |`),
    '',
    `- Revisores distintos: **${snapshot.summary.distinctReviewerCount}**`,
    `- Mínimo de revisores atendido: **${snapshot.reviews.minimumDistinctReviewersPass ? 'sim' : 'não'}**`,
    `- Separação segurança/privacidade: **${snapshot.reviews.securityPrivacySeparationPass ? 'sim' : 'não'}**`,
    '',
  ];
  const gates = [
    '### Gates externos',
    '',
    '| Gate | Estado | Resultado |',
    '|---|---|---|',
    ...snapshot.externalGates.map((row) => `| ${row.label} | ${icon(row.status)} \`${row.status}\` | ${row.passed ? 'aprovado' : 'pendente'} |`),
    '',
  ];
  const blockers = [
    '### Bloqueadores',
    '',
    ...(snapshot.blockers.length ? snapshot.blockers.map((item) => `- \`${item}\``) : ['- Nenhum bloqueador nos artefatos versionados.']),
    '',
  ];
  const footer = ['> Painel somente leitura. Nenhum comando ativa ciclo, cria migration, publica build ou exclui environment.', '', '**Tehkné Solutions**', ''];
  const sections = command === 'reviews' ? reviews : command === 'gates' ? gates : command === 'blockers' ? blockers : [...reviews, ...gates, ...blockers];
  const markdown = [...header, ...sections, ...footer].join('\n');
  if (/sha256:[0-9a-f]{64}|reviewerFingerprint|actorId|actor_id/i.test(markdown)) throw new Error('Markdown contém identidade não permitida.');
  return markdown;
}
