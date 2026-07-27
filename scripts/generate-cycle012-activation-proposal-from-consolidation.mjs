import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { assertEvidenceUrl, assertSourceCommit } from './lib/cycle012-bootstrap.mjs';

const root = process.cwd();
const arg = (name, fallback = '') => {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] : fallback;
};
const readJson = (path) => JSON.parse(readFileSync(join(root, path), 'utf8'));

const sourceCommit = assertSourceCommit(arg('source-commit'));
const consolidationPath = arg('consolidation');
const evidenceUrl = assertEvidenceUrl(arg('evidence-url'));
const output = arg('output');
if (!consolidationPath) throw new Error('--consolidation é obrigatório.');
if (!output) throw new Error('--output é obrigatório.');

const consolidation = readJson(consolidationPath);
if (consolidation.artifactType !== 'cycle012-review-consolidation') throw new Error('Artefato de consolidação inválido.');
if (consolidation.sourceCommit !== sourceCommit) throw new Error('sourceCommit diverge da consolidação.');

const ready = consolidation.status === 'ready-for-human-activation-proposal' && consolidation.recommendation === 'prepare-human-activation-proposal';
const blockers = [
  ...consolidation.reviews.missingTracks.map((track) => `review:${track}`),
  ...consolidation.reviews.changesRequiredTracks.map((track) => `changes-required:${track}`),
  ...consolidation.external.blockers.map((gate) => `external:${gate}`),
];
if (!consolidation.reviews.reviewGates.minimumDistinctReviewersPass) blockers.push('review:minimum-distinct-reviewers');
if (!consolidation.reviews.reviewGates.securityPrivacySeparationPass) blockers.push('review:security-privacy-separation');

const proposal = {
  schemaVersion: '1.0',
  product: 'BemMeCuida',
  generatedBy: 'Tehkné Solutions',
  cycleVersion: '0.12.0',
  proposalType: 'cycle012-human-activation-from-consolidation',
  generatedAt: new Date().toISOString(),
  sourceCommit,
  consolidationPath,
  evidenceUrl,
  status: ready ? 'ready-for-human-review' : 'blocked',
  recommendation: ready ? 'human-review-required' : 'hold',
  blockers: [...new Set(blockers)].sort(),
  activationAllowed: false,
  controls: {
    humanMergeRequired: true,
    independentApprovalRequired: true,
    doesNotActivateAutomatically: true,
    doesNotCreateMigrationAutomatically: true,
    doesNotAuthorizeImplementationAutomatically: true,
  },
  privacy: {
    containsPersonalData: false,
    containsClinicalData: false,
    containsRawFeedback: false,
    containsJournalContent: false,
    containsSecrets: false,
    containsRawIdentity: false,
  },
};

mkdirSync(dirname(join(root, output)), { recursive: true });
writeFileSync(join(root, output), `${JSON.stringify(proposal, null, 2)}\n`, 'utf8');
console.log(`proposal_path=${output}`);
console.log(`status=${proposal.status}`);
console.log(`recommendation=${proposal.recommendation}`);
console.log('A proposta exige revisão e merge humanos e não ativa o ciclo.');
console.log('Tehkné Solutions');
