const failures = [];
const notices = [];
const text = (name) => String(process.env[name] ?? '').trim();
const number = (name) => Number(process.env[name] ?? Number.NaN);
const boolean = (name) => text(name).toLowerCase() === 'true';
const fail = (message) => failures.push(message);
const ok = (message) => notices.push(message);

if (text('CYCLE_VERSION') !== '0.11.0') fail('CYCLE_VERSION deve ser 0.11.0.');
if (text('CYCLE_RC_VERSION') !== '0.11.0-rc.1') fail('CYCLE_RC_VERSION deve ser 0.11.0-rc.1.');
if (!['active', 'frozen'].includes(text('CYCLE_STATUS'))) fail('CYCLE_STATUS deve ser active ou frozen para preparar a RC.');
if (!boolean('CYCLE_FREEZE_READY')) fail('CYCLE_FREEZE_READY precisa estar true.');
if (!boolean('CYCLE_RC_MILESTONE_DONE')) fail('O marco de RC precisa estar concluído.');

for (const name of [
  'CYCLE_BLOCKER_COUNT', 'CYCLE_BACKLOG_BLOCKED', 'CYCLE_SCOPE_CHANGES_PENDING', 'CYCLE_EXPERIMENTS_RUNNING',
  'CYCLE_REQUIRED_GATES', 'CYCLE_PASSED_GATES',
]) {
  if (!Number.isFinite(number(name)) || number(name) < 0) fail(`${name} deve ser um número não negativo.`);
}

if (number('CYCLE_BLOCKER_COUNT') !== 0) fail('A RC não pode ser preparada com bloqueadores.');
if (number('CYCLE_BACKLOG_BLOCKED') !== 0) fail('A RC não pode conter backlog bloqueado.');
if (number('CYCLE_SCOPE_CHANGES_PENDING') !== 0) fail('Mudanças de escopo precisam ser decididas antes da RC.');
if (number('CYCLE_EXPERIMENTS_RUNNING') !== 0) fail('Experimentos precisam estar pausados, concluídos ou cancelados antes da RC.');
if (number('CYCLE_REQUIRED_GATES') <= 0) fail('Ao menos um gate obrigatório deve existir.');
if (number('CYCLE_REQUIRED_GATES') !== number('CYCLE_PASSED_GATES')) fail('Todos os gates obrigatórios precisam estar aprovados.');

if (!text('CYCLE_EVIDENCE_URL').startsWith('https://')) fail('CYCLE_EVIDENCE_URL deve usar HTTPS.');
if (!/^[a-f0-9]{40}$/i.test(text('CYCLE_SOURCE_COMMIT'))) fail('CYCLE_SOURCE_COMMIT deve ser um SHA Git de 40 caracteres.');

if (failures.length) {
  console.error('RC 0.11.0 reprovada:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

ok('Versão e identificação da RC conferidas.');
ok('Backlog, escopo, experimentos e gates sem bloqueadores.');
ok('Marco de RC e evidência técnica presentes.');
console.log('RC 0.11.0 pronta para o fluxo externo de build:');
for (const notice of notices) console.log(`- ${notice}`);
console.log('- Tehkné Solutions');
