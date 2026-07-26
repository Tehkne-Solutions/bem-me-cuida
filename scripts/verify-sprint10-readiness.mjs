import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const failures = [];
const notices = [];

function fail(message) {
  failures.push(message);
}

function ok(message) {
  notices.push(message);
}

function read(path) {
  return readFileSync(join(root, path), 'utf8');
}

function readJson(path) {
  return JSON.parse(read(path));
}

const requiredFiles = [
  'docs/SPRINT-10.md',
  'docs/ADR-014-operacao-de-release-com-rbac.md',
  'docs/RELEASE-CANDIDATE-02.md',
  'docs/STORE-READINESS.md',
  'docs/STORE-LISTING-PT-BR.md',
  'docs/DATA-SAFETY-MATRIX.md',
  '.maestro/operator-console.yml',
  'apps/mobile/app/operator-console.tsx',
  'apps/mobile/src/data/release-operations-repository.ts',
  'apps/mobile/src/services/release-promotion-policy.ts',
  'apps/mobile/src/services/release-promotion-policy.test.ts',
  'supabase/migrations/202607250011_release_operations_schema.sql',
  'supabase/migrations/202607250012_release_operations_functions.sql',
  'supabase/tests/release_operations.sql',
  'scripts/generate-release-manifest.mjs',
];

for (const path of requiredFiles) {
  if (!existsSync(join(root, path))) fail(`Arquivo obrigatório do Sprint 10 ausente: ${path}`);
}
if (!failures.length) ok(`${requiredFiles.length} arquivos do Sprint 10 encontrados.`);

const rootPackage = readJson('package.json');
for (const script of ['sprint10:check', 'e2e:operator', 'release:manifest']) {
  if (!rootPackage.scripts?.[script]) fail(`Script obrigatório ausente: ${script}`);
}

const eas = readJson('apps/mobile/eas.json');
const rc = eas?.build?.rc;
if (!rc) fail('Perfil EAS rc ausente.');
else {
  if (rc.env?.EXPO_PUBLIC_RELEASE_CANDIDATE !== '2') fail('Sprint 10 deve preparar EXPO_PUBLIC_RELEASE_CANDIDATE=2.');
  if (rc.channel !== 'rc' || rc.distribution !== 'internal') fail('A RC deve permanecer interna no canal rc.');
  if (rc.env?.APP_VARIANT !== 'rc') fail('A RC deve usar APP_VARIANT=rc.');
}

const schema = read('supabase/migrations/202607250011_release_operations_schema.sql');
for (const marker of [
  'is_release_operator',
  'release_candidates',
  'release_gates',
  'release_builds',
  'operator_audit_log',
  'release_operator',
  'release_admin',
  'enable row level security',
]) {
  if (!schema.includes(marker)) fail(`Schema de release sem marcador: ${marker}`);
}
if (/service_role/i.test(schema)) fail('Schema de release não deve depender de service_role no cliente.');

const functions = read('supabase/migrations/202607250012_release_operations_functions.sql');
for (const marker of [
  'operator_create_release_candidate',
  'operator_set_release_gate',
  'operator_register_release_build',
  'operator_revoke_release_build',
  'operator_update_feedback',
  'operator_set_tester_status',
  'operator_promote_release',
  'required_release_gates_pending',
  'android_build_required',
  'blocking_feedback_open',
  'operator_audit_log',
]) {
  if (!functions.includes(marker)) fail(`RPCs de release sem marcador: ${marker}`);
}

const repository = read('apps/mobile/src/data/release-operations-repository.ts');
for (const marker of [
  'isReleaseOperator',
  'listReleaseCandidates',
  'createReleaseCandidate',
  'setReleaseGate',
  'registerReleaseBuild',
  'revokeReleaseBuild',
  'updateOperatorFeedback',
  'setBetaTesterStatus',
  'promoteReleaseCandidate',
]) {
  if (!repository.includes(marker)) fail(`Repositório operacional sem marcador: ${marker}`);
}
if (repository.includes('service_role')) fail('Repositório mobile não pode mencionar service_role.');

const consoleSource = read('apps/mobile/app/operator-console.tsx');
for (const marker of [
  'operator-console-title',
  'operator-create-candidate',
  'operator-status-approved',
  'operator-register-build',
  'operator-promote-release',
  'operator-access-denied',
  'isReleaseOperator',
]) {
  if (!consoleSource.includes(marker)) fail(`Console operacional sem marcador: ${marker}`);
}

const settings = read('apps/mobile/app/settings.tsx');
if (!settings.includes('settings-open-operator-console') || !settings.includes('operatorAccess')) {
  fail('Configurações não ocultam/liberam o console conforme o papel da sessão.');
}

const layout = read('apps/mobile/app/_layout.tsx');
if (!layout.includes('operator-console')) fail('Rota operator-console não foi registrada.');

const policy = read('apps/mobile/src/services/release-promotion-policy.ts');
for (const marker of ['requiredGateCount', 'availableAndroidBuilds', 'openBlockingFeedback', "candidateStatus !== 'approved'"]) {
  if (!policy.includes(marker)) fail(`Política local de promoção sem marcador: ${marker}`);
}

if (failures.length) {
  console.error('Sprint 10 check reprovado:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('Sprint 10 check aprovado:');
for (const notice of notices) console.log(`- ${notice}`);
console.log('- RBAC, RLS, auditoria, gates, builds, triagem e promoção estão presentes.');
console.log('- RC 2 permanece interna e nenhuma credencial administrativa foi incluída no cliente.');
