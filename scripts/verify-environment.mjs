const required = ['EXPO_PUBLIC_SUPABASE_URL', 'EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY'];
const missing = required.filter((name) => !process.env[name]?.trim());
const errors = [];

if (missing.length) errors.push(`Variáveis ausentes: ${missing.join(', ')}`);

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
if (url) {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'https:' && parsed.hostname !== '127.0.0.1' && parsed.hostname !== 'localhost') {
      errors.push('EXPO_PUBLIC_SUPABASE_URL deve usar HTTPS fora do ambiente local.');
    }
  } catch {
    errors.push('EXPO_PUBLIC_SUPABASE_URL não é uma URL válida.');
  }
}

const key = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? '';
if (/service_role|secret/i.test(key)) {
  errors.push('Uma chave administrativa foi detectada. Use somente a publishable/anon key no aplicativo.');
}

const variant = process.env.APP_VARIANT ?? 'development';
if (!['development', 'preview', 'beta', 'rc', 'production'].includes(variant)) {
  errors.push('APP_VARIANT deve ser development, preview, beta, rc ou production.');
}

if (errors.length) {
  console.error('\nConfiguração inválida:');
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(`Ambiente válido para ${variant}. Nenhum segredo administrativo foi encontrado.`);
