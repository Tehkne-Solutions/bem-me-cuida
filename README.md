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
- Sprint 04 / Incremento 01 implementado e validado: plano personalizado de apoio e crise, contatos de confiança e acesso offline.
- Sprint 05 / Incremento 01 implementado e validado: relatórios longitudinais e compartilhamento seguro.
- Sprint 06 implementado: busca, filtros, edição e exclusão lógica do Diário, além de comparações descritivas locais sem causalidade.
- Sprint 07 implementado: central de perfil e privacidade, consentimentos opcionais, exportação integral, solicitação de exclusão e bloqueio biométrico configurável.
- Sprint 08 implementado: notificações por categoria, horário silencioso, acessibilidade e preparação da beta fechada.
- Versão atual: `0.9.0`.

## Stack

- Expo SDK 57;
- React Native 0.86;
- React 19.2.3;
- TypeScript 6 em modo estrito;
- Expo Router;
- Expo SQLite com SQLCipher;
- Expo SecureStore;
- Expo LocalAuthentication;
- Expo Notifications;
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
- development build do Expo, pois SQLCipher, notificações completas e a validação de Face ID não funcionam integralmente no Expo Go.

```bash
cp .env.example .env
npm install
npm run config:check
npm run security:check
npm run release:check
npm run mobile
```

Para gerar o projeto nativo localmente com SQLCipher, biometria e notificações:

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

Os builds development, preview e beta usam identificadores e deep links próprios, permitindo instalação paralela sem misturar sessões ou redirects.

## Beta fechada

Consulte [docs/BETA-FECHADA.md](docs/BETA-FECHADA.md).

```bash
npm run staging:check
npm run beta:check
npm run build:android:beta
```

A variante beta utiliza:

- aplicativo `BemMeCuida Beta`;
- scheme `bemmecuida-beta`;
- Android package `com.tehknesolutions.bemmecuida.beta`;
- canal EAS `beta`;
- distribuição interna.

O workflow E2E Android público é executado sob demanda ao adicionar a label `e2e` em um pull request. Os fluxos autenticados de check-in, plano de cuidado, diário avançado, insights, plano de apoio, relatórios, privacidade, notificações e acessibilidade ficam preparados para execução protegida com `E2E_EMAIL` e `E2E_PASSWORD`.

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

Entradas do diário são armazenadas no banco local criptografado, sincronizadas somente no escopo da conta autenticada e protegidas por RLS no Supabase. Nenhum texto do diário é enviado a modelos de IA.

O plano de apoio da versão `0.5.0` permanece disponível offline no aparelho e não realiza avaliação automática de risco. Contatos de confiança e orientações pessoais são sincronizados somente no escopo da conta autenticada.

O relatório da versão `0.6.0` é calculado sob demanda no aparelho, não inclui textos do diário e não é salvo ou enviado automaticamente.

Na versão `0.7.0`, edição e exclusão do Diário continuam local-first. Exclusões usam tombstones sincronizados para impedir que registros antigos reapareçam, e comparações de contexto são calculadas apenas no aparelho com linguagem não causal.

Na versão `0.8.0`, o titular pode revisar consentimentos opcionais, exportar todos os dados locais, registrar uma solicitação de exclusão e ativar bloqueio biométrico com intervalo configurável. A exclusão da conta é uma solicitação controlada, não uma remoção imediata executada pelo aplicativo.

Na versão `0.9.0`, notificações usam conteúdo genérico, categorias opcionais e horário silencioso. Preferências de acessibilidade e notificações permanecem locais por aparelho e separadas por conta no SecureStore.

## Assinatura

Desenvolvido por **Tehkné Solutions**.

## Configuração de autenticação

No Supabase Auth, configure os callbacks `bemmecuida-dev://`, `bemmecuida-preview://`, `bemmecuida-beta://` e `bemmecuida://`. As URLs exatas e os roteiros de validação estão nos guias de staging e beta.
