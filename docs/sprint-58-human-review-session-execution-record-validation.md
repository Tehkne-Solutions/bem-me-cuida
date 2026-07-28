# Sprint 58 — Validação dos registros de execução manual

Este sprint adiciona uma camada administrativa, determinística e somente leitura para validar registros de sessões humanas já realizadas no ciclo `0.12.0`.

## Classificações

- `current-and-compatible`
- `stale-execution-package-validation`
- `duplicate-record`
- `conflicting-record`
- `incomplete-record`
- `invalid-decision`
- `evidence-divergence`
- `source-record-missing`
- `invalid-record-reference`
- `forbidden-operational-content`

## Regras

Um registro é compatível somente quando referencia o pacote e o commit de validação vigentes, contém todas as seções obrigatórias, usa uma decisão permitida, mantém consistência entre checklist e evidências e não contém conteúdo operacional.

A validação não executa sessão, não autoriza correção e não cria branch funcional, patch, migration, PR operacional, merge ou ativação.
