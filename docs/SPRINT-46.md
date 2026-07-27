# Sprint 46 — Validação das autorizações para preparação de PR

## Objetivo

Validar autorizações integradas do ciclo `0.12.0` contra o estado atual dos planos de correção, sem preparar PR funcional, gerar patch ou executar alterações.

## Classificações

- `current-and-compatible`
- `stale-plan-validation`
- `duplicate-authorization`
- `conflicting-authorization`
- `source-authorization-missing`
- `authorization-classification-mismatch`
- `invalid-authorization-reference`

## Regras

Uma autorização só pode ser classificada como atual quando referencia o commit de validação vigente de um plano `current-and-compatible`, usa a decisão `authorize-pr-preparation`, não possui duplicidades ou conflitos e preserva todos os controles fail-closed.

## Limites

Mesmo uma autorização atual não prepara PR, não gera patch, não altera fonte, não autoriza correção, não permite merge e não ativa o ciclo.

As migrations `022–029` continuam proibidas.
