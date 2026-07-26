import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const mode = process.argv[2] ?? 'structure';
if (!['structure', 'external'].includes(mode)) throw new Error('Use structure ou external.');
const path = resolve(process.env.RC011_INFRASTRUCTURE_PATH ?? 'release/rc-0.11.0/infrastructure-readiness.json');
if (!existsSync(path)) throw new Error(`Registro de infraestrutura ausente: ${path}`);
const value = JSON.parse(readFileSync(path, 'utf8'));
const failures = [];
const notices = [];
const fail = (message) => failures.push(message);
const ok = (message) => notices.push(message);

if (value.release !== '0.11.0-rc.1') fail('Registro precisa referenciar 0.11.0-rc.1.');
if (value.generatedBy !== 'Tehkné Solutions') fail('Registro sem assinatura Tehkné Solutions.');
if (
  value.privacy?.containsPersonalData !== false
  || value.privacy?.containsClinicalData !== false
  || value.privacy?.containsSecrets !== false
) fail('Declaração de privacidade da infraestrutura está incompleta.');

const scopes = value.scopes ?? {};
for (const key of ['buildEnvironment', 'homologationEnvironment', 'services']) {
  const scope = scopes[key];
  if (!scope?.required) fail(`Escopo obrigatório ausente: ${key}.`);
  if (!['pending', 'ready', 'blocked'].includes(scope?.status)) fail(`Status inválido em ${key}.`);
  if (scope?.status !== 'pending') {
    if (!scope.evidenceUrl?.startsWith('https://')) fail(`${key} sem evidência HTTPS.`);
    if (!/^[a-f0-9]{40}$/i.test(scope.sourceCommit ?? '')) fail(`${key} sem commit de origem válido.`);
    if (!Array.isArray(scope.checks) || scope.checks.length === 0) fail(`${key} sem verificações registradas.`);
  }
  if (scope?.status === 'ready' && scope.checks.some((item) => item.passed !== true)) {
    fail(`${key} está ready, mas contém verificação reprovada.`);
  }
}

const expectedCallbacks = scopes.services?.expectedCallbacks ?? [];
for (const callback of ['bemmecuida-rc011://auth/callback', 'bemmecuida-rc011://reset-password']) {
  if (!expectedCallbacks.includes(callback)) fail(`Callback esperado ausente: ${callback}.`);
}

if (mode === 'external') {
  const notReady = Object.entries(scopes).filter(([, scope]) => scope.required && scope.status !== 'ready');
  if (notReady.length) fail(`Infraestrutura externa possui ${notReady.length} escopo(s) não aprovado(s).`);
  const commits = new Set(Object.values(scopes).map((scope) => scope.sourceCommit).filter(Boolean));
  if (commits.size !== 1) fail('As capturas externas precisam apontar para o mesmo commit de origem.');
}

if (failures.length) {
  console.error(`Infraestrutura RC 0.11 ${mode} reprovada:`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
ok('Estrutura, assinatura e privacidade conferidas.');
if (mode === 'external') ok('Environments, serviços e callbacks possuem evidências aprovadas.');
console.log(`Infraestrutura RC 0.11 ${mode} aprovada:`);
for (const notice of notices) console.log(`- ${notice}`);
console.log('- Tehkné Solutions');
