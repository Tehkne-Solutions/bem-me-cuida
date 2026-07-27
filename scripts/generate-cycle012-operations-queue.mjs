import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { assertSourceCommit } from './lib/cycle012-bootstrap.mjs';
import { buildOperationsSnapshot } from './lib/cycle012-operations-dashboard.mjs';
import { buildOperationsQueue, renderOperationsQueueMarkdown } from './lib/cycle012-operations-queue.mjs';
import { applyQueueUpdates } from './lib/cycle012-queue-update.mjs';

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
const jsonOutput = arg('json-output', 'artifacts/cycle012-operations-queue.json');
const markdownOutput = arg('markdown-output', 'artifacts/cycle012-operations-queue.md');
const generatedAt = new Date().toISOString();
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
  generatedAt,
});
const baseQueue = buildOperationsQueue({ snapshot, config: queueConfig, generatedAt });
const updatesDir = join(root, updatePolicy.record.directory);
const updates = readRecords(updatesDir, updatePolicy.record.directory);
const queue = applyQueueUpdates(baseQueue, updates, updatePolicy);
const markdown = renderOperationsQueueMarkdown(queue, 'queue');
mkdirSync(dirname(join(root, jsonOutput)), { recursive: true });
mkdirSync(dirname(join(root, markdownOutput)), { recursive: true });
writeFileSync(join(root, jsonOutput), `${JSON.stringify(queue, null, 2)}\n`, 'utf8');
writeFileSync(join(root, markdownOutput), markdown, 'utf8');
console.log(`queue=${jsonOutput}`);
console.log(`dashboard=${markdownOutput}`);
console.log(`items=${queue.summary.totalItems}`);
console.log(`ready=${queue.summary.readyItems}`);
console.log(`updates=${queue.summary.mergedUpdateCount}`);
console.log('Fila gerada em modo somente leitura com relatos informativos.');
console.log('Tehkné Solutions');
