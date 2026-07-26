# Runbook — Build da RC 0.11.0-rc.1

## Pré-requisitos

- ciclo `0.11.0` ativo ou congelado;
- marco da RC concluído;
- todos os gates obrigatórios aprovados;
- zero bloqueadores de backlog, escopo e experimentos;
- Supabase de homologação configurado;
- projeto EAS inicializado;
- environment GitHub `rc-011-build` com aprovação obrigatória;
- secret `EXPO_TOKEN` somente no environment protegido.

## Validação local

```bash
APP_VARIANT=rc011 \
EXPO_PUBLIC_APP_ENV=rc-0-11 \
EXPO_PUBLIC_APP_VERSION=0.11.0 \
EXPO_PUBLIC_RELEASE_CANDIDATE=1 \
npm run rc011:prebuild:check
```

## Build Android

```bash
npm run build:android:rc011
```

Registrar:

- build ID do EAS;
- `versionCode` retornado;
- URL HTTPS do APK;
- SHA-256 do arquivo;
- commit de origem.

## Build iOS

```bash
npm run build:ios:rc011
```

Registrar:

- build ID do EAS;
- `buildNumber` retornado;
- URL HTTPS do IPA ou distribuição interna;
- SHA-256 do arquivo;
- commit de origem.

## Manifesto

```bash
npm run rc011:artifacts:check
npm run rc011:manifest
```

Saída padrão:

```text
artifacts/bemmecuida-0.11.0-rc.1.json
```

## Homologação

Atualizar:

```text
release/rc-0.11.0/device-matrix.json
release/rc-0.11.0/test-results.json
```

Cada item obrigatório precisa de `status: passed` e `evidenceUrl` HTTPS. Em seguida:

```bash
npm run rc011:validation:report
npm run rc011:promotion:check
```

## Rollback

- revogar links de distribuição quando aplicável;
- cancelar rollout OTA ativo;
- preservar artefatos e manifestos para auditoria;
- não apagar dados dos aparelhos durante investigação;
- registrar incidente quando o problema for SEV1 ou SEV2.

## Proibições

- não copiar `EXPO_TOKEN` para `.env` versionado;
- não usar `service_role` no cliente;
- não anexar registros emocionais às evidências;
- não promover build sem checksum e teste de upgrade.

**Tehkné Solutions**
