# Sprint 21 — Bootstrap administrativo da RC 0.11

## Objetivo

Reduzir a configuração externa da candidata `0.11.0-rc.1` a uma operação manual protegida, idempotente e auditável, sem armazenar tokens ou valores de configuração nos artefatos.

## Entregas

- workflow `RC 0.11 Admin Bootstrap`;
- modos `plan` e `apply`;
- validação de conta administradora e revisor diferente do executor;
- criação ou atualização de `rc-011-build` e `rc-011-homologation`;
- revisão obrigatória e `prevent_self_review`;
- política de implantação limitada à branch `main`;
- variables públicas no repositório e nos environments;
- cópia segura do token EAS para o secret nominal `EXPO_TOKEN` dos environments;
- despacho automático da auditoria externa e da captura protegida;
- relatório sem valores de secrets ou variables;
- testes determinísticos e trava de release.

## Pré-requisitos externos mínimos

Devem ser cadastrados manualmente no escopo de secrets do repositório:

- `RC011_ADMIN_TOKEN`: token administrativo de curta duração e escopo mínimo;
- `RC011_EXPO_TOKEN`: token do EAS usado exclusivamente para os environments da candidata.

Os valores nunca devem ser incluídos em issues, inputs, logs ou arquivos.

## Limites

- o workflow não cria contas GitHub, EAS ou Supabase;
- os callbacks do Supabase precisam estar configurados antes do `apply`;
- o operador deve fornecer evidências HTTPS para build, homologação e serviços;
- o bootstrap não aprova gates e não inicia build;
- a versão de produção permanece `0.10.0`;
- a candidata permanece bloqueada até o PR de evidências ser revisado e mesclado.

**Tehkné Solutions**
