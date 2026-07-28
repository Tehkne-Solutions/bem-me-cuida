# Sprint 60 — Validação dos pacotes pós-revisão

## Objetivo

Validar, de forma determinística e somente leitura, os pacotes administrativos de encaminhamento pós-revisão do ciclo 0.12.0.

## Classificações

- `current-and-compatible`
- `stale-execution-record-validation`
- `duplicate-package`
- `conflicting-package`
- `incomplete-package`
- `missing-owner`
- `invalid-priority-or-status`
- `completion-criteria-divergence`
- `source-package-missing`
- `invalid-package-reference`
- `forbidden-operational-content`

## Regras

A validação exige referência ao registro de execução e ao commit de validação vigentes, todas as seções obrigatórias, responsáveis preenchidos, prioridades e estados permitidos e correspondência exata entre itens e critérios de conclusão.

Problemas internos do pacote são classificados antes da comparação por duplicidade ou conflito.

## Limites

O validador não cria branch funcional, patch, migration, PR operacional ou alteração de código. Execução, correção, merge funcional e ativação permanecem bloqueados. A revisão humana continua obrigatória.
