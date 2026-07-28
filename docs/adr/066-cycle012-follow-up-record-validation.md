# ADR 066 — validação dos registros administrativos de acompanhamento

## Status

Aceito.

## Contexto

O Sprint 61 definiu registros administrativos capazes de documentar atualizações, evidências, bloqueios e encerramento de itens pós-revisão. Esses registros precisam ser validados antes de qualquer promoção administrativa.

## Decisão

Adotar um validador determinístico, somente leitura e fail-closed, com classificações controladas para obsolescência, duplicidade, conflito, incompletude, atualizações inválidas, divergência de evidências, bloqueios inválidos, encerramento inconsistente, referências incorretas e conteúdo operacional proibido.

A integridade interna deve ser avaliada antes de duplicidade e conflito.

## Consequências

- apenas registros `current-and-compatible` podem seguir para uma etapa administrativa posterior;
- encerramentos inconsistentes são rejeitados;
- nenhuma permissão operacional é concedida;
- revisão humana continua obrigatória.
