import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

const root = process.cwd();
const outputIndex = process.argv.indexOf('--output');
const outputPath = outputIndex >= 0 ? process.argv[outputIndex + 1] : 'artifacts/rc011-issue-status.md';
const readJson = (path) => JSON.parse(readFileSync(join(root, path), 'utf8'));
const infrastructure = readJson('release/rc-0.11.0/infrastructure-readiness.json');
const builds = readJson('release/rc-0.11.0/builds.json');
const ota = readJson('release/rc-0.11.0/ota-validation.json');
const otaDevices = readJson('release/rc-0.11.0/ota-device-validation.json');
const devices = readJson('release/rc-0.11.0/device-matrix.json');
const tests = readJson('release/rc-0.11.0/test-results.json');
const productionEnvironment = readJson('release/rc-0.11.0/production-environment.json');
const attestations = readJson('release/rc-0.11.0/final-attestations.json');
const productionArtifacts = readJson('release/rc-0.11.0/production-artifacts.json');
const store = readJson('release/rc-0.11.0/store-submission-readiness.json');
const rollout = readJson('release/rc-0.11.0/production-rollout.json');
const publication = readJson('release/rc-0.11.0/release-publication.json');

const infrastructureRows = Object.entries(infrastructure.scopes).map(([key, scope]) => ({ key, label: scope.environment ?? (key === 'services' ? 'EAS, Supabase e callbacks' : key), status: scope.status, evidence: scope.evidenceUrl }));
const buildRows = Object.entries(builds.platforms).map(([platform, build]) => ({ platform, status: build.status, buildId: build.buildId, buildNumber: build.buildNumber, evidence: build.evidenceUrl }));
const productionBuildRows = Object.entries(productionArtifacts.platforms).map(([platform, build]) => ({ platform, status: build.status, buildId: build.buildId, buildNumber: build.buildNumber, evidence: build.evidenceUrl }));
const requiredDevices = devices.profiles.filter((profile) => profile.required);
const deviceCounts = requiredDevices.reduce((acc, profile) => { acc[profile.status] = (acc[profile.status] ?? 0) + 1; return acc; }, {});
const platformDeviceCounts = Object.fromEntries(['android', 'ios'].map((platform) => {
  const rows = requiredDevices.filter((item) => item.platform === platform);
  return [platform, { total: rows.length, passed: rows.filter((item) => item.status === 'passed').length }];
}));
const platformSuiteCounts = Object.fromEntries(['android', 'ios'].map((platform) => {
  const rows = tests.suites.filter((item) => (item.requiredPlatforms ?? ['android', 'ios']).includes(platform));
  return [platform, { total: rows.length, passed: rows.filter((item) => item.platformResults?.[platform]?.status === 'passed').length }];
}));
const otaRows = ['android', 'ios'].map((platform) => ({
  platform,
  publish: otaDevices.actions?.publish?.platforms?.[platform]?.status ?? 'pending',
  rollback: otaDevices.actions?.rollback?.platforms?.[platform]?.status ?? 'pending',
}));
const attestationRows = Object.entries(attestations.attestations ?? {}).map(([role, item]) => ({ role, status: item.status, evidence: item.evidenceUrl }));

const blockers = [];
for (const scope of infrastructureRows) if (scope.status !== 'ready') blockers.push(`Infraestrutura ${scope.label}: ${scope.status}`);
for (const build of buildRows) if (!['captured', 'passed', 'ready'].includes(build.status)) blockers.push(`Build RC ${build.platform}: ${build.status}`);
if (ota.publish.status !== 'passed') blockers.push(`OTA de validação: ${ota.publish.status}`);
if (ota.rollback.status !== 'passed') blockers.push(`Rollback OTA: ${ota.rollback.status}`);
if (otaDevices.actions?.publish?.status !== 'passed') blockers.push(`OTA físico — publicação: ${otaDevices.actions?.publish?.status ?? 'pending'}`);
if (otaDevices.actions?.rollback?.status !== 'passed') blockers.push(`OTA físico — rollback: ${otaDevices.actions?.rollback?.status ?? 'pending'}`);
for (const profile of requiredDevices) if (profile.status !== 'passed') blockers.push(`Aparelho obrigatório ${profile.id}: ${profile.status}`);
for (const suite of tests.suites.filter((item) => item.required)) if (suite.status !== 'passed') blockers.push(`Suíte obrigatória ${suite.id}: ${suite.status}`);
if (productionEnvironment.status !== 'ready') blockers.push(`Environment de produção: ${productionEnvironment.status}`);
if (attestations.status !== 'approved') blockers.push(`Atestações finais: ${attestations.status}`);
if (publication.githubRelease?.status !== 'published') blockers.push(`GitHub Release: ${publication.githubRelease?.status ?? 'pending'}`);
for (const build of productionBuildRows) if (build.status !== 'captured') blockers.push(`Build oficial ${build.platform}: ${build.status}`);
for (const [platform, item] of Object.entries(store.platforms ?? {})) if (item.status !== 'approved') blockers.push(`Loja ${platform}: ${item.status}`);
if (rollout.status !== 'completed') blockers.push(`Rollout de produção: ${rollout.status}`);
const recommendation = blockers.length === 0 ? 'released' : 'hold';
const statusIcon = (status) => (['ready', 'captured', 'passed', 'approved', 'completed', 'published'].includes(status) ? '✅' : status === 'blocked' || status === 'failed' || status === 'rejected' || status === 'retest-required' || status === 'pause-required' ? '⛔' : '⏳');
const evidenceText = (url) => (url ? `[evidência](${url})` : 'sem evidência');

const lines = [
  '## Status factual — BemMeCuida 0.11.0', '', `**Recomendação automática:** \`${recommendation}\``, '',
  '### Infraestrutura da candidata', '', '| Escopo | Estado | Evidência |', '|---|---|---|',
  ...infrastructureRows.map((row) => `| ${row.label} | ${statusIcon(row.status)} \`${row.status}\` | ${evidenceText(row.evidence)} |`), '',
  '### Builds da candidata', '', '| Plataforma | Estado | Build | Evidência |', '|---|---|---|---|',
  ...buildRows.map((row) => `| ${row.platform} | ${statusIcon(row.status)} \`${row.status}\` | ${row.buildId ? `\`${row.buildId}\`` : 'não capturado'} | ${evidenceText(row.evidence)} |`), '',
  '### Cobertura por plataforma', '', '| Plataforma | Aparelhos | Suítes |', '|---|---:|---:|',
  ...['android', 'ios'].map((platform) => `| ${platform} | ${platformDeviceCounts[platform].passed}/${platformDeviceCounts[platform].total} | ${platformSuiteCounts[platform].passed}/${platformSuiteCounts[platform].total} |`), '',
  '### OTA', '', `- Publicação registrada: ${statusIcon(ota.publish.status)} \`${ota.publish.status}\``, `- Rollback registrado: ${statusIcon(ota.rollback.status)} \`${ota.rollback.status}\``, `- Validação física agregada: ${statusIcon(otaDevices.status)} \`${otaDevices.status}\``, `- Runtime: \`${ota.runtimeVersion}\``, `- Canal: \`${ota.channel}\``, '',
  '| Plataforma | Publicação física | Rollback físico |', '|---|---|---|',
  ...otaRows.map((row) => `| ${row.platform} | ${statusIcon(row.publish)} \`${row.publish}\` | ${statusIcon(row.rollback)} \`${row.rollback}\` |`), '',
  '### Ativação de produção', '',
  `- Environment \`${productionEnvironment.environment}\`: ${statusIcon(productionEnvironment.status)} \`${productionEnvironment.status}\``,
  `- Release \`${publication.tag}\`: ${statusIcon(publication.githubRelease?.status)} \`${publication.githubRelease?.status ?? 'pending'}\``, '',
  '| Atestação | Estado | Evidência |', '|---|---|---|',
  ...attestationRows.map((row) => `| ${row.role} | ${statusIcon(row.status)} \`${row.status}\` | ${evidenceText(row.evidence)} |`), '',
  '| Build oficial | Estado | Build | Evidência |', '|---|---|---|---|',
  ...productionBuildRows.map((row) => `| ${row.platform} | ${statusIcon(row.status)} \`${row.status}\` | ${row.buildId ? `\`${row.buildId}\`` : 'não capturado'} | ${evidenceText(row.evidence)} |`), '',
  '### Lojas e rollout', '',
  `- Google Play: ${statusIcon(store.platforms.android.status)} \`${store.platforms.android.status}\``,
  `- App Store: ${statusIcon(store.platforms.ios.status)} \`${store.platforms.ios.status}\``,
  `- Rollout: ${statusIcon(rollout.status)} \`${rollout.status}\``,
  `- Estágio atual: ${rollout.currentStage === null ? 'não iniciado' : `${rollout.currentStage}%`}`, '',
  '### Matriz física obrigatória', '', `- Total: **${requiredDevices.length}**`, `- Aprovados: **${deviceCounts.passed ?? 0}**`, `- Pendentes: **${deviceCounts.pending ?? 0}**`, `- Bloqueados/falhos: **${(deviceCounts.blocked ?? 0) + (deviceCounts.failed ?? 0)}**`, '',
  '### Bloqueadores atuais', '', ...(blockers.length ? blockers.map((item) => `- ${item}`) : ['- Nenhum bloqueador encontrado nos registros versionados.']), '',
  '> Este resumo usa somente arquivos versionados. Não consulta ou revela valores de secrets.', '', '**Tehkné Solutions**', '',
];
mkdirSync(dirname(join(root, outputPath)), { recursive: true });
writeFileSync(join(root, outputPath), lines.join('\n'), 'utf8');
console.log(`Status da RC 0.11 gerado em ${outputPath}.`);
console.log(`Recomendação: ${recommendation}.`);
console.log('Tehkné Solutions');
