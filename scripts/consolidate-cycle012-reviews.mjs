import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { assertSourceCommit, sanitizeCycle012Artifact } from './lib/cycle012-bootstrap.mjs';
import { buildConsolidationArtifact } from './lib/cycle012-review-consolidation.mjs';

const root = process.cwd();
const arg = (name, fallback = '') => {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] : fallback;
};
const readJson = (path) => JSON.parse(readFileSync(join(root, path), 'utf8'));

const sourceCommit = assertSourceCommit(arg('source-commit'));
const output = arg('output');
if (!output) throw new Error('--output é obrigatório.');

const config = readJson('release/cycle-0.12.0/review-consolidation-config.json');
const reviewsDir = join(root, config.reviewDirectory);
const records = [];
if (existsSync(reviewsDir)) {
  for (const name of readdirSync(reviewsDir).filter((entry) => entry.endsWith('.json')).sort()) {
    records.push(JSON.parse(readFileSync(join(reviewsDir, name), 'utf8')));
  }
}

const artifact = sanitizeCycle012Artifact(buildConsolidationArtifact({
  sourceCommit,
  records,
  config,
  sourceClosure: readJson('release/rc-0.11.0/cycle-closure.json'),
  cleanup: readJson('release/cycle-0.12.0/environment-cleanup.json'),
  feedback: readJson('release/cycle-0.12.0/feedback-summary.json'),
  scope: readJson('release/cycle-0.12.0/scope.json'),
  migrationPlan: readJson('release/cycle-0.12.0/migration-plan.json'),
  generatedAt: new Date().toISOString(),
}));

mkdirSync(dirname(join(root, output)), { recursive: true });
writeFileSync(join(root, output), `${JSON.stringify(artifact, null, 2)}\n`, 'utf8');
console.log(`consolidation_path=${output}`);
console.log(`status=${artifact.status}`);
console.log(`recommendation=${artifact.recommendation}`);
console.log('A consolidação não ativa o ciclo nem autoriza migrations.');
console.log('Tehkné Solutions');
