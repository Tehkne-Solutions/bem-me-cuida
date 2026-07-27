# Sprint 34 — consolidação auditável e proposta protegida do ciclo 0.12.0

## Objetivo

Consolidar revisões humanas reais por commit, cruzar a completude das cinco trilhas com os gates externos do ciclo e preparar uma proposta de ativação exclusivamente para revisão humana.

## Entregas

- configuração versionada da consolidação;
- consolidador determinístico por `sourceCommit`;
- separação entre gates de revisão e gates externos;
- contagem de revisores sem persistir identidade bruta;
- registro de riscos residuais por trilha, sem texto livre;
- gerador protegido de proposta de ativação;
- workflow manual que abre PR sem auto-merge;
- testes para estados incompleto, bloqueado e apto apenas à proposta;
- verificação de migrations prematuras;
- CI dedicado, ADR e integração ao `release:check`.

## Estados possíveis

1. `review-incomplete` — trilhas, revisores ou separação ainda insuficientes;
2. `review-complete-external-gates-blocked` — revisões completas, mas a `0.11.0` ou outro gate externo permanece pendente;
3. `ready-for-human-activation-proposal` — revisões e gates externos completos, permitindo somente preparar uma proposta para revisão humana.

Nenhum estado concede ativação automática.

## Estado factual atual

A versão `0.11.0` permanece com `cycle-closure.status = blocked`. Portanto, mesmo que revisões sejam capturadas futuramente, a recomendação atual continua `hold`.

## Controles

- nenhuma migration `022–029` é criada;
- nenhuma implementação funcional é autorizada;
- nenhuma identidade bruta é persistida;
- nenhum dado pessoal, clínico, Diário, feedback bruto ou secret é incluído;
- a proposta exige PR, revisão independente e merge humano;
- o workflow não executa build, publicação, exclusão ou ativação.

**Tehkné Solutions**
