# ADR 051 — Pacote administrativo de PR sem operação

## Status

Aceito.

## Contexto

Uma autorização humana validada ainda não deve produzir branch funcional, patch ou PR automaticamente. É necessário separar a preparação de metadados da implementação.

## Decisão

Adotar um pacote imutável e determinístico contendo apenas título, resumo, referências, escopo permitido, checklist e notas de risco. A geração exige autorização `current-and-compatible` e mantém todos os controles operacionais fechados.

## Consequências

- revisão humana recebe contexto consistente;
- nenhum conteúdo executável é produzido;
- mudanças de código exigem etapa, branch e PR posteriores;
- perda de compatibilidade invalida o uso futuro do pacote;
- o ciclo continua fail-closed.
