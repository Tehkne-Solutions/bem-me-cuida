# Sprint 36 — fila operacional de pendências e matriz de responsáveis

## Objetivo

Transformar os bloqueadores do painel do ciclo 0.12.0 em uma fila operacional priorizada, baseada em papéis e dependências, sem atribuir pessoas ou executar qualquer próximo passo automaticamente.

## Entregas

- matriz versionada de papéis responsáveis e aprovadores;
- prioridades `critical`, `high`, `medium` e `low`;
- dependências explícitas entre pendências;
- próximos passos enumerados e requisitos de evidência;
- geração de fila em JSON e Markdown;
- agrupamento por papel responsável;
- seleção determinística de até três próximos passos desbloqueados;
- comandos protegidos `/cycle012 queue`, `/cycle012 owners` e `/cycle012 next`;
- roteamento conjunto com os comandos do Sprint 35;
- testes, verificadores, CI e ADR.

## Regras operacionais

- os responsáveis são papéis, não identidades;
- a fila não cria assignees nem menciona usuários;
- itens com dependências pendentes permanecem `waiting-on-dependencies`;
- itens desbloqueados permanecem `ready-for-human-action`;
- `executionAllowed` e `activationAllowed` permanecem sempre `false`;
- nenhuma evidência é inventada ou capturada automaticamente.

## Estado factual

Enquanto as revisões humanas e os gates externos não estiverem completos, a fila permanece `blocked-work-queue-open` e recomenda `resolve-operational-pendencies`.

Mesmo quando a fila estiver vazia, o único resultado permitido é `prepare-human-proposal-review`; a ativação continua dependente de decisão e merge humanos.

## Privacidade

A fila não contém dados pessoais, clínicos, conteúdo do Diário, feedback bruto, secrets, fingerprints, identidades ou atribuições a pessoas.

**Tehkné Solutions**
