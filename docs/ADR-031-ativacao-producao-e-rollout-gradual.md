# ADR-031 — ativação de produção e rollout gradual

## Decisão

A promoção da `0.11.0-rc.1` será tratada como uma sequência de estados versionados, não como um único comando de publicação.

São autoridades independentes:

1. decisão técnica final da candidata;
2. três atestações humanas com responsáveis distintos;
3. environment protegido de produção;
4. rascunho da release;
5. builds oficiais com checksum;
6. aprovação das lojas;
7. observações agregadas de cada estágio do rollout.

## Identidade mínima dos aprovadores

O repositório armazena somente um fingerprint SHA-256 do principal operacional. A evidência HTTPS preserva a trilha de auditoria sem gravar nome ou e-mail nos registros da release.

## Rollout

A sequência é fixa:

```text
1 → 5 → 10 → 25 → 50 → 100
```

Não é permitido pular estágio. Cada estágio exige observação revisada por PR. Uma regressão produz `pause-required`; não existe avanço automático.

## Thresholds iniciais

- sessões sem crash: pelo menos 99%;
- sincronização bem-sucedida: pelo menos 97%;
- autenticação bem-sucedida: pelo menos 98%;
- incidentes críticos: zero;
- relatos bloqueadores de suporte: zero.

Os thresholds são operacionais e podem ser endurecidos em outro ADR. Não representam conclusão clínica.

## Segurança

- secrets permanecem nos environments;
- valores não entram em artefatos;
- a GitHub Release nasce como rascunho;
- builds, submissões e observações retornam por PR;
- nenhum workflow publica a release ou avança o rollout automaticamente;
- o servidor e os consoles oficiais permanecem autoridades finais.

## Assinatura

Tehkné Solutions.
