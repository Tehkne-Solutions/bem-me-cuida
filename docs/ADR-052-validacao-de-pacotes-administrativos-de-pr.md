# ADR 052 — Validação de pacotes administrativos de PR

## Status

Aceito.

## Contexto

Pacotes administrativos podem deixar de representar a autorização vigente ou carregar conteúdo incompatível com a separação entre metadados e implementação.

## Decisão

Adotar validação determinística e somente leitura, comparando referências, commit de validação, escopo, duplicidades, conflitos e conteúdo proibido. Nenhuma classificação libera operação.

## Consequências

- pacotes obsoletos deixam de avançar silenciosamente;
- escopo divergente é detectado antes da revisão humana;
- conteúdo semelhante a patch ou comando é bloqueado;
- nenhuma branch funcional ou PR é criado;
- o ciclo permanece fail-closed.
