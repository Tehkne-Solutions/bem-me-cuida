# Runbook — Homologação da RC 0.11.0-rc.1

## 1. Configuração externa

Criar os environments do GitHub:

- `rc-011-build`;
- `rc-011-homologation`.

Configurar aprovação obrigatória e o secret `EXPO_TOKEN`. Cadastrar como variables:

- `EAS_PROJECT_ID`;
- `RC011_SUPABASE_URL`;
- `RC011_SUPABASE_PUBLISHABLE_KEY`;
- variáveis dos gates `RC011_*` usadas pelos workflows.

Cadastrar no Supabase Auth:

```text
bemmecuida-rc011://auth/callback
bemmecuida-rc011://reset-password
```

## 2. Solicitar builds

Executar o workflow `RC 0.11 Build` com o commit aprovado:

1. `validate`;
2. `build-android`;
3. `build-ios`.

Aguardar os builds terminarem no EAS e guardar os IDs.

## 3. Capturar binários e checksums

Executar `RC 0.11 Homologation`:

- `collect-android-build` com o build ID Android;
- `collect-ios-build` com o build ID iOS.

O workflow usa `eas build:view` e `eas build:download`, calcula SHA-256 e publica capturas JSON. Baixe as capturas e aplique-as em cópias revisáveis:

```bash
npm run rc011:capture:apply -- \
  --kind build \
  --capture artifacts/android-build-capture.json \
  --evidence-url https://<evidencia> \
  --output artifacts/builds.updated.json
```

Revise e substitua `release/rc-0.11.0/builds.json` por PR.

## 4. Executar matriz e suítes

Use contas sintéticas. Para cada aparelho e suíte, gere uma cópia atualizada:

```bash
npm run rc011:evidence:record -- \
  --kind device \
  --id android-mainstream \
  --status passed \
  --evidence-url https://<evidencia> \
  --operator release-operator \
  --output artifacts/device-matrix.updated.json
```

Para suítes, use `--kind suite`. Nunca inclua nomes, e-mails, registros emocionais, medicamentos ou informações de crise nas notas e evidências.

## 5. Publicar OTA de validação

No workflow `RC 0.11 Homologation`, execute `publish-ota-validation`. O comando publica no canal `rc-0-11`, ambiente EAS `preview` e runtime `0.11.0`.

Instale ou reinicie a RC, confirme o recebimento e aplique a captura ao registro OTA:

```bash
npm run rc011:capture:apply -- \
  --kind ota \
  --capture artifacts/ota-publish-capture.json \
  --evidence-url https://<captura-do-workflow> \
  --output artifacts/ota-validation.captured.json
```

Depois do teste físico, registre a decisão separadamente:

```bash
npm run rc011:evidence:record -- \
  --kind ota-publish \
  --status passed \
  --source artifacts/ota-validation.captured.json \
  --evidence-url https://<evidencia-do-aparelho> \
  --operator release-operator \
  --output artifacts/ota-validation.published.json
```

## 6. Validar rollback

Execute `rollback-ota-validation` informando o group ID publicado. Confirme que a versão anterior ou embedded volta a carregar sem perda de dados, aplique a captura e registre o resultado:

```bash
npm run rc011:capture:apply -- \
  --kind ota \
  --capture artifacts/ota-rollback-capture.json \
  --source artifacts/ota-validation.published.json \
  --evidence-url https://<captura-do-workflow> \
  --output artifacts/ota-validation.rollback-captured.json

npm run rc011:evidence:record -- \
  --kind ota-rollback \
  --status passed \
  --source artifacts/ota-validation.rollback-captured.json \
  --evidence-url https://<evidencia-do-aparelho> \
  --operator release-operator \
  --output artifacts/ota-validation.approved.json
```

## 7. Consolidar decisão

Depois de versionar os registros revisados:

```bash
npm run rc011:homologation:capture
npm run rc011:decision:package
npm run rc011:homologation:promotion
npm run rc011:promotion:check
```

A promoção só pode ocorrer quando todos os comandos passarem e os gates forem aprovados no console operacional.

## 8. Evidências mínimas

- URLs HTTPS;
- build IDs e números;
- SHA-256;
- commit de origem;
- data e operador;
- resultado técnico;
- ausência de dados pessoais e clínicos.

## 9. Rollback operacional

Em caso de bloqueio:

- mantenha a candidata sem promoção;
- revogue distribuição quando necessário;
- execute rollback OTA;
- abra incidente para SEV1 ou SEV2;
- preserve capturas e manifestos por 90 dias ou mais;
- não apague dados dos aparelhos durante investigação.

**Tehkné Solutions**
