# ADR 064 — Validação dos pacotes de encaminhamento pós-revisão

## Status

Aceito.

## Contexto

O Sprint 59 definiu um pacote administrativo para organizar itens de acompanhamento sem autorizar implementação. É necessário validar esses pacotes contra o registro humano vigente e impedir referências obsoletas, estruturas incompletas ou conteúdo operacional.

## Decisão

Adotar um validador determinístico, somente leitura e fail-closed. A integridade interna — estrutura, responsáveis, prioridade, estado e critérios — tem precedência sobre duplicidade e conflito entre pacotes.

## Consequências

Pacotes incompatíveis recebem uma classificação explícita e não produzem autorização funcional. Branches funcionais, patches, migrations, PRs operacionais, execução, correção, merge e ativação permanecem bloqueados.
