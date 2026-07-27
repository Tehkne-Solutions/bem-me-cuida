import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { assertSourceCommit } from './lib/cycle012-bootstrap.mjs';
import { buildOperationsSnapshot, renderOperationsMarkdown } from './lib/cycle012-operations-dashboard.mjs';

const root = process.cwd();
const arg = (name, fallback = '') => {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] : fallback;
};
const readJson = (path) => JSON.parse(readFileSync(join(root, path), 'utf8'));
const sourceCommit = assertSourceCommit(arg('source-commit'));
const jsonOutput = arg('json-output', 'artifacts/cycle012-operations-dashboard.json');
const markdownOutput = arg('markdown-output', 'artifacts/cycle012-operations-dashboard.md');
const config = readJson('release/cycle-0.12.0/operations-dashboard-config.json');
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
const markdown = renderOperationsMarkdown(snapshot, 'status');
for (const output of [jsonOutput, markdownOutput]) mkdirSync(dirname(join(root, output)), { recursive: true });
writeFileSync(join(root, jsonOutput), `${JSON.stringify(snapshot, null, 2)}\n`, 'utf8');
writeFileSync(join(root, markdownOutput), markdown, 'utf8');
console.log(`dashboard_json=${jsonOutput}`);
console.log(`dashboard_markdown=${markdownOutput}`);
console.log(`status=${snapshot.status}`);
console.log(`recommendation=${snapshot.recommendation}`);
console.log('Painel gerado em modo somente leitura.');
console.log('Tehkné Solutions');
