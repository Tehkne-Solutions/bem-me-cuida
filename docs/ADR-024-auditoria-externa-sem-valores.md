# ADR-024 — Auditoria externa sem valores sensíveis

## Status

Aceito.

## Contexto

A candidata depende de environments, variables, secrets e regras de proteção configurados fora do Git. A integração usada pelo assistente não possui operações administrativas para criar esses recursos. O bootstrap existente depende de um operador com GitHub CLI autenticado.

Também foi observado que comentários criados por tokens de automação podem não disparar novamente o evento `issue_comment`, impedindo a homologação da central somente por integração.

## Decisão

Criar uma auditoria somente de metadados que:

1. consulta a lista de environments;
2. consulta somente os nomes de variables e secrets;
3. verifica regras de revisores obrigatórios;
4. compara os nomes encontrados ao manifesto versionado;
5. gera `hold` ou `ready-for-capture`;
6. não falha apenas porque a infraestrutura está incompleta;
7. publica relatório factual na issue #27;
8. oferece execução manual por `workflow_dispatch`.

A central de comandos também passa a aceitar execução manual com o mesmo parser e autorização usados no fluxo por comentário.

## Controles

- nenhum valor de secret é solicitado pela API;
- nenhum valor de variable é incluído no relatório;
- erros de autorização são normalizados como API indisponível;
- respostas brutas não são publicadas como artefato;
- a auditoria não modifica recursos externos;
- `ready-for-capture` não aprova gates;
- somente a captura protegida com evidências pode alterar o registro oficial.

## Consequências

### Positivas

- faltas externas tornam-se objetivas;
- a operação não depende apenas de screenshots;
- ausência de permissão administrativa é registrada sem vazamento;
- o fallback manual permite operar a central pela interface do Actions;
- o fluxo continua auditável pelas issues #24 e #27.

### Negativas

- o token do Actions pode não conseguir consultar todos os metadados;
- configuração externa ainda exige operador administrativo;
- nomes presentes não comprovam que os valores estão corretos;
- a auditoria não substitui testes de EAS, Supabase ou aparelhos físicos.

**Tehkné Solutions**
