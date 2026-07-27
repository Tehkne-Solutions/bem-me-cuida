# ADR 040 — fila operacional baseada em papéis e dependências

## Status

Aceito para operação somente leitura; execução e ativação permanecem bloqueadas.

## Contexto

O Sprint 35 disponibilizou um painel com revisões, gates e bloqueadores. Entretanto, uma lista de bloqueadores não determina claramente quem deve conduzir cada etapa, quais dependências impedem o avanço e qual evidência precisa existir antes da próxima decisão.

Registrar pessoas específicas criaria acoplamento organizacional, exposição desnecessária de identidade e risco de atribuições automáticas indevidas. Executar próximos passos a partir do painel também violaria a separação entre observação e mudança de estado.

## Decisão

Criar uma fila derivada do snapshot operacional com:

- identificador determinístico por pendência;
- categoria e origem;
- prioridade controlada;
- papel responsável e papel aprovador;
- dependências entre itens;
- próximo passo enumerado;
- requisito abstrato de evidência;
- estado `ready-for-human-action` ou `waiting-on-dependencies`;
- `executionAllowed: false` em todos os itens.

A fila poderá ser consultada pelos comandos exatos `/cycle012 queue`, `/cycle012 owners` e `/cycle012 next`. O workflow continuará restrito a issues, membros autorizados e checkout da `main`.

## Priorização

A ordenação considera:

1. itens sem dependências pendentes;
2. prioridade `critical`, `high`, `medium` e `low`;
3. identificador determinístico.

A visão `next` apresenta no máximo três itens desbloqueados. Ela não executa tarefas e não representa aprovação.

## Responsabilidade

Papéis são utilizados em vez de pessoas. A fila não cria assignees, não armazena login, e-mail, fingerprint ou ID de usuário. A responsabilidade permanece organizacional e precisa ser materializada por processo humano externo à fila.

## Consequências positivas

- bloqueadores tornam-se operacionalmente compreensíveis;
- dependências evitam ações fora de ordem;
- próximos passos podem ser auditados sem automação destrutiva;
- a privacidade dos revisores e operadores é preservada;
- o painel continua reversível e somente leitura.

## Consequências negativas

- a fila não resolve pendências por conta própria;
- responsáveis humanos ainda precisam ser definidos fora do artefato;
- políticas de papéis exigem manutenção quando a governança mudar;
- nenhum prazo é inferido ou inventado automaticamente.

## Alternativas rejeitadas

- criar issues automaticamente para cada blocker;
- atribuir usuários por login ou e-mail;
- executar cleanup, migrations, builds ou merges pelo comando `next`;
- usar texto livre para definir próximos passos;
- ocultar dependências e ordenar somente por severidade.

**Tehkné Solutions**
