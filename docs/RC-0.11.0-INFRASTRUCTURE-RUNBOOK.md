# Runbook — Infraestrutura externa da RC 0.11.0-rc.1

## 1. Environments do GitHub

Criar:

- `rc-011-build`;
- `rc-011-homologation`.

Em ambos, configurar aprovação obrigatória e limitar os branches permitidos à `main` ou ao commit aprovado da candidata.

## 2. Secret

Adicionar em cada environment:

```text
EXPO_TOKEN
```

O token deve pertencer a uma conta operacional do projeto EAS. Nunca registrar o valor em issue, PR, log, arquivo `.env` versionado ou evidência.

## 3. Variables comuns

Configurar:

```text
EAS_PROJECT_ID
RC011_SUPABASE_URL
RC011_SUPABASE_PUBLISHABLE_KEY
RC011_CYCLE_STATUS
RC011_MILESTONE_DONE
RC011_BLOCKER_COUNT
```

Valores esperados para a execução da RC:

```text
RC011_CYCLE_STATUS=active ou frozen
RC011_MILESTONE_DONE=true
RC011_BLOCKER_COUNT=0
```

## 4. Variables dos serviços

No environment `rc-011-homologation`, configurar:

```text
RC011_AUTH_CALLBACKS=bemmecuida-rc011://auth/callback,bemmecuida-rc011://reset-password
RC011_AUTH_CALLBACKS_CONFIGURED=true
```

Confirmar no Supabase Auth que os dois callbacks estão cadastrados exatamente como acima.

## 5. Validação pública

Executar o workflow **RC 0.11 Infrastructure Readiness** com:

```text
action=validate
source_commit=<SHA aprovado de 40 caracteres>
```

Essa operação não acessa environments nem secrets.

## 6. Captura protegida

Executar novamente com:

```text
action=capture
source_commit=<mesmo SHA aprovado>
build_evidence_url=https://<evidência controlada>
homologation_evidence_url=https://<evidência controlada>
services_evidence_url=https://<evidência controlada>
```

O workflow entrará nos dois environments protegidos, verificará presença e formato e produzirá:

- captura do environment de build;
- captura do environment de homologação;
- captura dos serviços;
- registro consolidado revisável;
- relatório de decisão.

## 7. Consolidação por PR

Baixar o artefato `rc011-infrastructure-decision-*`. Revisar:

- nenhuma chave ou token presente;
- todos os checks coerentes;
- commit de origem correto;
- evidências HTTPS acessíveis;
- status `ready` somente quando todos os checks passaram.

Substituir `release/rc-0.11.0/infrastructure-readiness.json` somente por PR.

## 8. Validação final

Depois do merge do PR de evidências:

```bash
npm run rc011:infrastructure:external
npm run rc011:infrastructure:report
npm run rc011:prebuild:check
```

A infraestrutura pronta não aprova a candidata por si só. Builds, matriz física, suítes, OTA, rollback e gates continuam obrigatórios.

## 9. Falhas comuns

- secret ausente: configurar `EXPO_TOKEN` no environment correto;
- project ID inválido: copiar o UUID do projeto EAS;
- URL de Supabase placeholder: usar o projeto real da RC;
- chave pública ausente: usar somente publishable/anon, nunca `service_role`;
- callback divergente: corrigir scheme e rota no Supabase Auth;
- commits divergentes: repetir todas as capturas com o mesmo SHA;
- evidência sem HTTPS: mover para armazenamento controlado e seguro.

**Tehkné Solutions**
