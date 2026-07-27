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

const infrastructureRows = Object.entries(infrastructure.scopes).map(([key, scope]) => ({ key, label: scope.environment ?? (key === 'services' ? 'EAS, Supabase e callbacks' : key), status: scope.status, evidence: scope.evidenceUrl }));
const buildRows = Object.entries(builds.platforms).map(([platform, build]) => ({ platform, status: build.status, buildId: build.buildId, buildNumber: build.buildNumber, evidence: build.evidenceUrl }));
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

const blockers = [];
for (const scope of infrastructureRows) if (scope.status !== 'ready') blockers.push(`Infraestrutura ${scope.label}: ${scope.status}`);
for (const build of buildRows) if (!['captured', 'passed', 'ready'].includes(build.status)) blockers.push(`Build ${build.platform}: ${build.status}`);
if (ota.publish.status !== 'passed') blockers.push(`OTA de validação: ${ota.publish.status}`);
if (ota.rollback.status !== 'passed') blockers.push(`Rollback OTA: ${ota.rollback.status}`);
if (otaDevices.actions?.publish?.status !== 'passed') blockers.push(`OTA físico — publicação: ${otaDevices.actions?.publish?.status ?? 'pending'}`);
if (otaDevices.actions?.rollback?.status !== 'passed') blockers.push(`OTA físico — rollback: ${otaDevices.actions?.rollback?.status ?? 'pending'}`);
for (const profile of requiredDevices) if (profile.status !== 'passed') blockers.push(`Aparelho obrigatório ${profile.id}: ${profile.status}`);
for (const suite of tests.suites.filter((item) => item.required)) if (suite.status !== 'passed') blockers.push(`Suíte obrigatória ${suite.id}: ${suite.status}`);
const recommendation = blockers.length === 0 ? 'ready-for-promotion-review' : 'hold';
const statusIcon = (status) => (['ready', 'captured', 'passed'].includes(status) ? '✅' : status === 'blocked' || status === 'failed' || status === 'retest-required' ? '⛔' : '⏳');
const evidenceText = (url) => (url ? `[evidência](${url})` : 'sem evidência');

const lines = [
  '## Status factual — BemMeCuida 0.11.0-rc.1', '', `**Recomendação automática:** \`${recommendation}\``, '',
  '### Infraestrutura externa', '', '| Escopo | Estado | Evidência |', '|---|---|---|',
  ...infrastructureRows.map((row) => `| ${row.label} | ${statusIcon(row.status)} \`${row.status}\` | ${evidenceText(row.evidence)} |`), '',
  '### Builds', '', '| Plataforma | Estado | Build | Evidência |', '|---|---|---|---|',
  ...buildRows.map((row) => `| ${row.platform} | ${statusIcon(row.status)} \`${row.status}\` | ${row.buildId ? `\`${row.buildId}\`` : 'não capturado'} | ${evidenceText(row.evidence)} |`), '',
  '### Cobertura por plataforma', '', '| Plataforma | Aparelhos | Suítes |', '|---|---:|---:|',
  ...['android', 'ios'].map((platform) => `| ${platform} | ${platformDeviceCounts[platform].passed}/${platformDeviceCounts[platform].total} | ${platformSuiteCounts[platform].passed}/${platformSuiteCounts[platform].total} |`), '',
  '### OTA', '', `- Publicação registrada: ${statusIcon(ota.publish.status)} \`${ota.publish.status}\``, `- Rollback registrado: ${statusIcon(ota.rollback.status)} \`${ota.rollback.status}\``, `- Validação física agregada: ${statusIcon(otaDevices.status)} \`${otaDevices.status}\``, `- Runtime: \`${ota.runtimeVersion}\``, `- Canal: \`${ota.channel}\``, '',
  '| Plataforma | Publicação física | Rollback físico |', '|---|---|---|',
  ...otaRows.map((row) => `| ${row.platform} | ${statusIcon(row.publish)} \`${row.publish}\` | ${statusIcon(row.rollback)} \`${row.rollback}\` |`), '',
  '### Matriz física obrigatória', '', `- Total: **${requiredDevices.length}**`, `- Aprovados: **${deviceCounts.passed ?? 0}**`, `- Pendentes: **${deviceCounts.pending ?? 0}**`, `- Bloqueados/falhos: **${(deviceCounts.blocked ?? 0) + (deviceCounts.failed ?? 0)}**`, '',
  '### Bloqueadores atuais', '', ...(blockers.length ? blockers.map((item) => `- ${item}`) : ['- Nenhum bloqueador encontrado nos registros versionados.']), '',
  '> Este resumo usa somente arquivos versionados da RC. Não consulta ou revela valores de secrets.', '', '**Tehkné Solutions**', '',
];
mkdirSync(dirname(join(root, outputPath)), { recursive: true });
writeFileSync(join(root, outputPath), lines.join('\n'), 'utf8');
console.log(`Status da RC 0.11 gerado em ${outputPath}.`);
console.log(`Recomendação: ${recommendation}.`);
console.log('Tehkné Solutions');
