import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import {
  buildTransitionReport,
  validateCaptureRunId,
  validateEvidencePr,
  validateRevocation,
  validateSourceCommit,
} from './lib/rc011-release-transition.mjs';

const argValue = (name, fallback = '') => {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] ?? fallback : fallback;
};

const mode = argValue('--mode');
const captureRunId = argValue('--capture-run-id');
const sourceCommit = argValue('--source-commit');
const evidencePrPath = argValue('--evidence-pr-json');
const revocationPath = argValue('--revocation-json');
const buildAuthorized = argValue('--build-authorized', 'false') === 'true';
const outputJson = argValue('--output-json', 'artifacts/bemmecuida-0.11.0-rc.1-release-transition.json');
const outputMd = argValue('--output-md', 'artifacts/bemmecuida-0.11.0-rc.1-release-transition.md');

const evidencePr = evidencePrPath
  ? validateEvidencePr(readFileSync(evidencePrPath, 'utf8'))
  : null;
const revocation = revocationPath
  ? validateRevocation(readFileSync(revocationPath, 'utf8'))
  : null;

const report = buildTransitionReport({
  mode,
  captureRunId: captureRunId ? validateCaptureRunId(captureRunId) : null,
  sourceCommit: sourceCommit ? validateSourceCommit(sourceCommit) : null,
  evidencePr,
  revocation,
  buildAuthorized,
});

mkdirSync(dirname(outputJson), { recursive: true });
mkdirSync(dirname(outputMd), { recursive: true });
writeFileSync(outputJson, `${JSON.stringify(report, null, 2)}\n`, 'utf8');

const lines = [
  '# Transição da release — BemMeCuida 0.11.0-rc.1',
  '',
  `- Modo: **${report.mode}**`,
  `- Recomendação: **${report.recommendation}**`,
  `- Run da captura: \`${report.captureRunId ?? 'não aplicável'}\``,
  `- Commit de origem: \`${report.sourceCommit ?? 'não aplicável'}\``,
  '',
  '## Evidência',
  '',
  report.evidencePr
    ? `- PR #${report.evidencePr.number}: ${report.evidencePr.url}`
    : '- PR de evidências ainda não mesclado.',
  report.evidencePr
    ? `- Merge commit aprovado: \`${report.evidencePr.mergeCommit}\``
    : '- Merge commit ainda não disponível.',
  '',
  '## Secrets temporários',
  '',
  report.revocation?.confirmedAbsent
    ? `- Ausência confirmada: ${report.revocation.secretNames.map((name) => `\`${name}\``).join(', ')}.`
    : '- Revogação será exigida somente após o merge humano do PR de evidências.',
  '',
  '## Build Android',
  '',
  `- Validação autorizada: **${report.build.validationAuthorized ? 'sim' : 'não'}**`,
  `- Solicitação Android autorizada: **${report.build.androidAuthorized ? 'sim' : 'não'}**`,
  '',
  '## Privacidade',
  '',
  '- Nenhum valor de secret foi registrado.',
  '- Nenhum valor de variable foi registrado.',
  '- Nenhum dado pessoal ou clínico foi processado.',
  '',
  '**Tehkné Solutions**',
  '',
];
writeFileSync(outputMd, lines.join('\n'), 'utf8');

console.log(`Relatório da transição RC 0.11 gerado: ${report.recommendation}.`);
console.log('Tehkné Solutions');
