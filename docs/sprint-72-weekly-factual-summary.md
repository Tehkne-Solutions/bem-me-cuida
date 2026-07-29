# Sprint 72 — Resumo semanal factual

## Objetivo

Consolidar hoje e os seis dias anteriores usando apenas registros locais existentes.

## Conteúdo

- quantidade de medicações registradas;
- quantidade de práticas registradas;
- dias com check-in;
- dias com algum registro;
- total de registros no período;
- acesso ao histórico completo.

## Regras

- agregação direta no SQLite, sem limite da timeline;
- disponível offline;
- nenhuma nota de adesão, diagnóstico ou interpretação clínica;
- nenhuma conclusão sobre eficácia ou segurança do tratamento;
- falha isolada não bloqueia a Home.

## Critérios de aceite

- `home-weekly-factual-summary` identifica o card;
- `home-open-weekly-history` abre o histórico;
- o período inclui o dia atual e os seis anteriores;
- dias são calculados no horário local;
- registros excluídos logicamente não entram nas contagens.
