# Runbook — Artefato Android da RC 0.11.0-rc.1

## Pré-condições

- infraestrutura externa registrada como `ready`;
- PR de infraestrutura mesclado;
- build Android solicitado pelo workflow oficial;
- environment `rc-011-homologation` com revisor e `EXPO_TOKEN`;
- commit de origem conhecido.

## 1. Descobrir candidatos

Abra:

```text
Actions → RC 0.11 Android Artifact → Run workflow
```

Use:

```text
action=discover-android
source_commit=<sha-do-build>
tracking_issue=24
```

O artefato de descoberta informa `not-found`, `unique` ou `ambiguous` sem aprovar nenhum build.

## 2. Capturar o build

Quando existir um único candidato:

```text
action=capture-android
source_commit=<sha-do-build>
build_id=
```

Quando houver mais de um candidato, informe o UUID escolhido após revisar o relatório:

```text
action=capture-android
source_commit=<sha-do-build>
build_id=<uuid-eas>
```

A execução:

1. repete os filtros do EAS;
2. inspeciona o build;
3. baixa o APK;
4. calcula o SHA-256;
5. publica a captura por 90 dias.

## 3. Abrir o PR de artefatos

Use o run ID da captura:

```text
action=open-artifact-pr
source_commit=<sha-do-build>
capture_run_id=<run-id>
tracking_issue=24
```

O PR altera somente:

```text
release/rc-0.11.0/builds.json
release/rc-0.11.0/android-homologation-plan.json
```

Revise build ID, número, URL, checksum e commit. Todos os aparelhos e suítes devem continuar como `pending`.

## 4. Após o merge

- instalar o APK nos perfis Android obrigatórios;
- executar as suítes com contas sintéticas;
- registrar cada evidência por HTTPS;
- não incluir Diário, diagnósticos, medicamentos, tokens ou dados de pessoas reais;
- manter a candidata bloqueada até a matriz e os gates estarem aprovados.

## Comandos da issue #24

```text
/rc011 discover-android <source_sha>
/rc011 capture-android-latest <source_sha>
/rc011 android-artifact-pr <source_sha> <capture_run_id>
```

O comando explícito existente continua disponível quando o UUID já é conhecido:

```text
/rc011 collect-android <source_sha> <eas_build_uuid>
```

**Tehkné Solutions**
