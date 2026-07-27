import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const config = JSON.parse(readFileSync(join(root, 'release/cycle-0.12.0/review-capture-config.json'), 'utf8'));
const env = process.env;
const failures = [];

const track = env.REVIEW_TRACK;
const verdict = env.REVIEW_VERDICT;
const evidenceUrl = env.REVIEW_EVIDENCE_URL;
const sourceCommit = env.REVIEW_SOURCE_COMMIT;
const repositoryId = env.GITHUB_REPOSITORY_ID;
const actorId = env.GITHUB_ACTOR_ID;
const reviewedAt = env.REVIEWED_AT ?? new Date().toISOString();

if (!config.allowedTracks.includes(track)) failures.push('trilha de revisão inválida.');
if (!config.allowedVerdicts.includes(verdict)) failures.push('veredito de revisão inválido.');
if (!/^[0-9a-f]{40}$/i.test(sourceCommit ?? '')) failures.push('source commit precisa ser SHA completo de 40 caracteres.');
if (!repositoryId || !/^\d+$/.test(repositoryId)) failures.push('GITHUB_REPOSITORY_ID inválido.');
if (!actorId || !/^\d+$/.test(actorId)) failures.push('GITHUB_ACTOR_ID inválido.');

let parsedEvidence;
try {
  parsedEvidence = new URL(evidenceUrl);
  if (parsedEvidence.protocol !== 'https:') failures.push('evidência precisa usar HTTPS.');
  if (parsedEvidence.username || parsedEvidence.password) failures.push('URL de evidência não pode conter credenciais.');
  if (['localhost', '127.0.0.1', '0.0.0.0'].includes(parsedEvidence.hostname)) failures.push('URL de evidência local não é permitida.');
} catch {
  failures.push('URL de evidência inválida.');
}

if (Number.isNaN(Date.parse(reviewedAt))) failures.push('timestamp de revisão inválido.');

if (failures.length) {
  console.error('Registro de revisão 0.12.0 rejeitado:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

const reviewerFingerprint = `sha256:${createHash('sha256').update(`${repositoryId}:${actorId}`).digest('hex')}`;
const reviewsDir = join(root, config.record.directory);
mkdirSync(reviewsDir, { recursive: true });
const shortCommit = sourceCommit.slice(0, 12).toLowerCase();
const fingerprintToken = reviewerFingerprint.slice(-12);
const filename = `${track}-${fingerprintToken}-${shortCommit}.json`;
const outputPath = join(reviewsDir, filename);

const duplicate = readdirSync(reviewsDir).some((name) => name === filename);
if (duplicate || existsSync(outputPath)) {
  console.error('Já existe uma revisão para esta trilha, revisor e commit.');
  process.exit(1);
}

const record = {
  schemaVersion: '1.0',
  product: 'BemMeCuida',
  generatedBy: 'Tehkné Solutions',
  cycleVersion: '0.12.0',
  status: 'human-review-recorded',
  track,
  verdict,
  reviewerFingerprint,
  sourceCommit: sourceCommit.toLowerCase(),
  evidenceUrl: parsedEvidence.toString(),
  reviewedAt: new Date(reviewedAt).toISOString(),
  controls: {
    doesNotActivateCycle: true,
    doesNotAuthorizeMigrations: true,
    doesNotAuthorizeImplementation: true,
    requiresEvidencePrReview: true
  },
  privacy: {
    containsPersonalData: false,
    containsClinicalData: false,
    containsRawFeedback: false,
    containsJournalContent: false,
    containsSecrets: false
  }
};

writeFileSync(outputPath, `${JSON.stringify(record, null, 2)}\n`, 'utf8');
console.log(`record_path=${config.record.directory}/${filename}`);
console.log(`reviewer_fingerprint=${reviewerFingerprint}`);
console.log('Registro humano criado sem ativar o ciclo.');
console.log('Tehkné Solutions');
