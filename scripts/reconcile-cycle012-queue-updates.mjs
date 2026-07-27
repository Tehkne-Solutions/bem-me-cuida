import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { assertSourceCommit } from './lib/cycle012-bootstrap.mjs';
import { buildOperationsSnapshot } from './lib/cycle012-operations-dashboard.mjs';
import { buildOperationsQueue } from './lib/cycle012-operations-queue.mjs';
import { buildQueueReconciliation, renderQueueReconciliationMarkdown } from './lib/cycle012-queue-reconciliation.mjs';

const root = process.cwd();
const arg = (name, fallback = '') => {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] : fallback;
};
const readJson = (path) => JSON.parse(readFileSync(join(root, path), 'utf8'));
const readJsonDirectory = (path) => {
  const directory = join(root, path);
  return existsSync(directory)
    ? readdirSync(directory).filter((name) => name.endsWith('.json')).sort().map((name) => readJson(`${path}/${name}`))
    : [];
};

const sourceCommit = assertSourceCommit(arg('source-commit'));
const jsonOutput = arg('json-output', 'artifacts/cycle012-queue-reconciliation.json');
const markdownOutput = arg('markdown-output', 'artifacts/cycle012-queue-reconciliation.md');
const generatedAt = arg('generated-at', new Date().toISOString());

const dashboardConfig = readJson('release/cycle-0.12.0/operations-dashboard-config.json');
const queueConfig = readJson('release/cycle-0.12.0/operations-queue-config.json');
const updatePolicy = readJson('release/cycle-0.12.0/queue-update-policy.json');
const reconciliationPolicy = readJson('release/cycle-0.12.0/queue-reconciliation-policy.json');
const records = readJsonDirectory(updatePolicy.record.directory);
const reviewRecords = readJsonDirectory('release/cycle-0.12.0/reviews');

const snapshot = buildOperationsSnapshot({
  sourceCommit,
  records: reviewRecords,
  config: dashboardConfig,
  sourceClosure: readJson('release/rc-0.11.0/cycle-closure.json'),
  cleanup: readJson('release/cycle-0.12.0/environment-cleanup.json'),
  feedback: readJson('release/cycle-0.12.0/feedback-summary.json'),
  scope: readJson('release/cycle-0.12.0/scope.json'),
  migrationPlan: readJson('release/cycle-0.12.0/migration-plan.json'),
  generatedAt,
});
const queue = buildOperationsQueue({ snapshot, config: queueConfig, generatedAt });
const report = buildQueueReconciliation({
  queue,
  records,
  queueConfig,
  updatePolicy,
  policy: reconciliationPolicy,
  generatedAt,
});
const markdown = renderQueueReconciliationMarkdown(report);

mkdirSync(dirname(join(root, jsonOutput)), { recursive: true });
mkdirSync(dirname(join(root, markdownOutput)), { recursive: true });
writeFileSync(join(root, jsonOutput), `${JSON.stringify(report, null, 2)}\n`, 'utf8');
writeFileSync(join(root, markdownOutput), markdown, 'utf8');

console.log(`reconciliation=${jsonOutput}`);
console.log(`summary=${markdownOutput}`);
console.log(`records=${report.summary.recordCount}`);
console.log(`critical=${report.summary.criticalCount}`);
console.log(`warnings=${report.summary.warningCount}`);
console.log('Reconciliação gerada em modo somente leitura.');
console.log('Tehkné Solutions');
