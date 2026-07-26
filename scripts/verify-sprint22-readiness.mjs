import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const failures = [];
const notices = [];
const fail = (message) => failures.push(message);
const ok = (message) => notices.push(message);
const read = (path) => readFileSync(join(root, path), 'utf8');

const requiredFiles = [
  '.github/workflows/rc-011-release-transition.yml',
  'scripts/lib/rc011-release-transition.mjs',
  'scripts/generate-rc011-release-transition-report.mjs',
  'scripts/test-rc011-release-transition.mjs',
  'docs/SPRINT-22.md',
  'docs/ADR-026-transicao-pos-evidencias.md',
  'docs/RC-0.11.0-RELEASE-TRANSITION-RUNBOOK.md',
];
for (const path of requiredFiles) if (!existsSync(join(root, path))) fail(`arquivo obrigatório ausente: ${path}`);

if (existsSync(join(root, '.github/workflows/rc-011-release-transition.yml'))) {
  const workflow = read('.github/workflows/rc-011-release-transition.yml');
  for (const marker of [
    'prepare-evidence',
    'finalize-and-build',
    'Inspect consolidated capture',
    'Dispatch evidence PR idempotently',
    'Validate merged evidence PR',
    'Revoke temporary repository secrets',
    'RC011_ADMIN_TOKEN',
    'RC011_EXPO_TOKEN',
    'npm run rc011:infrastructure:external',
    'uses: ./.github/workflows/rc-011-build.yml',
    'action: validate',
    'action: build-android',
    'secrets: inherit',
  ]) {
    if (!workflow.includes(marker)) fail(`workflow da transição sem marcador: ${marker}`);
  }
  if (workflow.includes('gh pr merge')) fail('workflow não pode mesclar o PR de evidências automaticamente.');
  if (workflow.includes('echo "$GH_TOKEN"')) fail('workflow não pode imprimir o token administrativo.');
  ok('Workflow separa preparação, merge humano, revogação, validação e Android.');
}

if (existsSync(join(root, '.github/workflows/rc-011-build.yml'))) {
  const buildWorkflow = read('.github/workflows/rc-011-build.yml');
  if (!buildWorkflow.includes('workflow_call:')) fail('workflow de build não aceita chamada reutilizável.');
  if (!buildWorkflow.includes('environment: rc-011-build')) fail('build perdeu o environment protegido.');
  if (!buildWorkflow.includes('npm run rc011:infrastructure:external')) fail('build perdeu o gate externo.');
  ok('Workflow oficial continua sendo a única autoridade para validação e build.');
}

if (existsSync(join(root, 'scripts/lib/rc011-release-transition.mjs'))) {
  const core = read('scripts/lib/rc011-release-transition.mjs');
  for (const marker of [
    "pr.state !== 'MERGED'",
    "pr.baseRefName !== 'main'",
    'files.length !== 1',
    'confirmedAbsent !== true',
    "'RC011_ADMIN_TOKEN'",
    "'RC011_EXPO_TOKEN'",
    'containsSecretValues: false',
    "'validate-and-build-android'",
  ]) {
    if (!core.includes(marker)) fail(`política da transição sem controle: ${marker}`);
  }
  ok('Política bloqueia PR inadequado e exige revogação antes do Android.');
}

if (existsSync(join(root, 'package.json'))) {
  const packageJson = JSON.parse(read('package.json'));
  for (const script of ['rc011:release-transition:test', 'sprint22:check']) {
    if (!packageJson.scripts?.[script]) fail(`script npm ausente: ${script}`);
  }
  if (!packageJson.scripts?.['release:check']?.includes('verify-sprint22-readiness.mjs')) {
    fail('release:check não inclui Sprint 22.');
  }
}

if (failures.length) {
  console.error('Sprint 22 reprovado:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('Sprint 22 aprovado:');
for (const notice of notices) console.log(`- ${notice}`);
console.log('- A automação não cria evidências, merges ou builds sem fatos externos reais.');
console.log('- Build ID, URL e SHA-256 continuam obrigatórios após a solicitação Android.');
console.log('- Tehkné Solutions');
