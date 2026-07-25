import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const files = execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard'], { encoding: 'utf8' })
  .split('\n')
  .filter(Boolean);
const errors = [];

for (const file of files) {
  if (/^\.env(?:\.|$)/.test(file) && file !== '.env.example') {
    errors.push(`${file}: arquivo de ambiente não deve ser versionado.`);
    continue;
  }
  const content = readFileSync(file, 'utf8');
  if (/sb_secret_[A-Za-z0-9_-]{16,}/.test(content)) errors.push(`${file}: possível Supabase secret key.`);
  if (/eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}/.test(content)) errors.push(`${file}: possível JWT real.`);
  if (/console\.(log|debug)\(/.test(content) && /apps\/mobile\/src|apps\/mobile\/app/.test(file)) {
    errors.push(`${file}: console.log/debug não é permitido em código com dados sensíveis.`);
  }
}

if (errors.length) {
  console.error('Falhas de segurança encontradas:');
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}
console.log(`Verificação de segurança concluída em ${files.length} arquivos versionados.`);
