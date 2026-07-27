import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { createPostReleaseDecision } from './lib/rc011-post-release-observability.mjs';

const readJson = (path) => JSON.parse(readFileSync(resolve(path), 'utf8'));
const window = process.env.RC011_POST_RELEASE_WINDOW ?? 'current';
const payload = createPostReleaseDecision({
  publication: readJson(process.env.RC011_RELEASE_PUBLICATION_PATH ?? 'release/rc-0.11.0/release-publication.json'),
  rollout: readJson(process.env.RC011_ROLLOUT_PATH ?? 'release/rc-0.11.0/production-rollout.json'),
  health: readJson(process.env.RC011_POST_RELEASE_HEALTH_PATH ?? 'release/rc-0.11.0/post-release-health.json'),
  incidents: readJson(process.env.RC011_POST_RELEASE_INCIDENTS_PATH ?? 'release/rc-0.11.0/post-release-incidents.json'),
  closure: readJson(process.env.RC011_CYCLE_CLOSURE_PATH ?? 'release/rc-0.11.0/cycle-closure.json'),
  backlog: readJson(process.env.RC011_NEXT_BACKLOG_PATH ?? 'release/rc-0.11.0/next-cycle-backlog.json'),
  window,
});
const suffix = window === 'current' ? 'current' : window;
const jsonOutput = resolve(process.env.RC011_POST_RELEASE_REPORT_OUTPUT ?? `artifacts/bemmecuida-0.11.0-post-release-${suffix}.json`);
const markdownOutput = resolve(process.env.RC011_POST_RELEASE_REPORT_MARKDOWN_OUTPUT ?? `artifacts/bemmecuida-0.11.0-post-release-${suffix}.md`);
mkdirSync(dirname(jsonOutput), { recursive: true });
mkdirSync(dirname(markdownOutput), { recursive: true });
writeFileSync(jsonOutput, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
const markdown = [
  `# BemMeCuida 0.11.0 — pós-publicação ${suffix}`, '',
  `- Recomendação: **${payload.recommendation}**`,
  `- Bloqueadores: ${payload.blockerCount}`,
  `- Release publicada: ${payload.summary.releasePublished ? 'sim' : 'não'}`,
  `- Rollout concluído: ${payload.summary.rolloutCompleted ? 'sim' : 'não'}`,
  `- Checkpoints aprovados: ${payload.summary.checkpointsPassed}/${payload.summary.checkpointsRequired}`,
  `- SEV1 abertos: ${payload.summary.openSev1}`,
  `- SEV2 abertos: ${payload.summary.openSev2}`, '',
  '## Bloqueadores', '', ...(payload.blockers.length ? payload.blockers.map((item) => `- ${item}`) : ['- Nenhum bloqueador registrado.']), '',
  '> Este relatório usa métricas agregadas e não executa pausa, rollback ou encerramento do ciclo.', '',
  '**Tehkné Solutions**', '',
].join('\n');
writeFileSync(markdownOutput, markdown, 'utf8');
console.log(`Relatório pós-release salvo em ${jsonOutput} e ${markdownOutput}.`);
console.log(`Recomendação: ${payload.recommendation}.`);
console.log('Tehkné Solutions');
