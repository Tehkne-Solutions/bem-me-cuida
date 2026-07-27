import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { assertSourceCommit } from './lib/cycle012-bootstrap.mjs';
import { buildOperationsSnapshot, renderOperationsMarkdown } from './lib/cycle012-operations-dashboard.mjs';
import { parseCycle012OperationsCommand } from './lib/cycle012-operations-command-router.mjs';
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
const commandText = arg('command', process.env.CYCLE012_COMMAND ?? '');
const sourceCommit = assertSourceCommit(arg('source-commit'));
const output = arg('output', 'artifacts/cycle012-operations-command.md');
const dashboardConfig = readJson('release/cycle-0.12.0/operations-dashboard-config.json');
const queueConfig = readJson('release/cycle-0.12.0/operations-queue-config.json');
const updatePolicy = readJson('release/cycle-0.12.0/queue-update-policy.json');
const route = parseCycle012OperationsCommand(commandText, dashboardConfig, queueConfig);
const reviewsDir = join(root, 'release/cycle-0.12.0/reviews');
const records = readRecords(reviewsDir, 'release/cycle-0.12.0/reviews');
const generatedAt = new Date().toISOString();
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
const updatesDir = join(root, updatePolicy.record.directory);
const updates = readRecords(updatesDir, updatePolicy.record.directory);
const markdown = route.surface === 'queue'
  ? renderOperationsQueueMarkdown(
      applyQueueUpdates(buildOperationsQueue({ snapshot, config: queueConfig, generatedAt }), updates, updatePolicy),
      route.command,
    )
  : renderOperationsMarkdown(snapshot, route.command);
mkdirSync(dirname(join(root, output)), { recursive: true });
writeFileSync(join(root, output), markdown, 'utf8');
console.log(`command=${route.command}`);
console.log(`surface=${route.surface}`);
console.log(`output=${output}`);
console.log(`status=${snapshot.status}`);
console.log(`updates=${updates.length}`);
console.log('Comando executado em modo somente leitura.');
console.log('Tehkné Solutions');
