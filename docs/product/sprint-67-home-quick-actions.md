# Sprint 67 — Ações rápidas na Home

## Objetivo

Permitir que a pessoa registre, diretamente na tela Hoje, a tomada de uma medicação programada ou a conclusão de uma prática de cuidado.

## Regras

- somente itens ainda pendentes exibem ação rápida;
- cada gravação exige confirmação explícita;
- a ação usa os mesmos repositórios e regras de estoque das telas completas;
- a Home atualiza o progresso após o sucesso sem aguardar sincronização remota;
- falhas preservam o estado anterior e exibem mensagem recuperável;
- consultas, estoque e check-in continuam apenas como navegação;
- não há alteração de prescrição, diagnóstico ou recomendação clínica.

## Critérios de aceitação

- [x] medicação pendente pode ser marcada como tomada na Home;
- [x] prática pendente pode ser marcada como concluída na Home;
- [x] há confirmação antes da gravação;
- [x] ações duplicadas ficam bloqueadas durante o salvamento;
- [x] a fila e o progresso são recalculados após o sucesso;
- [x] erro de gravação não remove nem conclui o item;
- [x] as ações completas continuam acessíveis pelas telas de origem.
