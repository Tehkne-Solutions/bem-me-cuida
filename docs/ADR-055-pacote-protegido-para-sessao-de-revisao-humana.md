# ADR 055 — Pacote protegido para sessão de revisão humana

## Status

Aceito.

## Contexto

Uma autorização validada para revisão administrativa ainda não deve iniciar a sessão nem expor conteúdo operacional.

## Decisão

Adotar um pacote determinístico e imutável contendo apenas contexto, referências, perguntas, checklist, campos de decisão e riscos. A geração exige registro `current-and-compatible` e mantém todas as ações operacionais fechadas.

## Consequências

- a revisão recebe contexto consistente;
- nenhum patch ou comando é exposto;
- a sessão continua dependente de ação humana posterior;
- mudanças de estado invalidam o pacote futuro;
- o ciclo permanece fail-closed.
