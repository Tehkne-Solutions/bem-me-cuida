# ADR 056 — Validação dos pacotes de sessão de revisão humana

## Status

Aceito.

## Contexto

Pacotes de sessão podem ficar obsoletos, divergir das perguntas e do checklist aprovados ou receber conteúdo operacional incompatível com seu caráter administrativo.

## Decisão

Adotar validação determinística e somente leitura, comparando referências, commit de validação, perguntas, checklist, duplicidades, conflitos e padrões proibidos.

## Consequências

- pacotes obsoletos não avançam silenciosamente;
- divergências de perguntas e checklist são detectadas;
- conteúdo operacional é bloqueado;
- nenhuma sessão é iniciada automaticamente;
- o ciclo permanece fail-closed.
