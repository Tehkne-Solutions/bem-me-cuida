# Sprint 62 — validação dos registros administrativos de acompanhamento

## Objetivo

Validar, de forma determinística e somente leitura, os registros administrativos de acompanhamento originados por pacotes pós-revisão já validados no ciclo `0.12.0`.

## Classificações

- `current-and-compatible`
- `stale-follow-up-package-validation`
- `duplicate-record`
- `conflicting-record`
- `incomplete-record`
- `invalid-item-update`
- `evidence-divergence`
- `invalid-blocker`
- `inconsistent-closure`
- `source-record-missing`
- `invalid-record-reference`
- `forbidden-operational-content`

## Ordem de validação

1. existência e conteúdo operacional proibido;
2. tipo e referências do artefato;
3. compatibilidade com o pacote pós-revisão vigente;
4. estrutura obrigatória;
5. atualizações dos itens;
6. evidências;
7. bloqueios;
8. consistência do encerramento;
9. duplicidade e conflito.

A integridade interna tem precedência sobre comparações entre registros.

## Regras de encerramento

Um registro não pode declarar `closed-administratively` quando existe bloqueio aberto ou item ainda não classificado como `completed-administratively` ou `not-required`.

## Limites

A validação não executa tarefas, não cria branches funcionais, não gera patches, não altera código-fonte, não abre PR operacional e não autoriza correção, merge ou ativação.
