# ADR 058 — Validação das autorizações de início de sessão humana

## Status

Aceito.

## Decisão

As autorizações serão validadas de forma determinística, somente leitura e fail-closed contra o pacote de sessão e o commit de validação vigentes.

A validação detectará autorização ausente, referência inválida, decisão divergente, validação obsoleta, duplicidade e conflito.

## Consequências

A classificação `current-and-compatible` não inicia a sessão e não concede permissão operacional. Todas as ações funcionais continuam bloqueadas e dependentes de revisão humana explícita.
