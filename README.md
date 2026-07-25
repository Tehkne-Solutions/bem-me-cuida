# BemMeCuida

**Acompanhamento emocional, autocuidado e organização do tratamento.**

Produto da **Tehkné Solutions**.

BemMeCuida transforma a lembrança de “bem-me-quer” em uma prática contínua de autocuidado. O aplicativo ajuda a registrar estados emocionais, reconhecer padrões pessoais, organizar tratamentos e preparar informações úteis para conversas com profissionais.

> O BemMeCuida não realiza diagnóstico, não substitui atendimento profissional e não recomenda alterações de medicamentos.

## Estado atual

- Sprint 01 fechado no código: autenticação, onboarding, check-in, SQLCipher, sincronização e diagnóstico.
- Sprint 02 / Incremento 01 concluído no código: medicamentos, práticas, lembretes discretos, histórico e sincronização do plano de cuidado.
- Sprint 02 / Incremento 02 concluído no código: edição segura, múltiplos horários, estoque, consultas, tratamentos e histórico filtrável.
- Sprint 03 / Incremento 01 implementado: diário emocional estruturado, registros para consulta, tendências semanais locais e perguntas de reflexão sem diagnóstico automático.
- Versão atual: `0.4.0`.

## Stack

- Expo SDK 57;
- React Native 0.86;
- React 19.2.3;
- TypeScript 6 em modo estrito;
- Expo Router;
- Expo SQLite com SQLCipher;
- Expo SecureStore;
- Supabase Auth + PostgreSQL + RLS;
- Zod para contratos e validação.

## Estrutura

```text
bem-me-cuida/
├── apps/mobile/               # Aplicativo Expo/React Native
├── packages/domain/           # Contratos de domínio compartilhados
├── supabase/migrations/       # Banco remoto e políticas RLS
├── docs/                      # ADRs, segurança e especificação do sprint
├── scripts/                   # Publicação e bootstrap
└── .github/workflows/         # CI
```

## Início rápido

Pré-requisitos:

- Node.js 22.13 ou superior;
- npm 10 ou superior;
- Android Studio ou Xcode para build nativo;
- Supabase CLI para ambiente local, quando o backend for ativado;
- development build do Expo, pois SQLCipher não funciona no Expo Go.

```bash
cp .env.example .env
npm install
npm run config:check
npm run security:check
npm run release:check
npm run mobile
```

Para gerar o projeto nativo localmente com SQLCipher:

```bash
npm run prebuild --workspace @bemmecuida/mobile
npm run android --workspace @bemmecuida/mobile
```

## Staging e build Android

Consulte [docs/STAGING-E-BUILD-ANDROID.md](docs/STAGING-E-BUILD-ANDROID.md).

Com as credenciais no `.env`:

```bash
npm run staging:check
npm run supabase:push:staging
npm run build:android:development
```

Os builds development e preview usam identificadores e deep links próprios, permitindo instalação paralela sem misturar sessões ou redirects.

O workflow E2E Android público é executado sob demanda ao adicionar a label `e2e` em um pull request. Os fluxos autenticados de check-in, plano de cuidado, diário e insights ficam preparados para execução protegida com `E2E_EMAIL` e `E2E_PASSWORD`.

## Publicação no GitHub

O repositório remoto recomendado é privado:

```bash
gh repo create Tehkne-Solutions/bem-me-cuida \
  --private \
  --description "BemMeCuida — gestão mental e emocional | Tehkné Solutions" \
  --source . \
  --remote origin \
  --push
```

No Windows PowerShell, execute `./scripts/publicar-github.ps1` após autenticar o GitHub CLI.

## Segurança

Leia [SECURITY.md](SECURITY.md) antes de alterar persistência, autenticação, logs ou sincronização. Dados emocionais e de saúde são tratados como sensíveis por padrão.

Entradas do diário são armazenadas no banco local criptografado, sincronizadas somente no escopo da conta autenticada e protegidas por RLS no Supabase. Os insights da versão `0.4.0` são calculados localmente a partir de contagens e médias; nenhum texto do diário é enviado a modelos de IA.

## Assinatura

Desenvolvido por **Tehkné Solutions**.

## Configuração de autenticação

No Supabase Auth, configure os callbacks `bemmecuida-dev://`, `bemmecuida-preview://` e `bemmecuida://`. As URLs exatas e o roteiro de validação estão no guia de staging.
