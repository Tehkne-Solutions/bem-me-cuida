# ADR 062 — Validação dos registros de execução manual

## Status

Aceito.

## Contexto

Registros administrativos de sessões humanas podem tornar-se obsoletos, duplicados, conflitantes, incompletos ou inconsistentes com suas evidências.

## Decisão

Adotar um validador determinístico e fail-closed que compare cada registro com o pacote de execução e o commit de validação vigentes, verifique estrutura, decisão, evidências, referências e conteúdo proibido.

## Consequências

Somente registros classificados como `current-and-compatible` podem ser considerados administrativamente atuais. Essa classificação não autoriza correção, implementação ou qualquer ação operacional.
