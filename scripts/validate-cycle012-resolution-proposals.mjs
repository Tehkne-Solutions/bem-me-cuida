import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { validateResolutionProposals, renderProposalValidationMarkdown } from './lib/cycle012-proposal-validation.mjs';

const root = process.cwd();
const arg = (name, fallback = '') => {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] : fallback;
};
const readJson = (path) => JSON.parse(readFileSync(join(root, path), 'utf8'));
const readDir = (path) => {
  const dir = join(root, path);
  return existsSync(dir) ? readdirSync(dir).filter((name) => name.endsWith('.json')).sort().map((name) => readJson(`${path}/${name}`)) : [];
};
const reconciliationPath = arg('reconciliation', 'artifacts/cycle012-queue-reconciliation.json');
const jsonOutput = arg('json-output', 'artifacts/cycle012-proposal-validation.json');
const markdownOutput = arg('markdown-output', 'artifacts/cycle012-proposal-validation.md');
const generatedAt = arg('generated-at', new Date().toISOString());
const reconciliation = readJson(reconciliationPath);
const proposals = readDir('release/cycle-0.12.0/resolution-proposals');
const resolutionPolicy = readJson('release/cycle-0.12.0/resolution-proposal-policy.json');
const validationPolicy = readJson('release/cycle-0.12.0/proposal-validation-policy.json');
const report = validateResolutionProposals({ reconciliation, proposals, resolutionPolicy, validationPolicy, generatedAt });
mkdirSync(dirname(join(root, jsonOutput)), { recursive: true });
mkdirSync(dirname(join(root, markdownOutput)), { recursive: true });
writeFileSync(join(root, jsonOutput), `${JSON.stringify(report, null, 2)}\n`, 'utf8');
writeFileSync(join(root, markdownOutput), renderProposalValidationMarkdown(report), 'utf8');
console.log(`validation=${jsonOutput}`);
console.log(`summary=${markdownOutput}`);
console.log(`proposals=${report.summary.proposalCount}`);
console.log('Validação gerada em modo somente leitura.');
console.log('Tehkné Solutions');
