# ADR 053 — Autorização humana para revisão administrativa

## Status

Aceito.

## Contexto

Um pacote administrativo válido ainda não deve iniciar revisão operacional automaticamente. É necessário registrar separadamente a decisão humana de que o pacote pode seguir para uma etapa posterior de revisão.

## Decisão

Adotar uma autorização imutável e determinística que exige pacote `current-and-compatible`, decisão explícita, identidade do revisor, data e referências vigentes. A autorização registra somente a intenção administrativa.

## Consequências

- a decisão humana fica auditável;
- nenhuma revisão operacional é iniciada;
- branch, PR, patch e implementação continuam bloqueados;
- perda de compatibilidade exige nova validação;
- o ciclo permanece fail-closed.
