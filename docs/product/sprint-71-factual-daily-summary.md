# Sprint 71 — Resumo diário factual

## Objetivo

Exibir na Home uma síntese objetiva do dia com base somente nos registros locais existentes.

## Conteúdo

- quantidade de medicações registradas entre as doses programadas para hoje;
- quantidade de práticas concluídas entre as práticas programadas para hoje;
- existência ou ausência de check-in no dia;
- horário e tipo da última atividade registrada;
- até três medicações ou práticas ainda pendentes;
- acesso ao histórico completo.

## Atualização

O card atualiza ao:

- entrar ou retornar à Home;
- concluir uma sincronização;
- registrar uma ação rápida;
- desfazer uma ação recente.

## Regras

- leitura local e disponível offline;
- nenhuma nota, pontuação ou julgamento do dia;
- nenhuma inferência sobre humor, eficácia ou segurança do tratamento;
- nenhum diagnóstico ou recomendação clínica;
- falha isolada não bloqueia o restante da Home;
- consultas não entram no resumo até existir uma fonte factual consistente de realização no fluxo diário.

## Critérios de aceite

- `home-daily-factual-summary` identifica o card;
- `home-open-daily-history` abre o histórico completo;
- contagens refletem apenas itens programados para o dia atual;
- última atividade usa o horário real do registro;
- pendências já concluídas não aparecem;
- estado vazio não inventa dados.
