import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { assertSourceCommit } from './lib/cycle012-bootstrap.mjs';
import { buildOperationsSnapshot } from './lib/cycle012-operations-dashboard.mjs';
import { buildOperationsQueue } from './lib/cycle012-operations-queue.mjs';
import { buildQueueUpdateRecord } from './lib/cycle012-queue-update.mjs';

const root = process.cwd();
const arg = (name, fallback = '') => {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] : fallback;
};
const readJson = (path) => JSON.parse(readFileSync(join(root, path), 'utf8'));
const readRecords = (directory, relativePrefix) => existsSync(directory)
  ? readdirSync(directory).filter((name) => name.endsWith('.json')).sort().map((name) => readJson(`${relativePrefix}/${name}`))
  : [];

const sourceCommit = assertSourceCommit(arg('source-commit'));
const submittedAt = arg('submitted-at', new Date().toISOString());
const outputDir = arg('output-dir', 'release/cycle-0.12.0/queue-updates');
const dashboardConfig = readJson('release/cycle-0.12.0/operations-dashboard-config.json');
const queueConfig = readJson('release/cycle-0.12.0/operations-queue-config.json');
const updatePolicy = readJson('release/cycle-0.12.0/queue-update-policy.json');
const reviewsDir = join(root, 'release/cycle-0.12.0/reviews');
const records = readRecords(reviewsDir, 'release/cycle-0.12.0/reviews');
const snapshot = buildOperationsSnapshot({
  sourceCommit,
  records,
  config: dashboardConfig,
  sourceClosure: readJson('release/rc-0.11.0/cycle-closure.json'),
  cleanup: readJson('release/cycle-0.12.0/environment-cleanup.json'),
  feedback: readJson('release/cycle-0.12.0/feedback-summary.json'),
  scope: readJson('release/cycle-0.12.0/scope.json'),
  migrationPlan: readJson('release/cycle-0.12.0/migration-plan.json'),
  generatedAt: submittedAt,
});
const queue = buildOperationsQueue({ snapshot, config: queueConfig, generatedAt: submittedAt });
const record = buildQueueUpdateRecord({
  sourceCommit,
  queue,
  policy: updatePolicy,
  queueItemId: arg('queue-item-id', process.env.QUEUE_ITEM_ID ?? ''),
  progressState: arg('progress-state', process.env.PROGRESS_STATE ?? ''),
  dependencyState: arg('dependency-state', process.env.DEPENDENCY_STATE ?? 'unchanged'),
  dependencyIds: arg('dependency-ids', process.env.DEPENDENCY_IDS ?? ''),
  evidenceKind: arg('evidence-kind', process.env.EVIDENCE_KIND ?? 'none'),
  evidenceUrl: arg('evidence-url', process.env.EVIDENCE_URL ?? ''),
  actorId: arg('actor-id', process.env.ACTOR_ID ?? ''),
  submittedAt,
});
const outputPath = join(root, outputDir, `${record.recordId}.json`);
if (existsSync(outputPath)) throw new Error(`Registro duplicado: ${record.recordId}.`);
mkdirSync(dirname(outputPath), { recursive: true });
writeFileSync(outputPath, `${JSON.stringify(record, null, 2)}\n`, 'utf8');
console.log(`record_id=${record.recordId}`);
console.log(`queue_item_id=${record.queueItemId}`);
console.log(`output=${outputPath}`);
console.log(`progress_state=${record.progress.state}`);
console.log('Atualização registrada sem concluir item ou alterar gate.');
console.log('Tehkné Solutions');
