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
- Sprint 09 implementado: operação da beta, feedback rastreável, observabilidade local consentida e preparação da primeira release candidate.
- Sprint 10 implementado: console operacional com RBAC, gates, builds, triagem, auditoria, bloqueadores de promoção e preparação editorial das lojas.
- Sprint 11 implementado: produção isolada, pacote de submissão, rollout gradual, saúde técnica agregada, incidentes e rollback auditado.
- Sprint 12 implementado: sustentação, hotfixes, aprovação por quatro-olhos, OTA compatível, rollback e retenção operacional.
- Versão-base atual: `0.10.0` — **Produção 1 preparada; hotfixes não alteram a versão-base até existir artefato real**.

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
- EAS Update com runtime por versão do aplicativo;
- Supabase Auth + PostgreSQL + RLS;
- Zod para contratos e validação.

## Estrutura

```text
bem-me-cuida/
├── apps/mobile/               # Aplicativo Expo/React Native
├── packages/domain/           # Contratos de domínio compartilhados
├── supabase/migrations/       # Banco remoto e políticas RLS
├── docs/                      # ADRs, segurança e especificação do sprint
├── scripts/                   # Publicação, verificação e manifestos
└── .github/workflows/         # CI e operações protegidas
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

Os builds development, preview, beta, RC, validação de hotfix e produção usam canais ou identificadores próprios para evitar mistura de sessões, redirects e bundles.

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

## Release Candidate 2

Consulte [docs/RELEASE-CANDIDATE-02.md](docs/RELEASE-CANDIDATE-02.md) e [docs/STORE-READINESS.md](docs/STORE-READINESS.md).

```bash
npm run release:check
npm run sprint10:check
npm run supabase:push:staging
APP_VARIANT=rc npm run config:check
APP_VARIANT=rc npm run staging:check
APP_VARIANT=rc npm run rc:check
npm run build:android:rc
```

A variante RC utiliza:

- aplicativo `BemMeCuida RC`;
- release exibida `0.10.0-rc.2`;
- scheme `bemmecuida-rc`;
- Android package `com.tehknesolutions.bemmecuida.rc`;
- canal EAS `rc`;
- distribuição interna.

Depois do build, gere um manifesto sem segredos:

```bash
RELEASE_BUILD_NUMBER=<numero> \
RELEASE_ARTIFACT_URL=https://<artefato> \
RELEASE_ARTIFACT_SHA256=<sha256> \
RELEASE_MANIFEST_OUTPUT=artifacts/bemmecuida-0.10.0-rc.2.json \
npm run release:manifest
```

## Produção 1

Consulte [docs/PRODUCTION-RELEASE-01.md](docs/PRODUCTION-RELEASE-01.md), [docs/POST-RELEASE-MONITORING.md](docs/POST-RELEASE-MONITORING.md) e [docs/INCIDENT-RESPONSE.md](docs/INCIDENT-RESPONSE.md).

```bash
npm run release:check
npm run sprint11:check

APP_VARIANT=production \
EXPO_PUBLIC_APP_ENV=production \
EXPO_PUBLIC_PRODUCTION_RELEASE=1 \
npm run production:check

npm run build:android:production
npm run build:ios:production
```

A variante de produção utiliza:

- aplicativo `BemMeCuida`;
- scheme `bemmecuida`;
- Android package `com.tehknesolutions.bemmecuida`;
- canal EAS `production`;
- distribuição `store`;
- AAB no Android;
- runtime associado à versão do aplicativo.

Após gerar e conferir os artefatos:

```bash
npm run store:package
npm run submit:android:production
npm run submit:ios:production
```

Os comandos de submissão dependem das credenciais reais configuradas no EAS e nos consoles das lojas. Eles não são executados pelo CI público.

## Hotfixes e OTA

Consulte [docs/HOTFIX-AND-OTA-RUNBOOK.md](docs/HOTFIX-AND-OTA-RUNBOOK.md) e [docs/AUDIT-RETENTION.md](docs/AUDIT-RETENTION.md).

Fluxo resumido:

```bash
npm run release:check
npm run sprint12:check
npm run ota:check
npm run build:android:hotfix-validation
npm run ota:publish:validation
```

Depois de homologar o group ID no canal `hotfix-validation`:

```bash
npm run ota:promote:production
npm run hotfix:manifest
```

Operações de emergência:

```bash
npm run ota:cancel-rollout
npm run ota:rollback:production
```

Regras obrigatórias:

- mudança nativa exige novo binário;
- runtime OTA precisa coincidir com a versão instalada;
- criador não aprova a própria operação;
- somente `release_admin` decide hotfix e plano OTA;
- produção recebe o mesmo grupo homologado por republicação;
- execução externa usa o ambiente GitHub `production-operations` e credenciais fora do repositório.

## Consoles operacionais

Os consoles aparecem somente quando o token autenticado contém um papel administrativo assinado:

```json
{
  "app_metadata": {
    "role": "release_operator"
  }
}
```

Também é aceito `release_admin`. O papel deve ser atribuído fora do aplicativo, em ambiente administrativo seguro. `user_metadata` não concede acesso.

- o console de releases administra candidata, gates, builds, testers e promoção;
- o console de produção administra submissões, rollout, leituras agregadas, incidentes e rollback;
- o console de sustentação administra hotfixes, aprovações, OTA, artefatos e retenção.

O cliente não recebe permissões genéricas de escrita. As ações passam por RPCs auditadas no Supabase.

### Regras de produção

- rollout inicial em 1%;
- ondas de 5%, 10%, 25%, 50% e 100%;
- leitura agregada com até 24 horas;
- sessões sem falha ≥ 99%;
- sincronização ≥ 97%;
- autenticação ≥ 98%;
- zero bloqueadores;
- zero SEV1 ou SEV2 abertos.

### Retenção operacional

- saúde agregada: mínimo de 180 dias;
- auditoria: mínimo de 365 dias;
- timeline de incidentes resolvidos: mínimo de 730 dias;
- legal hold e holds temporais impedem exclusão;
- execução efetiva exige `release_admin` e confirmação destrutiva explícita.

## Testes E2E

Os fluxos autenticados comuns usam `E2E_EMAIL` e `E2E_PASSWORD`.

Os consoles usam uma conta sintética operacional separada:

```bash
E2E_OPERATOR_EMAIL=<conta-operacional> \
E2E_OPERATOR_PASSWORD=<senha> \
npm run e2e:operator

E2E_OPERATOR_EMAIL=<conta-operacional> \
E2E_OPERATOR_PASSWORD=<senha> \
npm run e2e:production

E2E_OPERATOR_EMAIL=<conta-operacional> \
E2E_OPERATOR_PASSWORD=<senha> \
npm run e2e:maintenance
```

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

Leia [SECURITY.md](SECURITY.md) antes de alterar persistência, autenticação, logs, sincronização ou operação de releases. Dados emocionais e de saúde são tratados como sensíveis por padrão.

Entradas do Diário são armazenadas no banco local criptografado, sincronizadas somente no escopo da conta autenticada e protegidas por RLS no Supabase. Nenhum texto do Diário é enviado a modelos de IA.

O plano de apoio permanece disponível offline no aparelho e não realiza avaliação automática de risco. Relatórios são calculados sob demanda no aparelho e não são enviados automaticamente.

Notificações usam conteúdo genérico. Preferências de acessibilidade, notificações, bloqueio e observabilidade permanecem separadas por conta e aparelho.

Feedback da beta e adesão usam RLS. O log técnico local é desligado por padrão, limitado a eventos pré-definidos sem texto livre e nunca é enviado automaticamente. Diagnóstico e eventos só acompanham um relato quando o usuário seleciona essas opções.

A operação usa RBAC por `app_metadata`, RLS, RPCs específicas e auditoria. Leituras de produção armazenam somente números e contagens agregadas. Manifestos de hotfix não incluem dados clínicos, tokens ou certificados. Nenhuma chave `service_role` é distribuída no aplicativo.

## Assinatura

Desenvolvido por **Tehkné Solutions**.

## Configuração de autenticação

No Supabase Auth, configure os callbacks `bemmecuida-dev://`, `bemmecuida-preview://`, `bemmecuida-beta://`, `bemmecuida-rc://` e `bemmecuida://`. As URLs exatas e os roteiros de validação estão nos guias de staging, beta, RC e produção.
