# Runbook — OTA final da BemMeCuida 0.11.0-rc.1

## Pré-condições

- `main` contém o mesmo commit usado nos builds Android e iOS;
- os dois artefatos estão capturados com SHA-256;
- infraestrutura externa está pronta;
- `EXPO_TOKEN` e `EAS_PROJECT_ID` existem nos environments protegidos;
- contas e conteúdo de teste são sintéticos.

## 1. Publicar update de validação

```text
/rc011 ota-publish <source_sha>
```

Após revisão do artifact do run:

```text
/rc011 ota-publish-pr <source_sha> <run_id>
```

O PR registra o group ID, runtime `0.11.0`, canal `rc-0-11` e evidência. O estado permanece `captured` até revisão humana.

## 2. Validar nos aparelhos

Para cada plataforma, instalar o build capturado, abrir o app, receber o update, reiniciar, conferir o banco local e iniciar sem rede.

Publicação:

```text
/rc011 ota-session <source_sha> android <build_uuid> android-mainstream <versao> <group_id> publish <evidence_https> update-received=passed,restart-applied=passed,local-data-preserved=passed,offline-startup=passed

/rc011 ota-session <source_sha> ios <build_uuid> ios-mainstream <versao> <group_id> publish <evidence_https> update-received=passed,restart-applied=passed,local-data-preserved=passed,offline-startup=passed
```

Versione cada captura com:

```text
/rc011 ota-session-pr <source_sha> <run_id>
```

## 3. Criar e registrar rollback

```text
/rc011 ota-rollback <source_sha> <published_group_id>
/rc011 ota-rollback-pr <source_sha> <run_id>
```

Repita as sessões usando `rollback` e o check `rollback-received`.

## 4. Gerar decisão final

```text
/rc011 rc-final-review <source_sha>
```

O artifact final lista todos os bloqueadores. `promote` significa apenas elegibilidade para aprovação humana; não publica nem promove a versão.

## Privacidade

Não registre nome, e-mail, Diário, medicamentos, diagnóstico, IMEI, serial, UDID, token, certificado ou URL com credenciais.

**Tehkné Solutions**
