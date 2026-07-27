# ADR 049 — Autorização para preparar PR sem execução

## Status

Aceito no Sprint 45.

## Contexto

O ciclo 0.12.0 já possui diagnóstico, propostas, decisões, planos de correção e validação dos planos. Ainda faltava separar a autorização humana para preparar um futuro pull request da autorização para alterar código, executar correções ou integrar mudanças.

## Decisão

Introduzir um registro imutável `prepare-correction-pull-request` que somente pode referenciar um plano classificado como `current-and-compatible` no commit indicado. O registro permite preparar metadados administrativos de um PR futuro, mas não contém patch, conteúdo substituto ou comandos.

## Controles

- `pullRequestPreparationAllowed=true`;
- `patchGenerationAllowed=false`;
- `sourceMutationAllowed=false`;
- `executionAllowed=false`;
- `correctionAuthorized=false`;
- `mergeAllowed=false`;
- `activationAllowed=false`;
- revisão humana obrigatória.

## Consequências

Uma autorização válida ainda não constitui aprovação técnica da correção. Qualquer alteração funcional exigirá outro sprint, branch e PR com revisão e CI próprios.
