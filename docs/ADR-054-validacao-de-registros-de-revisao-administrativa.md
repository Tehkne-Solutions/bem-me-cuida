# ADR 054 — Validação de registros de revisão administrativa

## Status

Aceito.

## Contexto

Registros administrativos podem deixar de representar o pacote vigente, ser duplicados ou entrar em conflito com decisões posteriores.

## Decisão

Adotar validação determinística e somente leitura, comparando tipo, referências, commit do pacote, classificação vigente, decisão, duplicidade e conflito.

## Consequências

- registros obsoletos são detectados;
- duplicidades e conflitos ficam explícitos;
- nenhuma revisão funcional é iniciada;
- nenhuma alteração de código ou operação é liberada;
- o ciclo permanece fail-closed.
