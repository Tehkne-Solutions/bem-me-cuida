# ADR 041 — registro protegido de atualizações da fila

## Status

Aceito para captura informativa; conclusão automática proibida.

## Contexto

O Sprint 36 organizou os bloqueadores do ciclo 0.12.0 em uma fila baseada em papéis, dependências e próximos passos. Faltava um mecanismo para registrar andamento e evidências sem transformar relatos operacionais em verdade de gate ou conclusão automática.

Atualizar diretamente os artefatos de fechamento, revisão ou aprovação criaria riscos de:

- conclusão indevida de tarefas;
- alteração de gates sem revisão independente;
- perda de rastreabilidade;
- injeção de texto livre ou dados sensíveis;
- ativação acidental do ciclo.

## Decisão

Cada atualização será um artefato JSON imutável, criado por workflow manual e submetido em pull request separado.

O registro contém somente:

- SHA completo usado como referência;
- ID de uma pendência existente;
- estado de progresso não terminal;
- estado informativo de dependência;
- IDs de dependências já pertencentes ao item;
- tipo e URL HTTPS de evidência, quando aplicável;
- data UTC;
- fingerprint pseudonimizado do relator.

Não são aceitos campos de texto livre. Estados terminais são proibidos.

## Regras de efeito

Um registro integrado pode ser exibido na fila como `reportedProgress`, porém não pode modificar:

- prontidão do item;
- prioridade;
- próximo passo;
- dependências estruturais;
- gates externos;
- resultado das revisões;
- autorização de implementação, migration ou ativação.

A fonte de verdade para o estado continua sendo o conjunto de artefatos de revisão e gates externos.

## Proteções do workflow

- execução apenas por `workflow_dispatch`;
- checkout explícito da `main`;
- permissão mínima `write`, `maintain` ou `admin`;
- um único arquivo por branch;
- caminho fixo em `release/cycle-0.12.0/queue-updates`;
- PR obrigatório;
- ausência de auto-merge;
- rejeição de URLs HTTP, credenciais e hosts locais.

## Consequências positivas

- progresso rastreável sem alterar a verdade operacional;
- histórico imutável e revisável;
- evidências vinculadas a um item real da fila;
- ausência de nomes, e-mails e IDs brutos nos registros;
- compatibilidade com o painel e os comandos existentes.

## Consequências negativas

- relatos podem ficar desatualizados em relação aos gates;
- revisão humana continua obrigatória;
- um relato de resolução não remove o bloqueador até a fonte de verdade ser atualizada separadamente;
- o número de PRs operacionais pode aumentar.

## Alternativas rejeitadas

- permitir status `completed` ou `resolved` no registro;
- atualizar diretamente `cycle-closure.json`, `scope.json` ou `migration-plan.json`;
- aceitar comentários livres como evidência;
- atribuir pessoas automaticamente;
- fazer merge automático após geração do registro.

**Tehkné Solutions**
