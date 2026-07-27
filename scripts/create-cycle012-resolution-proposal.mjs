import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { buildResolutionProposal, renderResolutionProposalMarkdown } from './lib/cycle012-resolution-proposal.mjs';

const root = process.cwd();
const arg = (name, fallback = '') => {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] : fallback;
};
const readJson = (path) => JSON.parse(readFileSync(join(root, path), 'utf8'));

const reportPath = arg('report', 'artifacts/cycle012-queue-reconciliation.json');
const recordId = arg('record-id');
const requestedAction = arg('requested-action');
const actorId = arg('actor-id');
const submittedAt = arg('submitted-at', new Date().toISOString());

if (!existsSync(join(root, reportPath))) throw new Error(`Relatório de reconciliação ausente: ${reportPath}.`);
const report = readJson(reportPath);
const reconciliationPolicy = readJson('release/cycle-0.12.0/queue-reconciliation-policy.json');
const proposalPolicy = readJson('release/cycle-0.12.0/resolution-proposal-policy.json');
const proposal = buildResolutionProposal({
  report,
  reconciliationPolicy,
  proposalPolicy,
  recordId,
  requestedAction,
  actorId,
  submittedAt,
});

const directory = proposalPolicy.proposal.directory;
const absoluteDirectory = join(root, directory);
if (existsSync(absoluteDirectory)) {
  for (const name of readdirSync(absoluteDirectory).filter((candidate) => candidate.endsWith('.json'))) {
    const existing = readJson(`${directory}/${name}`);
    if (
      existing.reconciliation?.recordId === proposal.reconciliation.recordId &&
      existing.requestedAction === proposal.requestedAction &&
      existing.sourceCommit === proposal.sourceCommit
    ) {
      throw new Error(`Proposta duplicada para ${proposal.reconciliation.recordId} e ${proposal.requestedAction}.`);
    }
  }
}

const proposalPath = `${directory}/${proposal.proposalId}.json`;
const markdownPath = `artifacts/${proposal.proposalId}.md`;
mkdirSync(dirname(join(root, proposalPath)), { recursive: true });
mkdirSync(dirname(join(root, markdownPath)), { recursive: true });
writeFileSync(join(root, proposalPath), `${JSON.stringify(proposal, null, 2)}\n`, 'utf8');
writeFileSync(join(root, markdownPath), renderResolutionProposalMarkdown(proposal), 'utf8');
console.log(`proposal_id=${proposal.proposalId}`);
console.log(`proposal_path=${proposalPath}`);
console.log(`markdown_path=${markdownPath}`);
console.log('Proposta criada sem alterar a fonte de verdade.');
console.log('Tehkné Solutions');
