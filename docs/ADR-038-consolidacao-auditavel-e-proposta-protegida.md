# ADR 038 — consolidação auditável e proposta protegida de ativação

## Status

Aceito para preparação; ativação do ciclo continua bloqueada.

## Contexto

O Sprint 33 permite capturar revisões humanas pseudonimizadas em PRs separados. Faltava um mecanismo determinístico para consolidar essas revisões por commit, impedir mistura entre versões do desenho e cruzar o resultado com os gates externos da versão `0.11.0`.

Uma revisão técnica completa não significa que o ciclo pode ser ativado. Publicação, rollout, observação, limpeza operacional, feedback agregado e aprovações formais continuam sendo condições independentes.

## Decisão

Adotar dois artefatos separados:

1. **Consolidação de revisões** — resume trilhas aprovadas, revisores distintos, riscos residuais, pedidos de mudança e gates externos;
2. **Proposta de ativação** — só pode receber estado `ready-for-human-review` quando a consolidação estiver `ready-for-human-activation-proposal`.

Ambos mantêm `activationAllowed: false`. A proposta não é uma ativação e não concede permissão para migrations ou implementação.

## Regras

- todas as revisões precisam apontar para o mesmo SHA completo;
- arquitetura, segurança, privacidade, acessibilidade e banco precisam passar;
- são necessários pelo menos três revisores distintos;
- segurança e privacidade devem ter revisores diferentes;
- qualquer `changes-required` bloqueia o pacote;
- todos os gates externos precisam estar concluídos;
- somente URLs HTTPS sanitizadas podem ser usadas como evidência;
- o workflow pode abrir PR, mas não pode fazer merge ou ativar o ciclo.

## Consequências positivas

- revisão e operação deixam de ser confundidas;
- o resultado é reproduzível por commit;
- alterações posteriores invalidam naturalmente revisões de commits antigos;
- a auditoria não depende de nomes, e-mails ou IDs brutos;
- uma proposta prematura permanece factual e explicitamente bloqueada.

## Consequências negativas

- novas alterações no desenho exigem novas revisões;
- o processo depende de revisores humanos distintos;
- gates externos continuam exigindo execução e evidências reais;
- a ativação permanece uma ação posterior e independente.

## Alternativas rejeitadas

- considerar CI verde como aprovação do ciclo;
- reutilizar revisões de commits diferentes;
- gerar migrations quando as revisões terminarem;
- ativar automaticamente após a consolidação;
- persistir usernames ou comentários livres nos artefatos.

**Tehkné Solutions**
