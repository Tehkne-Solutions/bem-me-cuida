# Sprint 66 — Estado Diário Unificado

## Objetivo

Transformar a tela **Hoje** em uma central priorizada do que merece atenção, reunindo medicamentos, práticas, check-in emocional, consultas e alertas de reposição.

## Priorização

A fila diária utiliza somente registros existentes no aparelho e segue esta ordem:

1. medicações atrasadas;
2. práticas pendentes com horário vencido;
3. check-in emocional ainda não realizado no dia;
4. próximas medicações;
5. próximas práticas;
6. próxima consulta agendada;
7. medicamentos com estoque baixo.

Itens com conclusão ou tomada registrada não aparecem como pendentes.

## Experiência

- hero da Home resume quantos pontos precisam de atenção;
- ação principal abre o item de maior prioridade;
- até cinco próximos passos são exibidos em ordem determinística;
- atrasos usam destaque visual sem linguagem punitiva;
- progresso de medicamentos e práticas permanece visível;
- falhas de leitura preservam o último estado válido, conforme Sprint 65;
- a ausência de pendências não é apresentada como recomendação clínica.

## Limites

A priorização é organizacional. Ela não avalia risco clínico, não modifica prescrições, não interpreta sintomas e não substitui orientação profissional.

## Critérios de aceitação

- [x] itens concluídos são excluídos da fila;
- [x] itens atrasados aparecem antes dos futuros;
- [x] check-in ausente no dia entra na fila;
- [x] próxima consulta aparece com data e horário;
- [x] estoque baixo gera alerta acionável;
- [x] a ação principal aponta para a maior prioridade;
- [x] estados de carregamento e erro continuam protegidos;
- [x] a implementação usa somente dados locais já disponíveis.
