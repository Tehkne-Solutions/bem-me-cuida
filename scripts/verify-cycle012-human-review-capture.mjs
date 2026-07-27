import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const mode = process.argv[2] ?? 'structure';
const failures = [];
const readJson = (path) => JSON.parse(readFileSync(join(root, path), 'utf8'));
const config = readJson('release/cycle-0.12.0/review-capture-config.json');
const policy = readJson('release/cycle-0.12.0/approval-policy.json');
const reviewPackage = readJson('release/cycle-0.12.0/review-package.json');

const expectedTracks = [...policy.requiredTracks].sort();
const configuredTracks = [...config.allowedTracks].sort();
if (JSON.stringify(expectedTracks) !== JSON.stringify(configuredTracks)) failures.push('trilhas de captura divergem da política de aprovação.');
if (config.controls?.minimumDistinctReviewers !== policy.reviewerRules?.minimumDistinctReviewers) failures.push('mínimo de revisores diverge da política.');
if (config.controls?.authorCannotApproveOwnChange !== true) failures.push('controle de autoaprovação ausente.');
if (config.controls?.securityAndPrivacyReviewersMustDiffer !== true) failures.push('separação security/privacy ausente.');
if (config.controls?.doesNotActivateCycle !== true || config.controls?.doesNotAuthorizeMigrations !== true || config.controls?.doesNotAuthorizeImplementation !== true) failures.push('configuração não permanece fail-closed.');
if (config.fingerprint?.algorithm !== 'sha256' || config.fingerprint?.storesRawIdentity !== false) failures.push('fingerprint não está pseudonimizado corretamente.');
if (config.record?.freeTextAllowed !== false || config.record?.httpsEvidenceRequired !== true) failures.push('regras de evidência inválidas.');
if (reviewPackage.recommendation !== 'hold') failures.push('pacote base precisa permanecer em hold.');

const reviewsDir = join(root, config.record.directory);
const records = [];
if (existsSync(reviewsDir)) {
  for (const name of readdirSync(reviewsDir).filter((entry) => entry.endsWith('.json')).sort()) {
    const record = JSON.parse(readFileSync(join(reviewsDir, name), 'utf8'));
    records.push({ name, ...record });
  }
}

const seen = new Set();
for (const record of records) {
  const key = `${record.track}:${record.reviewerFingerprint}:${record.sourceCommit}`;
  if (seen.has(key)) failures.push(`${record.name}: revisão duplicada.`);
  seen.add(key);
  if (!config.allowedTracks.includes(record.track)) failures.push(`${record.name}: trilha inválida.`);
  if (!config.allowedVerdicts.includes(record.verdict)) failures.push(`${record.name}: veredito inválido.`);
  if (!/^sha256:[0-9a-f]{64}$/i.test(record.reviewerFingerprint ?? '')) failures.push(`${record.name}: fingerprint inválido.`);
  if (!/^[0-9a-f]{40}$/i.test(record.sourceCommit ?? '')) failures.push(`${record.name}: source commit inválido.`);
  if (record.status !== 'human-review-recorded') failures.push(`${record.name}: status inválido.`);
  if (Number.isNaN(Date.parse(record.reviewedAt))) failures.push(`${record.name}: timestamp inválido.`);
  try {
    const evidence = new URL(record.evidenceUrl);
    if (evidence.protocol !== 'https:' || evidence.username || evidence.password) failures.push(`${record.name}: evidência HTTPS inválida.`);
    if (['localhost', '127.0.0.1', '0.0.0.0'].includes(evidence.hostname)) failures.push(`${record.name}: evidência local proibida.`);
  } catch {
    failures.push(`${record.name}: URL de evidência inválida.`);
  }
  for (const control of ['authorCannotApproveOwnChange', 'doesNotActivateCycle', 'doesNotAuthorizeMigrations', 'doesNotAuthorizeImplementation', 'requiresEvidencePrReview']) {
    if (record.controls?.[control] !== true) failures.push(`${record.name}: controle ${control} ausente.`);
  }
  for (const privacyFlag of ['containsPersonalData', 'containsClinicalData', 'containsRawFeedback', 'containsJournalContent', 'containsSecrets']) {
    if (record.privacy?.[privacyFlag] !== false) failures.push(`${record.name}: flag de privacidade ${privacyFlag} inválida.`);
  }
}

const summaries = [];
const commits = [...new Set(records.map((record) => record.sourceCommit))];
for (const sourceCommit of commits) {
  const commitRecords = records.filter((record) => record.sourceCommit === sourceCommit);
  const passing = commitRecords.filter((record) => record.verdict === 'pass' || record.verdict === 'pass-with-residual-risk');
  const passingByTrack = new Map(passing.map((record) => [record.track, record]));
  const reviewers = new Set(passing.map((record) => record.reviewerFingerprint));
  const securityReviewer = passingByTrack.get('security')?.reviewerFingerprint;
  const privacyReviewer = passingByTrack.get('privacy')?.reviewerFingerprint;
  const allTracksPass = config.allowedTracks.every((track) => passingByTrack.has(track));
  const distinctReviewersPass = reviewers.size >= config.controls.minimumDistinctReviewers;
  const separationPass = Boolean(securityReviewer && privacyReviewer && securityReviewer !== privacyReviewer);
  const changesRequired = commitRecords.some((record) => record.verdict === 'changes-required');
  summaries.push({
    sourceCommit,
    records: commitRecords.length,
    passingTracks: [...passingByTrack.keys()].sort(),
    distinctReviewers: reviewers.size,
    allTracksPass,
    distinctReviewersPass,
    securityPrivacySeparationPass: separationPass,
    changesRequired,
    reviewPackageComplete: allTracksPass && distinctReviewersPass && separationPass && !changesRequired,
    activationAllowed: false
  });
}

if (!['structure', 'report'].includes(mode)) failures.push(`modo inválido: ${mode}`);
if (failures.length) {
  console.error('Captura de revisões humanas 0.12.0 reprovada:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

if (mode === 'report') {
  const best = summaries.sort((a, b) => Number(b.reviewPackageComplete) - Number(a.reviewPackageComplete) || b.passingTracks.length - a.passingTracks.length)[0] ?? null;
  console.log(JSON.stringify({
    cycleVersion: config.cycleVersion,
    status: config.status,
    recordCount: records.length,
    sourceCommitCount: summaries.length,
    bestCandidate: best,
    recommendation: best?.reviewPackageComplete ? 'review-complete-activation-still-blocked' : 'hold',
    activationAllowed: false
  }, null, 2));
}

console.log('Captura de revisões humanas 0.12.0 aprovada em modo fail-closed.');
console.log('Tehkné Solutions');
