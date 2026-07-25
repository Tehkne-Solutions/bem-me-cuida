# Staging e primeiro build Android

## 1. Criar os serviços externos

- Criar um projeto Supabase exclusivo de staging.
- Criar ou selecionar a conta/projeto Expo da Tehkné Solutions.
- Nunca reutilizar banco de produção para testes.

## 2. Preparar `.env`

```bash
cp .env.example .env
```

Preencher:

```env
APP_VARIANT=development
EXPO_PUBLIC_APP_ENV=development
EXPO_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
SUPABASE_PROJECT_REF=<project-ref>
SUPABASE_ACCESS_TOKEN=<token-pessoal-ou-CI>
SUPABASE_DB_PASSWORD=<senha-do-banco>
```

`SUPABASE_ACCESS_TOKEN` e `SUPABASE_DB_PASSWORD` nunca entram no bundle mobile.

## 3. Validar

```bash
npm run config:check
npm run staging:check
npm run security:check
npm run release:check
```

## 4. Aplicar banco e configuração Auth

```bash
npm run supabase:push:staging
```

O script executa link, migrations e `config push`. Conferir no painel do Supabase:

- confirmação de e-mail habilitada;
- URLs `bemmecuida-dev://auth/callback` e `bemmecuida-dev://reset-password`;
- RLS ativa nas tabelas públicas;
- nenhuma chave `service_role` copiada para o aplicativo.

## 5. Vincular o projeto EAS

```bash
cd apps/mobile
npx eas-cli@latest login
npx eas-cli@latest init
```

Copiar o project ID gerado para `EXPO_PUBLIC_EAS_PROJECT_ID` e cadastrar no ambiente `development` do EAS:

```bash
npx eas-cli@latest env:create --environment development --name EXPO_PUBLIC_SUPABASE_URL --value "https://<project-ref>.supabase.co" --visibility plaintext
npx eas-cli@latest env:create --environment development --name EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY --value "sb_publishable_..." --visibility sensitive
```

A publishable key pode existir no cliente, mas é marcada como sensitive para reduzir exposição operacional.

## 6. Gerar APK interno

```bash
npm run build:android:development
```

Ou, no Windows:

```powershell
./scripts/build-android-development.ps1
```

O perfil `development` inclui Expo Dev Client e gera APK instalável. SQLCipher exige esse build nativo e não deve ser validado apenas no Expo Go.

## 7. Roteiro mínimo no aparelho

1. Abrir sem internet e confirmar que a tela de crise funciona.
2. Criar conta e confirmar e-mail por deep link.
3. Concluir onboarding e consentimentos.
4. Fazer check-in online.
5. Fazer check-in offline, fechar e reabrir o aplicativo.
6. Recuperar internet e confirmar sincronização automática.
7. Entrar com a mesma conta em outro aparelho e confirmar recuperação do registro.
8. Trocar de conta no primeiro aparelho e confirmar isolamento local.
9. Abrir o seletor de aplicativos e confirmar conteúdo protegido.
10. Repetir recuperação de senha por deep link.
11. Abrir **Cuidado → Diagnosticar este aparelho** e confirmar schema 7, SQLCipher e SecureStore.
12. Compartilhar o relatório e confirmar ausência de nome, e-mail, IDs, tokens e conteúdo emocional.

## 8. Testes E2E

Com o APK development instalado e Maestro configurado:

```bash
npm run e2e:smoke
```

Para a conta sintética previamente confirmada e com onboarding concluído:

```bash
maestro test \
  -e E2E_EMAIL="conta-e2e@exemplo.com" \
  -e E2E_PASSWORD="senha-e2e-segura" \
  .maestro/authenticated-check-in.yml
```

No EAS, adicione a label `e2e` ao pull request para executar o workflow Android sob demanda.

## 9. Aceite

Use [CHECKLIST-HOMOLOGACAO-SPRINT-01.md](CHECKLIST-HOMOLOGACAO-SPRINT-01.md). Não marque o sprint como aprovado apenas porque o APK foi gerado: os testes de isolamento, offline, conflito e dois dispositivos são obrigatórios.
