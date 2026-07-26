# Runbook — Auditoria externa da RC 0.11.0-rc.1

## Finalidade

Verificar se os nomes e proteções exigidos pela candidata estão configurados no GitHub antes da captura formal de infraestrutura.

A auditoria não lê valores de secrets ou variables.

## Execução manual

No GitHub Actions, abra:

```text
RC 0.11 External Audit
```

Execute `Run workflow` e mantenha `tracking_issue=27`.

Alternativamente, pela central de comandos:

```text
/rc011 audit-external
```

Quando comentários não dispararem eventos, use:

```text
Actions → RC 0.11 Command Center → Run workflow
command=/rc011 audit-external
tracking_issue=24
```

## O que é verificado

- presence de `rc-011-build`;
- presence de `rc-011-homologation`;
- variables públicas exigidas no repositório;
- variables exigidas em cada environment;
- nome `EXPO_TOKEN` em cada environment;
- revisores obrigatórios configurados;
- disponibilidade das APIs administrativas ao token do workflow.

## Resultados

### `hold`

Indica environment ausente, nome ausente, proteção incompleta ou API não acessível. Corrija o bootstrap e repita a auditoria.

### `ready-for-capture`

Indica que a estrutura nominal está completa e consultável. Ainda é necessário:

1. validar valores reais pelos workflows protegidos;
2. fornecer evidências HTTPS;
3. executar `RC 0.11 Infrastructure Readiness` com `action=capture`;
4. revisar e mesclar o PR de evidências.

## Artefatos

```text
bemmecuida-0.11.0-rc.1-external-audit.json
bemmecuida-0.11.0-rc.1-external-audit.md
```

Os artefatos contêm nomes, contagens e flags. Não contêm valores.

## Correção de bloqueadores

Use o pacote:

```bash
npm run rc011:bootstrap:check
```

Depois execute `bootstrap.sh` ou `bootstrap.ps1` com GitHub CLI autenticado e permissão administrativa.

Revise manualmente os revisores obrigatórios e configure no Supabase Auth:

```text
bemmecuida-rc011://auth/callback
bemmecuida-rc011://reset-password
```

## Segurança

- não copie tokens para issues;
- não publique valores de variables;
- não publique chaves administrativas;
- não use dados reais de usuários como evidência;
- preserve os relatórios anteriores quando corrigir a configuração.

**Tehkné Solutions**
