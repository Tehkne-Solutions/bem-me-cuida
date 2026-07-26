import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const source = resolve(process.env.RC011_INFRASTRUCTURE_PATH ?? 'release/rc-0.11.0/infrastructure-readiness.json');
const value = JSON.parse(readFileSync(source, 'utf8'));
const scopes = value.scopes ?? {};
const blockers = [];
for (const [key, scope] of Object.entries(scopes)) {
  if (scope.required && scope.status !== 'ready') blockers.push(`${key}_${scope.status ?? 'missing'}`);
  if (scope.status === 'ready' && !scope.evidenceUrl?.startsWith('https://')) blockers.push(`${key}_evidence_missing`);
  for (const check of scope.checks ?? []) {
    if (check.passed !== true) blockers.push(`${key}_${check.key}_failed`);
  }
}
const commits = new Set(Object.values(scopes).map((scope) => scope.sourceCommit).filter(Boolean));
if (blockers.length === 0 && commits.size !== 1) blockers.push('source_commit_inconsistent');

const payload = {
  schemaVersion: '1.0',
  product: 'BemMeCuida',
  release: '0.11.0-rc.1',
  generatedBy: 'Tehkné Solutions',
  generatedAt: new Date().toISOString(),
  privacy: { containsPersonalData: false, containsClinicalData: false, containsSecrets: false },
  recommendation: blockers.length === 0 ? 'ready' : 'hold',
  blockerCount: blockers.length,
  blockers,
  scopes: Object.fromEntries(Object.entries(scopes).map(([key, scope]) => [key, {
    status: scope.status,
    evidenceUrl: scope.evidenceUrl ?? null,
    passedChecks: (scope.checks ?? []).filter((item) => item.passed === true).length,
    totalChecks: (scope.checks ?? []).length,
  }])),
  controls: {
    doesNotExposeSecrets: true,
    doesNotCreateEnvironments: true,
    doesNotMutateReleaseState: true,
    requiresHumanReview: true,
  },
};

const jsonOutput = resolve(process.env.RC011_INFRASTRUCTURE_REPORT_OUTPUT ?? 'artifacts/bemmecuida-0.11.0-rc.1-infrastructure.json');
const markdownOutput = resolve(process.env.RC011_INFRASTRUCTURE_REPORT_MARKDOWN_OUTPUT ?? 'artifacts/bemmecuida-0.11.0-rc.1-infrastructure.md');
mkdirSync(dirname(jsonOutput), { recursive: true });
mkdirSync(dirname(markdownOutput), { recursive: true });
writeFileSync(jsonOutput, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
const lines = [
  '# BemMeCuida 0.11.0-rc.1 — infraestrutura externa',
  '',
  `- Recomendação: **${payload.recommendation === 'ready' ? 'PRONTA' : 'MANTER BLOQUEADA'}**`,
  `- Bloqueadores: ${payload.blockerCount}`,
  '',
  '## Escopos',
  '',
  ...Object.entries(payload.scopes).map(([key, scope]) => `- ${key}: ${scope.status} (${scope.passedChecks}/${scope.totalChecks} verificações)`),
  '',
  '## Bloqueadores',
  '',
  ...(blockers.length ? blockers.map((item) => `- ${item}`) : ['- Nenhum.']),
  '',
  '> Relatório técnico sem dados pessoais, clínicos ou secrets.',
  '',
  '**Tehkné Solutions**',
  '',
];
writeFileSync(markdownOutput, lines.join('\n'), 'utf8');
console.log(`Relatório de infraestrutura salvo em ${jsonOutput} e ${markdownOutput}.`);
console.log(`Recomendação: ${payload.recommendation}.`);
console.log('Tehkné Solutions');
