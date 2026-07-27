# ADR 034 — planejamento verificável antes da ativação do ciclo 0.12.0

## Status

Aceito para planejamento; execução bloqueada até ativação humana.

## Contexto

O Sprint 29 abriu o ciclo 0.12.0 em modo fail-closed. O escopo preliminar existe, mas transformar propostas em implementação antes do encerramento factual da 0.11.0 criaria risco de migrations prematuras, decisões sem evidência e ampliação indevida de coleta sensível.

## Decisão

Manter um backlog versionado separado do escopo e um conjunto de gates de aceitação. Cada item precisa ter:

- correspondência com um item do `scope.json`;
- papel responsável;
- classificação de dados;
- entregas e pelo menos três critérios de aceite;
- estado `blocked-awaiting-cycle-activation`;
- migrations apenas reservadas dentro da faixa 022–029.

A permissão para branches de implementação, migrations e ativação automática permanece falsa. O CI rejeita divergência entre escopo e backlog, reservas duplicadas ou migrations prematuras.

## Consequências

### Positivas

- planejamento pode avançar sem simular publicação ou feedback;
- critérios de aceite tornam a futura implementação auditável;
- privacidade e governança são verificadas no CI;
- o ciclo continua reversível antes da ativação.

### Negativas

- implementação funcional continua bloqueada;
- evidências externas e aprovação independente permanecem necessárias;
- alterações de escopo exigem atualização coordenada do backlog.

## Alternativas rejeitadas

- iniciar migrations vazias para reservar números;
- criar branches de produto antes da ativação;
- incluir texto bruto de feedback como justificativa;
- liberar implementação automaticamente quando o CI estiver verde.

**Tehkné Solutions**
