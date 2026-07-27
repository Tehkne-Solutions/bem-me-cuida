# ADR 045 — decisões humanas separadas da execução

## Status

Aceito para governança; execução automática proibida.

## Contexto

O Sprint 40 valida propostas e identifica se permanecem atuais e compatíveis. Transformar essa validação diretamente em execução criaria autorização automática baseada no próprio sistema.

## Decisão

As decisões humanas serão registradas em artefatos imutáveis e separados. Elas podem aceitar uma proposta para futura correção, rejeitá-la ou solicitar substituição.

Aceitar uma proposta significa apenas permitir que outro PR específico seja preparado posteriormente. Não concede autorização de alteração, merge, publicação ou ativação.

## Consequências

- separa validação, decisão e execução;
- mantém revisão humana independente;
- preserva rastreabilidade;
- impede que uma proposta compatível seja tratada como correção concluída;
- pode exigir etapas adicionais antes da implementação real.

## Alternativas rejeitadas

- executar automaticamente propostas `current-and-compatible`;
- permitir decisão em texto livre;
- alterar a proposta no mesmo PR da decisão;
- considerar aceitação como autorização de migration ou implementação;
- aplicar merge automático ao futuro PR de correção.

**Tehkné Solutions**
