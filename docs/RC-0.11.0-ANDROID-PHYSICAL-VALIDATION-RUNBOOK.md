# Runbook — Homologação física Android da RC 0.11.0-rc.1

## Pré-requisitos

- infraestrutura externa da RC validada;
- environment `rc-011-homologation` protegido;
- APK Android capturado e versionado em `builds.json`;
- `android-homologation-plan.json` vinculado ao mesmo build ID, commit e SHA-256;
- evidências usando contas sintéticas;
- nenhuma evidência contendo nome real, e-mail, telefone, conteúdo clínico, tokens, IMEI ou número de série.

## Formato de resultados

Use uma lista sem espaços:

```text
fresh-install=passed,local-database-regression=passed,privacy=passed
```

Status aceitos:

- `passed`;
- `failed`;
- `blocked`.

Modos de instalação:

- `fresh` para instalação limpa;
- `upgrade` para atualização de `0.10.0`;
- `retest` para repetir um item falho ou bloqueado.

## Capturar uma sessão pela issue #24

```text
/rc011 android-session <source_sha> <build_uuid> <profile_id> <device_status> <installation_mode> <android_version> <evidence_https> <suite=status,suite=status>
```

Exemplo sintético:

```text
/rc011 android-session 0123456789abcdef0123456789abcdef01234567 123e4567-e89b-42d3-a456-426614174000 android-mainstream passed fresh 14 https://github.com/Tehkne-Solutions/bem-me-cuida/actions/runs/100 fresh-install=passed,privacy=passed
```

O comando apenas despacha o workflow protegido. A execução valida o build, o checksum, o perfil e as suítes antes de criar o artefato da sessão.

## Abrir o PR da sessão

Após revisar o artefato do run de captura:

```text
/rc011 android-session-pr <source_sha> <capture_run_id>
```

O PR pode alterar somente registros de homologação da RC:

- `android-homologation-plan.json`;
- `device-matrix.json`;
- `test-results.json`;
- `android-gate-proposal.json`;
- relatórios Android;
- a sessão imutável em `android-sessions/<session_id>.json`.

O workflow não mescla o PR.

## Pacote de revisão Android

```text
/rc011 android-review <source_sha>
```

O pacote apresenta:

- progresso de aparelhos e suítes obrigatórias;
- falhas e bloqueios;
- fila de retestes;
- recomendação por gate Android;
- confirmação de que gates globais não foram alterados automaticamente.

## Regras de reteste

1. não edite a sessão anterior;
2. crie uma nova sessão com `installation_mode=retest`;
3. use uma nova evidência HTTPS;
4. mantenha o mesmo build ID, exceto quando uma nova candidata for gerada;
5. registre somente as suítes realmente repetidas;
6. revise e mescle o novo PR.

O plano usa o resultado mais recente por aparelho e suíte, mantendo o histórico completo de sessões.

## Critérios para revisão Android

A proposta Android fica pronta quando:

- todos os aparelhos Android obrigatórios estão `passed`;
- todas as suítes Android obrigatórias estão `passed`;
- não existem itens obrigatórios `failed` ou `blocked`;
- todas as evidências usam HTTPS;
- a sessão corresponde ao build e checksum versionados.

Isso não aprova a promoção global nem substitui iOS, OTA, rollback ou revisão humana.

**Tehkné Solutions**
