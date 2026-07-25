import { spawnSync } from 'node:child_process';

for (const name of ['SUPABASE_PROJECT_REF', 'SUPABASE_ACCESS_TOKEN', 'SUPABASE_DB_PASSWORD']) {
  if (!process.env[name]) {
    console.error(`Variável obrigatória ausente: ${name}`);
    process.exit(1);
  }
}

function run(args, extraEnv = {}) {
  const result = spawnSync('npx', ['supabase@latest', ...args], {
    stdio: 'inherit',
    env: { ...process.env, ...extraEnv },
  });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

run(['link', '--project-ref', process.env.SUPABASE_PROJECT_REF, '--password', process.env.SUPABASE_DB_PASSWORD]);
run(['db', 'push', '--include-all', '--password', process.env.SUPABASE_DB_PASSWORD]);
run(['config', 'push']);
console.log('Migrations aplicadas ao Supabase de staging.');
