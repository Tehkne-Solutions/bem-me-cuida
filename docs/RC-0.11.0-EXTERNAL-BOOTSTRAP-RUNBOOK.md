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
RC011_BACKLOG_BLOCKED
RC011_SCOPE_PENDING
RC011_EXPERIMENTS_RUNNING
RC011_REQUIRED_GATES
RC011_PASSED_GATES
RC011_CYCLE_EVIDENCE_URL
RC011_AUTH_CALLBACKS
RC011_AUTH_CALLBACKS_CONFIGURED
```

Use os valores reais aprovados pelo console operacional. Não preencha gates como aprovados sem evidência.

### Escopo de repositório

As variables públicas necessárias aos jobs de validação são cadastradas também no escopo do repositório:

```text
EAS_PROJECT_ID
RC011_SUPABASE_URL
RC011_SUPABASE_PUBLISHABLE_KEY
RC011_CYCLE_STATUS
RC011_MILESTONE_DONE
RC011_BLOCKER_COUNT
RC011_FREEZE_READY
RC011_BACKLOG_BLOCKED
RC011_SCOPE_PENDING
RC011_EXPERIMENTS_RUNNING
RC011_REQUIRED_GATES
RC011_PASSED_GATES
RC011_CYCLE_EVIDENCE_URL
```

Isso é necessário porque os jobs públicos de preflight executam antes de entrar nos environments protegidos. São valores públicos e operacionais; nenhum secret é duplicado nesse escopo.

### Escopo dos environments

As mesmas variables são cadastradas nos environments correspondentes. O environment de homologação também recebe:

```text
RC011_AUTH_CALLBACKS
RC011_AUTH_CALLBACKS_CONFIGURED
```

O `EXPO_TOKEN` permanece somente como secret dos environments.

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

## 7. Usar a issue operacional

A trilha oficial é a issue #24. Ela deve conter apenas estados, comandos controlados e links HTTPS de evidência.

Comandos de consulta:

```text
/rc011 help
/rc011 status
```

O guia completo está em `docs/RC-0.11.0-COMMAND-CENTER.md`.

## 8. Capturar a prontidão externa

Pela interface do Actions, execute:

```text
RC 0.11 Infrastructure Readiness
```

Ou, após o Sprint 19, use na issue #24:

```text
/rc011 capture-infrastructure <source_sha> <build_evidence_https> <homologation_evidence_https> <services_evidence_https>
```

A captura exige permissão administrativa e produz:

```text
rc011-infrastructure-decision-<RUN_ID>
```

## 9. Inspecionar antes do PR

```text
/rc011 evidence-inspect <RUN_ID> <source_sha>
```

A inspeção falha quando qualquer escopo estiver `pending` ou `blocked`.

## 10. Abrir o PR de evidências

```text
/rc011 evidence-pr <RUN_ID> <source_sha>
```

O workflow:

- baixa exatamente o artefato do run informado;
- executa `rc011:infrastructure:external`;
- cria uma branch `evidence/rc011-infrastructure-<RUN_ID>`;
- altera somente o registro oficial de infraestrutura;
- abre o PR;
- dispara o CI da branch;
- comenta a issue operacional.

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

```text
/rc011 validate-build <source_sha> <cycle_evidence_https>
/rc011 build-android <source_sha> <cycle_evidence_https>
```

Depois que o EAS concluir:

```text
/rc011 collect-android <source_sha> <eas_build_uuid>
```

A captura ainda precisa ser revisada e versionada por PR antes de alterar gates.

## Rollback operacional

Quando uma captura estiver errada:

- não edite a evidência para parecer aprovada;
- marque o escopo como `blocked` em novo PR;
- revogue ou rotacione o token comprometido, quando aplicável;
- corrija o environment;
- execute nova captura com novo run ID;
- preserve o histórico anterior.

## Assinatura

**Tehkné Solutions**
