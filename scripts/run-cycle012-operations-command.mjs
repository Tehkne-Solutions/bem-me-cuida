import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { assertSourceCommit } from './lib/cycle012-bootstrap.mjs';
import { buildOperationsSnapshot, parseOperationsCommand, renderOperationsMarkdown } from './lib/cycle012-operations-dashboard.mjs';

const root = process.cwd();
const arg = (name, fallback = '') => {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] : fallback;
};
const readJson = (path) => JSON.parse(readFileSync(join(root, path), 'utf8'));
const commandText = arg('command', process.env.CYCLE012_COMMAND ?? '');
const sourceCommit = assertSourceCommit(arg('source-commit'));
const output = arg('output', 'artifacts/cycle012-operations-command.md');
const config = readJson('release/cycle-0.12.0/operations-dashboard-config.json');
const command = parseOperationsCommand(commandText, config);
const reviewsDir = join(root, 'release/cycle-0.12.0/reviews');
const records = existsSync(reviewsDir)
  ? readdirSync(reviewsDir).filter((name) => name.endsWith('.json')).sort().map((name) => readJson(`release/cycle-0.12.0/reviews/${name}`))
  : [];
const snapshot = buildOperationsSnapshot({
  sourceCommit,
  records,
  config,
  sourceClosure: readJson('release/rc-0.11.0/cycle-closure.json'),
  cleanup: readJson('release/cycle-0.12.0/environment-cleanup.json'),
  feedback: readJson('release/cycle-0.12.0/feedback-summary.json'),
  scope: readJson('release/cycle-0.12.0/scope.json'),
  migrationPlan: readJson('release/cycle-0.12.0/migration-plan.json'),
  generatedAt: new Date().toISOString(),
});
const markdown = renderOperationsMarkdown(snapshot, command);
mkdirSync(dirname(join(root, output)), { recursive: true });
writeFileSync(join(root, output), markdown, 'utf8');
console.log(`command=${command}`);
console.log(`output=${output}`);
console.log(`status=${snapshot.status}`);
console.log('Comando executado em modo somente leitura.');
console.log('Tehkné Solutions');
