import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { evaluateCycle012, assertEvidenceUrl, assertSourceCommit } from './lib/cycle012-bootstrap.mjs';

const arg = (name, fallback = '') => {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] : fallback;
};
const root = process.cwd();
const readJson = (path) => JSON.parse(readFileSync(join(root, path), 'utf8'));
const output = arg('output');
if (!output) throw new Error('--output é obrigatório.');
const sourceCommit = assertSourceCommit(arg('source-commit'));
const evidenceUrl = assertEvidenceUrl(arg('evidence-url'));
const decision = evaluateCycle012({
  sourceClosure: readJson('release/rc-0.11.0/cycle-closure.json'),
  cleanup: readJson('release/cycle-0.12.0/environment-cleanup.json'),
  feedback: readJson('release/cycle-0.12.0/feedback-summary.json'),
  scope: readJson('release/cycle-0.12.0/scope.json'),
  migrationPlan: readJson('release/cycle-0.12.0/migration-plan.json'),
});
const proposal = {
  schemaVersion: '1.0', product: 'BemMeCuida', generatedBy: 'Tehkné Solutions', generatedAt: new Date().toISOString(),
  proposalType: 'cycle012-human-activation', sourceCommit, cycleVersion: '0.12.0',
  status: decision.recommendation === 'ready-for-human-activation' ? 'ready-for-human-activation' : 'blocked',
  recommendation: decision.recommendation, blockers: decision.blockers, evidenceUrl,
  controls: { humanMergeRequired: true, doesNotActivateAutomatically: true, doesNotCreateMigrationAutomatically: true },
  privacy: { containsPersonalData: false, containsClinicalData: false, containsRawFeedback: false, containsSecrets: false },
};
mkdirSync(dirname(output), { recursive: true });
writeFileSync(output, `${JSON.stringify(proposal, null, 2)}\n`, 'utf8');
console.log(`Proposta do ciclo 0.12.0 gerada em ${output}.`);
console.log(`Status: ${proposal.status}.`);
console.log('Tehkné Solutions');
