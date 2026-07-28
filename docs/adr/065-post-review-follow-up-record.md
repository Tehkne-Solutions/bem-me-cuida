# ADR 065 — Registro administrativo pós-revisão

## Status

Aceito.

## Contexto

Após a validação de um pacote de encaminhamento, é necessário registrar atualizações, evidências, bloqueios e encerramento sem transformar o acompanhamento em autorização operacional.

## Decisão

Adotar um artefato `post-review-follow-up-record` gerado de forma determinística, imutável e fail-closed. O registro só pode ser produzido a partir de um pacote classificado como `current-and-compatible`.

A integridade mínima inclui:

- identificação do registro;
- atualização de cada item com responsável, estado, data, autor e resumo;
- evidências vinculadas a itens existentes;
- bloqueios com estado controlado;
- resumo de encerramento;
- referências auditáveis ao pacote validado.

## Consequências

O histórico administrativo torna-se reproduzível e auditável. Nenhum estado do registro concede permissão para criar branch funcional, patch, alteração de código, execução, merge ou ativação.
