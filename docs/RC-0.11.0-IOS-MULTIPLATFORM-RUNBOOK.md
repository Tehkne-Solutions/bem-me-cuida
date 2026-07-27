# Runbook — iOS e homologação multiplataforma da RC 0.11

## Pré-condições

- infraestrutura externa em `ready`;
- `EXPO_TOKEN` disponível apenas no environment protegido;
- commit da candidata aprovado;
- build iOS solicitado com perfil `rc011`;
- contas sintéticas e evidências HTTPS sanitizadas.

## 1. Descobrir e capturar o build iOS

```text
/rc011 discover-ios <source_sha>
/rc011 capture-ios-latest <source_sha>
```

Quando houver mais de um candidato, use o workflow `RC 0.11 iOS Artifact` com o Build ID explícito.

Após revisar a captura:

```text
/rc011 ios-artifact-pr <source_sha> <capture_run_id>
```

O PR deve alterar somente `builds.json` e `ios-homologation-plan.json`.

## 2. Executar sessões físicas

Para cada perfil iOS obrigatório:

```text
/rc011 ios-session <source_sha> <build_uuid> <profile_id> <passed|failed|blocked> <fresh|upgrade|retest> <ios_version> <evidence_https> <suite=status,suite=status>
```

Perfis previstos:

- `ios-minimum`;
- `ios-mainstream`;
- `ios-latest`;
- `ios-tablet` como cobertura complementar.

Após revisar o artefato da sessão:

```text
/rc011 ios-session-pr <source_sha> <capture_run_id>
```

## 3. Retestes

Falhas e bloqueios geram `retest-required`. O reteste usa uma nova Session ID e preserva a evidência anterior.

## 4. Revisão multiplataforma

```text
/rc011 multiplatform-review <source_sha>
```

O pacote exige:

- builds Android e iOS capturados;
- todos os aparelhos obrigatórios aprovados;
- todas as suítes aprovadas em Android e iOS;
- planos físicos em `ready-for-review`;
- OTA e rollback aprovados.

O resultado `promote` é somente recomendação. A promoção continua dependendo do console operacional, dos gates e da revisão humana.

## Privacidade

Não registrar nomes, e-mails, conteúdo emocional, diagnósticos, medicamentos, IMEI, serial, UDID, tokens, certificados ou senhas.

**Tehkné Solutions**
