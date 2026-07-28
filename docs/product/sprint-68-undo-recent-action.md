# Sprint 68 — Desfazer registro recente

## Objetivo

Permitir corrigir imediatamente uma tomada de medicação ou conclusão de prática registrada por engano na tela Hoje.

## Regras

- somente o último registro rápido da sessão atual pode ser desfeito;
- a reversão é permitida enquanto o registro ainda não foi sincronizado;
- o item volta à fila de pendências e o progresso diário é recalculado;
- uma tomada desfeita restaura o estoque usando a mesma quantidade por dose;
- a operação remove o envio pendente correspondente da fila de sincronização;
- registros já sincronizados devem ser revisados pela tela completa;
- falhas preservam o registro original e exibem mensagem recuperável.

## Critérios de aceitação

- [x] tomada recém-registrada pode ser desfeita;
- [x] prática recém-concluída pode ser desfeita;
- [x] estoque é restaurado quando aplicável;
- [x] progresso e prioridade retornam ao estado anterior;
- [x] envio pendente do registro removido é cancelado;
- [x] registros sincronizados não são apagados silenciosamente;
- [x] a Home informa claramente sucesso, limite ou falha da reversão.
