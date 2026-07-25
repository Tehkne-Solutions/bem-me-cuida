# Staging e builds Android

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
EXPO_PUBLIC_RELEASE_CANDIDATE=
EXPO_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
EXPO_PUBLIC_EAS_PROJECT_ID=<eas-project-id>
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

Para a distribuição beta fechada:

```bash
npm run beta:check
```

Para a Release Candidate 1:

```bash
APP_VARIANT=rc npm run rc:check
```

## 4. Aplicar banco e configuração Auth

```bash
npm run supabase:push:staging
```

O script executa link, migrations e `config push`. Conferir no painel do Supabase:

- confirmação de e-mail habilitada;
- callbacks de desenvolvimento:
  - `bemmecuida-dev://auth/callback`;
  - `bemmecuida-dev://reset-password`;
- callbacks de preview:
  - `bemmecuida-preview://auth/callback`;
  - `bemmecuida-preview://reset-password`;
- callbacks de beta:
  - `bemmecuida-beta://auth/callback`;
  - `bemmecuida-beta://reset-password`;
- callbacks da RC:
  - `bemmecuida-rc://auth/callback`;
  - `bemmecuida-rc://reset-password`;
- RLS ativa nas tabelas públicas, incluindo `beta_feedback` e `beta_tester_enrollments`;
- nenhuma chave `service_role` copiada para o aplicativo.

## 5. Vincular o projeto EAS

```bash
cd apps/mobile
npx eas-cli@latest login
npx eas-cli@latest init
```

Copiar o project ID gerado para `EXPO_PUBLIC_EAS_PROJECT_ID` e cadastrar as variáveis públicas no ambiente `development`:

```bash
npx eas-cli@latest env:create --environment development --name EXPO_PUBLIC_SUPABASE_URL --value "https://<project-ref>.supabase.co" --visibility plaintext
npx eas-cli@latest env:create --environment development --name EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY --value "sb_publishable_..." --visibility sensitive
npx eas-cli@latest env:create --environment development --name EXPO_PUBLIC_EAS_PROJECT_ID --value "<eas-project-id>" --visibility plaintext
```

Para preview, beta e RC, repetir no ambiente `preview`, pois os perfis EAS `beta` e `rc` consomem esse conjunto controlado de variáveis.

A publishable key pode existir no cliente, mas é marcada como sensitive para reduzir exposição operacional.

## 6. Gerar APK interno de desenvolvimento

```bash
npm run build:android:development
```

Ou, no Windows:

```powershell
./scripts/build-android-development.ps1
```

O perfil `development` inclui Expo Dev Client e gera APK instalável. SQLCipher, biometria e notificações exigem esse build nativo e não devem ser validados apenas no Expo Go.

## 7. Gerar beta fechada

```bash
npm run beta:check
npm run build:android:beta
```

A beta possui pacote, scheme e canal separados. Consulte [BETA-FECHADA.md](BETA-FECHADA.md) antes de compartilhar o link de instalação.

## 8. Gerar Release Candidate 1

```bash
APP_VARIANT=rc npm run rc:check
npm run build:android:rc
```

A RC usa `com.tehknesolutions.bemmecuida.rc`, scheme `bemmecuida-rc` e canal EAS `rc`. Consulte [RELEASE-CANDIDATE-01.md](RELEASE-CANDIDATE-01.md).

## 9. Roteiro mínimo no aparelho

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
11. Ativar biometria, enviar o app ao background e confirmar bloqueio.
12. Configurar categorias de notificações e horário silencioso.
13. Confirmar que a tela bloqueada não revela nomes, emoções ou conteúdo do Diário.
14. Testar fonte grande, alto contraste, redução de movimento e leitor de tela.
15. Compartilhar relatório e confirmar ausência de IDs, tokens e conteúdo emocional não autorizado.
16. Confirmar participação na beta, pausar e reativar.
17. Enviar feedback sem anexos e com diagnóstico técnico.
18. Ativar o log técnico, confirmar limite e apagá-lo.
19. Instalar Beta e RC em paralelo e confirmar isolamento de sessão.

## 10. Testes E2E

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

Fluxos autenticados adicionais:

```bash
npm run e2e:settings
npm run e2e:preferences
npm run e2e:beta
```

No EAS, adicione a label `e2e` ao pull request para executar o workflow Android sob demanda.

## 11. Aceite

Use [CHECKLIST-HOMOLOGACAO-SPRINT-01.md](CHECKLIST-HOMOLOGACAO-SPRINT-01.md), [BETA-FECHADA.md](BETA-FECHADA.md) e [RELEASE-CANDIDATE-01.md](RELEASE-CANDIDATE-01.md). Não aprove a RC apenas porque o APK foi gerado: isolamento, offline, notificações, acessibilidade, feedback, RLS, conflito e dois dispositivos continuam obrigatórios.

**Assinatura:** Tehkné Solutions.
