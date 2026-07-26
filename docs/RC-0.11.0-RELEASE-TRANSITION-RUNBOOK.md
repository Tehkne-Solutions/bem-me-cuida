# Runbook — Transição da RC 0.11.0-rc.1 para o primeiro Android

## Pré-requisitos

Antes desta transição, conclua o `RC 0.11 Admin Bootstrap` em modo `apply` e obtenha:

- run ID da captura protegida;
- commit usado na captura;
- três evidências HTTPS;
- auditoria externa sem bloqueadores;
- issue operacional #24 ou #27 atualizada.

## Fase 1 — Preparar o PR de evidências

Abra:

```text
Actions → RC 0.11 Release Transition → Run workflow
```

Use:

```text
action=prepare-evidence
infrastructure_run_id=<run-da-captura>
capture_source_commit=<sha-da-captura>
evidence_pr_number=0
cycle_evidence_url=https://...
tracking_issue=24
```

O workflow:

1. baixa somente o artefato `rc011-infrastructure-decision-<run_id>`;
2. valida o registro com `rc011:infrastructure:external`;
3. confirma que todos os escopos apontam para o SHA informado;
4. procura um PR já criado para aquele run;
5. quando necessário, despacha `RC 0.11 Evidence PR` com `open-pr`;
6. publica um relatório `await-evidence-merge`.

## Revisão humana obrigatória

No PR criado, confirme:

- somente `release/rc-0.11.0/infrastructure-readiness.json` foi alterado;
- build, homologação e serviços estão `ready`;
- as três evidências são HTTPS e revisáveis;
- todos os checks estão aprovados;
- o mesmo commit de origem aparece nos três escopos;
- nenhuma informação pessoal, clínica ou secreta foi adicionada.

Depois do CI verde, mescle manualmente o PR.

## Fase 2 — Finalizar e solicitar Android

Execute novamente:

```text
action=finalize-and-build
infrastructure_run_id=<run-da-captura>
capture_source_commit=<sha-da-captura>
evidence_pr_number=<pr-mesclado>
cycle_evidence_url=https://...
tracking_issue=24
```

A conta executora precisa ter permissão administrativa. No início da execução, `RC011_ADMIN_TOKEN` ainda precisa existir como secret do repositório.

O workflow deverá:

1. consultar o PR pela API;
2. exigir estado `MERGED`, base `main` e merge commit válido;
3. rejeitar qualquer arquivo além do registro de infraestrutura;
4. fazer checkout do merge commit;
5. executar `security:check`, `release:check` e `rc011:infrastructure:external`;
6. remover `RC011_EXPO_TOKEN` e `RC011_ADMIN_TOKEN` do repositório;
7. listar novamente apenas os nomes dos secrets e comprovar a ausência;
8. gerar artefato de revogação sem valores;
9. executar o workflow oficial de build em modo `validate`;
10. após sucesso, executar o mesmo workflow em modo `build-android`.

## Aprovação do environment

O job Android entra no environment:

```text
rc-011-build
```

A revisão obrigatória continua válida. A remoção dos secrets temporários do repositório não remove o secret `EXPO_TOKEN` que já foi armazenado no environment protegido.

## Artefatos da transição

```text
rc011-release-transition-prepare-<run_id>
rc011-release-transition-final-<run_id>
```

Eles contêm:

- run da captura;
- PR e merge commit;
- nomes dos secrets revogados;
- estado da autorização do build;
- declarações de privacidade.

Eles não contêm valores de secrets ou variables.

## Depois da solicitação Android

A solicitação usa `--no-wait`. Portanto, ainda é obrigatório:

1. localizar o build no EAS;
2. registrar o build ID;
3. registrar número e perfil;
4. registrar URL do artefato;
5. baixar o APK/AAB aprovado;
6. calcular SHA-256;
7. abrir o PR de artefatos;
8. iniciar a matriz física de homologação.

## Falhas esperadas

### Captura ainda pendente

Repita auditoria e captura. Não altere o JSON manualmente.

### PR ainda aberto

Revise e mescle o PR; não tente contornar o gate.

### PR contém arquivo extra

Feche ou corrija o PR. A finalização rejeita o conjunto.

### Secret temporário ainda aparece

A transição para antes do build. Revise permissões do token administrativo e repita a finalização.

### Build aguardando aprovação

Um revisor diferente do executor deve aprovar o environment.

**Tehkné Solutions**
