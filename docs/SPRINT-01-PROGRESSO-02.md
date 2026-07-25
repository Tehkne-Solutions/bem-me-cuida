# Sprint 01 — Incremento 02

## Implementado

- autenticação por e-mail e senha;
- cadastro com confirmação de e-mail compatível com Supabase;
- recuperação e redefinição de senha por deep link;
- sessão persistida em SecureStore;
- renovação automática de token enquanto o aplicativo está ativo;
- rotas protegidas para autenticação, onboarding e aplicativo;
- onboarding em três etapas;
- consentimentos obrigatórios e opcionais versionados;
- função transacional `complete_onboarding`;
- trigger para criação automática de perfil;
- cache offline do estado de onboarding;
- separação local de check-ins por usuário;
- área de conta e encerramento de sessão;
- minutas legais funcionais marcadas para revisão jurídica.

## Configuração externa ainda necessária

1. Criar o projeto Supabase de staging.
2. Executar as migrations.
3. Adicionar `bemmecuida://**` aos Redirect URLs do Supabase Auth.
4. Definir política de confirmação de e-mail.
5. Configurar variáveis `EXPO_PUBLIC_SUPABASE_URL` e `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
6. Gerar development build para validar SQLCipher e deep links em dispositivo real.
