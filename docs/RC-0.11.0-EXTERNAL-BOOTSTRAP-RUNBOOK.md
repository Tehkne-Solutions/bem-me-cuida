# Runbook — Bootstrap externo da RC 0.11.0-rc.1

## Pré-requisitos

- acesso administrativo ao repositório `Tehkne-Solutions/bem-me-cuida`;
- GitHub CLI autenticado;
- projeto EAS existente;
- projeto Supabase de homologação existente;
- `EXPO_TOKEN` válido;
- duas contas distintas para revisão operacional;
- URLs HTTPS para as evidências de configuração.

Não registre tokens, senhas, chaves administrativas, dados pessoais ou dados clínicos em arquivos, issues ou PRs.

## 1. Gerar o pacote

```bash
npm install
npm run rc011:bootstrap:bundle
npm run rc011:bootstrap:check
```

Arquivos gerados:

```text
artifacts/rc011-bootstrap/bootstrap.sh
artifacts/rc011-bootstrap/bootstrap.ps1
artifacts/rc011-bootstrap/CHECKLIST.md
artifacts/rc011-bootstrap/bundle.json
```

O pacote contém nomes e comandos, mas não contém valores de secrets.

## 2. Definir variables públicas

Antes de executar o script, defina no ambiente local:

```text
EAS_PROJECT_ID
RC011_SUPABASE_URL
RC011_SUPABASE_PUBLISHABLE_KEY
RC011_CYCLE_STATUS
RC011_MILESTONE_DONE
RC011_BLOCKER_COUNT
RC011_FREEZE_READY
RC011_SCOPE_PENDING
RC011_EXPERIMENTS_RUNNING
RC011_REQUIRED_GATES
RC011_PASSED_GATES
RC011_AUTH_CALLBACKS
RC011_AUTH_CALLBACKS_CONFIGURED
RC011_CYCLE_EVIDENCE_URL
```

Use os valores reais aprovados pelo console operacional. Não preencha gates como aprovados sem evidência.

## 3. Executar no Windows

```powershell
pwsh artifacts/rc011-bootstrap/bootstrap.ps1
```

## 4. Executar em Linux ou macOS

```bash
bash artifacts/rc011-bootstrap/bootstrap.sh
```

O GitHub CLI solicitará o `EXPO_TOKEN` separadamente em cada environment. O valor não é gravado pelo script.

## 5. Proteger os environments

No GitHub, revise:

### `rc-011-build`

- revisores obrigatórios;
- prevenção de bypass;
- branch permitida para operação;
- secret `EXPO_TOKEN`;
- variables completas.

### `rc-011-homologation`

- revisores obrigatórios;
- prevenção de bypass;
- branch permitida para operação;
- secret `EXPO_TOKEN`;
- variables completas;
- callbacks e URL de evidência do ciclo.

A criação do environment pela API não substitui a revisão manual das regras de proteção.

## 6. Configurar callbacks no Supabase Auth

Cadastre exatamente:

```text
bemmecuida-rc011://auth/callback
bemmecuida-rc011://reset-password
```

Depois ajuste:

```text
RC011_AUTH_CALLBACKS=bemmecuida-rc011://auth/callback,bemmecuida-rc011://reset-password
RC011_AUTH_CALLBACKS_CONFIGURED=true
```

## 7. Criar a issue operacional

Use o formulário:

```text
Configurar infraestrutura da RC 0.11
```

A issue deve conter apenas checkboxes e links HTTPS de evidência. Nunca inclua valores de secrets.

## 8. Capturar a prontidão externa

Execute o workflow:

```text
RC 0.11 Infrastructure Readiness
```

Parâmetros:

```text
action=capture
source_commit=<SHA aprovado>
build_evidence_url=https://...
homologation_evidence_url=https://...
services_evidence_url=https://...
```

O workflow deve produzir:

```text
rc011-infrastructure-decision-<RUN_ID>
```

## 9. Inspecionar antes do PR

Execute:

```text
RC 0.11 Evidence PR
```

Com:

```text
action=inspect
infrastructure_run_id=<RUN_ID>
source_commit=<SHA aprovado>
tracking_issue=<issue opcional>
```

A inspeção falha quando qualquer escopo estiver `pending` ou `blocked`.

## 10. Abrir o PR de evidências

Repita o workflow com:

```text
action=open-pr
```

O workflow:

- baixa exatamente o artefato do run informado;
- executa `rc011:infrastructure:external`;
- cria uma branch `evidence/rc011-infrastructure-<RUN_ID>`;
- altera somente o registro oficial de infraestrutura;
- abre o PR;
- dispara o CI da branch;
- comenta a issue operacional, quando informada.

## 11. Revisar e mesclar

Antes do merge, confirme:

- CI verde;
- três escopos em `ready`;
- mesmo commit de origem;
- evidências HTTPS válidas;
- nenhum secret presente;
- nenhum dado pessoal ou clínico;
- revisão por outra conta autorizada.

## 12. Liberar o primeiro build

Após o merge do PR de evidências:

1. execute `RC 0.11 Build` com `action=validate`;
2. execute com `action=build-android`;
3. aguarde o EAS concluir;
4. use `RC 0.11 Homologation` para capturar o build;
5. registre build ID, número, URL e SHA-256 por PR.

## Rollback operacional

Quando uma captura estiver errada:

- não edite a evidência para parecer aprovada;
- marque o escopo como `blocked` em novo PR;
- revogue ou rotacione o token comprometido, se aplicável;
- corrija o environment;
- execute nova captura com novo run ID;
- preserve o histórico anterior.

## Assinatura

**Tehkné Solutions**
