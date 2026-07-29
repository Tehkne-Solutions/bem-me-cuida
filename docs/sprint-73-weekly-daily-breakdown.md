# Sprint 73 — Detalhamento diário da semana

## Objetivo

Mostrar como os registros dos últimos sete dias se distribuem por dia, sem gerar notas, metas ou interpretações clínicas.

## Implementação

- sete colunas fixas, incluindo dias sem registros;
- total factual de registros em cada dia;
- indicação das categorias presentes: medicação, prática e check-in;
- agregação direta no SQLite, sem depender da paginação do histórico;
- agrupamento pelo dia local do aparelho;
- atualização junto ao resumo semanal;
- funcionamento offline.

## Critérios de aceite

- `home-weekly-daily-breakdown` identifica a faixa diária;
- todos os sete dias aparecem em ordem cronológica;
- dias sem registros mostram zero e não são removidos;
- cada categoria é exibida somente quando existe ao menos um registro correspondente;
- a soma dos totais diários corresponde ao total semanal para o mesmo período;
- nenhuma conclusão clínica é produzida.
