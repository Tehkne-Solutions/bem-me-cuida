# ADR 068 — validação do pacote administrativo de encerramento do ciclo 0.12

## Status

Aceito.

## Contexto

O Sprint 63 introduziu um pacote administrativo capaz de consolidar decisões, acompanhamentos, pendências, riscos e critérios de transição. Antes de qualquer uso administrativo posterior, esse pacote precisa ser validado contra a fonte vigente e contra regras determinísticas.

## Decisão

Adotar um validador somente leitura com quatorze classificações controladas. A validação deve verificar estrutura, compatibilidade, fontes, decisões, acompanhamentos, itens remanescentes, riscos, critérios de transição, estado de encerramento, referências, duplicidade, conflito e conteúdo operacional proibido.

A integridade interna tem precedência sobre comparações de duplicidade e conflito.

## Consequências

- pacotes inconsistentes são rejeitados de forma fail-closed;
- estados de encerramento permanecem estritamente administrativos;
- nenhuma validação autoriza branch funcional, patch, alteração de fonte, execução, correção, merge funcional ou ativação;
- revisão humana continua obrigatória.
