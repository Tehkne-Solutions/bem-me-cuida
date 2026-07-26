# Runbook — Bootstrap administrativo da RC 0.11.0-rc.1

## Finalidade

Criar e corrigir a infraestrutura GitHub necessária à candidata sem copiar tokens para arquivos, issues ou inputs públicos.

## 1. Preparar as contas

Use duas contas administrativas distintas:

- executor do workflow;
- revisor obrigatório dos environments.

O revisor não pode ser a mesma conta que inicia o `apply`.

## 2. Criar secrets temporários no repositório

Em **Settings → Secrets and variables → Actions → Secrets**, cadastre:

```text
RC011_ADMIN_TOKEN
RC011_EXPO_TOKEN
```

### RC011_ADMIN_TOKEN

Use token de curta duração e escopo mínimo para:

- administrar environments;
- administrar variables;
- administrar secrets dos environments;
- consultar usuários e políticas do repositório.

Revogue o token após o bootstrap e a auditoria.

### RC011_EXPO_TOKEN

Use token EAS dedicado à candidata. O workflow copia o valor diretamente para o secret `EXPO_TOKEN` dos environments.

## 3. Configurar callbacks no Supabase

Antes do `apply`, confirme:

```text
bemmecuida-rc011://auth/callback
bemmecuida-rc011://reset-password
```

Produza uma evidência HTTPS que não exponha chaves ou sessões.

## 4. Preparar o JSON público

Use `release/rc-0.11.0/admin-bootstrap-config.example.json` como base.

Substitua:

- UUID do projeto EAS;
- URL real do Supabase;
- publishable/anon key pública;
- estado e contagens reais do ciclo;
- URL HTTPS da evidência do ciclo.

O JSON não pode conter tokens, chaves administrativas ou dados pessoais/clínicos.

## 5. Executar o plano

Abra:

```text
Actions → RC 0.11 Admin Bootstrap → Run workflow
```

Use:

```text
action=plan
reviewer_login=<outra-conta-admin>
configuration_json=<json-público>
tracking_issue=27
```

O plano não modifica recursos externos.

## 6. Executar o apply

Repita com:

```text
action=apply
reviewer_login=<outra-conta-admin>
configuration_json=<json-público>
build_evidence_url=https://...
homologation_evidence_url=https://...
services_evidence_url=https://...
tracking_issue=27
```

O workflow deverá:

1. criar ou atualizar `rc-011-build`;
2. criar ou atualizar `rc-011-homologation`;
3. ativar revisão obrigatória e impedir autoaprovação;
4. permitir implantação apenas pela branch `main`;
5. cadastrar as variables públicas no repositório;
6. cadastrar as variables em cada environment;
7. cadastrar `EXPO_TOKEN` em cada environment;
8. publicar relatório sem valores;
9. disparar a auditoria externa;
10. disparar a captura protegida da infraestrutura.

## 7. Revisar resultados

Baixe os artefatos:

```text
rc011-admin-bootstrap-plan-<run_id>
rc011-admin-bootstrap-result-<run_id>
```

Revise a issue #27 e aguarde:

- auditoria externa;
- captura protegida;
- artefato consolidado da infraestrutura.

## 8. Abrir o PR de evidências

Use o run ID da captura no workflow:

```text
RC 0.11 Evidence PR
```

Primeiro `inspect`, depois `open-pr`.

## 9. Encerrar o bootstrap

Após o merge do estado `ready`:

1. revogue `RC011_ADMIN_TOKEN` na origem;
2. remova o secret `RC011_ADMIN_TOKEN` do repositório;
3. mantenha `RC011_EXPO_TOKEN` somente se houver política formal de rotação; caso contrário, remova-o também;
4. preserve apenas `EXPO_TOKEN` nos environments protegidos;
5. execute novamente `RC 0.11 External Audit`;
6. solicite o primeiro build Android somente após a recomendação correta.

## Falha segura

O workflow deve falhar sem mutações parciais intencionais quando:

- o executor não for admin;
- o revisor for o próprio executor;
- algum secret temporário estiver ausente;
- o JSON contiver formato inválido ou material privilegiado;
- uma evidência não usar HTTPS;
- a API administrativa rejeitar uma operação.

Nenhum resultado de falha aprova infraestrutura, gates ou builds.

**Tehkné Solutions**
