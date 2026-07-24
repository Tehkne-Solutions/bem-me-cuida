import { spawnSync } from 'node:child_process';

const checks = [
  ['Node >= 22.13', process.versions.node, Number(process.versions.node.split('.')[0]) >= 22],
  ['Supabase project ref', process.env.SUPABASE_PROJECT_REF ? 'configurado' : 'ausente', Boolean(process.env.SUPABASE_PROJECT_REF)],
  ['Supabase access token', process.env.SUPABASE_ACCESS_TOKEN ? 'configurado' : 'ausente', Boolean(process.env.SUPABASE_ACCESS_TOKEN)],
  ['Supabase database password', process.env.SUPABASE_DB_PASSWORD ? 'configurado' : 'ausente', Boolean(process.env.SUPABASE_DB_PASSWORD)],
  ['Expo public URL', process.env.EXPO_PUBLIC_SUPABASE_URL ? 'configurada' : 'ausente', Boolean(process.env.EXPO_PUBLIC_SUPABASE_URL)],
  ['Expo publishable key', process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ? 'configurada' : 'ausente', Boolean(process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY)],
];

for (const command of ['git', 'npx']) {
  const result = spawnSync(command, ['--version'], { encoding: 'utf8' });
  checks.push([command, result.status === 0 ? result.stdout.trim() : 'indisponível', result.status === 0]);
}

console.log('\nBemMeCuida — prontidão de staging\n');
for (const [name, value, ok] of checks) console.log(`${ok ? 'OK ' : 'FALHA'} ${name}: ${value}`);

const failed = checks.filter(([, , ok]) => !ok);
if (failed.length) {
  console.error('\nStaging ainda não pode ser publicado. Preencha as variáveis ausentes no ambiente seguro.');
  process.exit(1);
}
console.log('\nStaging pronto para link, migrations e build.');
