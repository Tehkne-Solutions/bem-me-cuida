import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { evaluateCycle012 } from './lib/cycle012-bootstrap.mjs';

const root = process.cwd();
const readJson = (path) => JSON.parse(readFileSync(join(root, path), 'utf8'));
const outputBase = process.env.CYCLE012_OUTPUT_BASE ?? 'artifacts/bemmecuida-0.12.0-bootstrap';
const sourceClosure = readJson('release/rc-0.11.0/cycle-closure.json');
const cleanup = readJson('release/cycle-0.12.0/environment-cleanup.json');
const feedback = readJson('release/cycle-0.12.0/feedback-summary.json');
const scope = readJson('release/cycle-0.12.0/scope.json');
const migrationPlan = readJson('release/cycle-0.12.0/migration-plan.json');
const readiness = readJson('release/cycle-0.12.0/cycle-readiness.json');
const decision = evaluateCycle012({ sourceClosure, cleanup, feedback, scope, migrationPlan });
const packageData = {
  schemaVersion: '1.0', product: 'BemMeCuida', generatedBy: 'Tehkné Solutions', generatedAt: new Date().toISOString(),
  sourceRelease: '0.11.0', targetCycle: '0.12.0', status: readiness.status, recommendation: decision.recommendation,
  summary: {
    sourceCycle: sourceClosure.status,
    environmentCleanup: cleanup.status,
    feedback: feedback.status,
    scope: scope.approval.status,
    migrationPlan: migrationPlan.approval.status,
    backlogItems: scope.items.length,
    feedbackThemes: feedback.themes.length,
  },
  blockers: decision.blockers,
  controls: decision.controls,
  privacy: { containsPersonalData: false, containsClinicalData: false, containsRawFeedback: false, containsSecrets: false },
};
const lines = [
  '# Bootstrap do ciclo BemMeCuida 0.12.0', '', `**Recomendação:** \`${packageData.recommendation}\``, '',
  '| Controle | Estado |', '|---|---|',
  `| Encerramento 0.11.0 | \`${packageData.summary.sourceCycle}\` |`,
  `| Limpeza de environments | \`${packageData.summary.environmentCleanup}\` |`,
  `| Feedback agregado | \`${packageData.summary.feedback}\` |`,
  `| Escopo | \`${packageData.summary.scope}\` |`,
  `| Plano de migrations | \`${packageData.summary.migrationPlan}\` |`, '',
  '## Bloqueadores', '', ...(packageData.blockers.length ? packageData.blockers.map((item) => `- ${item}`) : ['- Nenhum bloqueador estrutural encontrado.']), '',
  '> O pacote não ativa o ciclo, não cria migrations e não remove environments.', '', '**Tehkné Solutions**', '',
];
mkdirSync(dirname(join(root, `${outputBase}.json`)), { recursive: true });
writeFileSync(join(root, `${outputBase}.json`), `${JSON.stringify(packageData, null, 2)}\n`, 'utf8');
writeFileSync(join(root, `${outputBase}.md`), lines.join('\n'), 'utf8');
console.log(`Pacote do ciclo 0.12.0 gerado em ${outputBase}.{json,md}.`);
console.log(`Recomendação: ${packageData.recommendation}.`);
console.log('Tehkné Solutions');
