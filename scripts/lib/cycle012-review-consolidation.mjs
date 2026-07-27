const PASSING_VERDICTS = new Set(['pass', 'pass-with-residual-risk']);

export function consolidateReviewRecords({ sourceCommit, records, config }) {
  const commitRecords = records.filter((record) => record.sourceCommit === sourceCommit);
  const blockingRecords = commitRecords.filter((record) => record.verdict === 'changes-required');
  const passingByTrack = new Map();

  for (const record of commitRecords) {
    if (!PASSING_VERDICTS.has(record.verdict)) continue;
    if (!passingByTrack.has(record.track)) passingByTrack.set(record.track, record);
  }

  const reviewerFingerprints = new Set([...passingByTrack.values()].map((record) => record.reviewerFingerprint));
  const securityReviewer = passingByTrack.get('security')?.reviewerFingerprint ?? null;
  const privacyReviewer = passingByTrack.get('privacy')?.reviewerFingerprint ?? null;
  const missingTracks = config.requiredTracks.filter((track) => !passingByTrack.has(track));
  const residualRiskTracks = [...passingByTrack.values()]
    .filter((record) => record.verdict === 'pass-with-residual-risk')
    .map((record) => record.track)
    .sort();

  const reviewGates = {
    allTracksPass: missingTracks.length === 0,
    minimumDistinctReviewersPass: reviewerFingerprints.size >= config.minimumDistinctReviewers,
    securityPrivacySeparationPass: Boolean(securityReviewer && privacyReviewer && securityReviewer !== privacyReviewer),
    noChangesRequired: blockingRecords.length === 0,
  };

  return {
    sourceCommit,
    recordCount: commitRecords.length,
    passingTracks: [...passingByTrack.keys()].sort(),
    missingTracks,
    distinctReviewerCount: reviewerFingerprints.size,
    residualRiskTracks,
    changesRequiredTracks: [...new Set(blockingRecords.map((record) => record.track))].sort(),
    reviewGates,
    reviewComplete: Object.values(reviewGates).every(Boolean),
  };
}

export function evaluateExternalGates({ sourceClosure, cleanup, feedback, scope, migrationPlan }) {
  const gates = {
    sourceCycleClosure: sourceClosure?.status === 'closed',
    environmentCleanup: cleanup?.status === 'completed',
    feedbackSummary: ['approved', 'ready-for-human-review'].includes(feedback?.status),
    scopeApproval: scope?.approval?.status === 'approved',
    migrationPlanApproval: migrationPlan?.approval?.status === 'approved',
  };
  const blockers = Object.entries(gates).filter(([, passed]) => !passed).map(([gate]) => gate);
  return { gates, blockers, externalGatesComplete: blockers.length === 0 };
}

export function buildConsolidationArtifact({ sourceCommit, records, config, sourceClosure, cleanup, feedback, scope, migrationPlan, generatedAt }) {
  const reviews = consolidateReviewRecords({ sourceCommit, records, config });
  const external = evaluateExternalGates({ sourceClosure, cleanup, feedback, scope, migrationPlan });
  const proposalReady = reviews.reviewComplete && external.externalGatesComplete;

  return {
    schemaVersion: '1.0',
    product: 'BemMeCuida',
    generatedBy: 'Tehkné Solutions',
    cycleVersion: '0.12.0',
    artifactType: 'cycle012-review-consolidation',
    generatedAt,
    sourceCommit,
    status: proposalReady ? 'ready-for-human-activation-proposal' : reviews.reviewComplete ? 'review-complete-external-gates-blocked' : 'review-incomplete',
    reviews,
    external,
    recommendation: proposalReady ? 'prepare-human-activation-proposal' : 'hold',
    activationAllowed: false,
    controls: {
      humanMergeRequired: true,
      doesNotActivateAutomatically: true,
      doesNotAuthorizeMigrations: true,
      doesNotAuthorizeImplementation: true,
    },
    privacy: {
      containsPersonalData: false,
      containsClinicalData: false,
      containsRawFeedback: false,
      containsJournalContent: false,
      containsSecrets: false,
      containsRawIdentity: false,
    },
  };
}
