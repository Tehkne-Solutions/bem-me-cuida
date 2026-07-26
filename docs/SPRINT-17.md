# Sprint 17 — Infraestrutura externa da RC 0.11.0

## Objetivo

Tornar verificável a configuração externa necessária para executar builds e homologação da candidata `0.11.0-rc.1`, sem armazenar secrets no repositório e sem considerar declarações informais como evidência.

## Entregas

- registro versionado de prontidão externa;
- workflow manual para validar e capturar os environments;
- verificação da presença do `EXPO_TOKEN` sem ler seu valor;
- validação das variables públicas do EAS, Supabase e ciclo;
- confirmação dos callbacks da variante `rc011`;
- capturas JSON separadas para build, homologação e serviços;
- consolidação em cópia revisável;
- relatório JSON/Markdown com recomendação `hold` ou `ready`;
- checks estruturais no CI público;
- runbook e ADR.

## Critérios de conclusão

- `release:check` inclui o Sprint 17;
- CI público valida estrutura e gera relatório `hold` com registros pendentes;
- workflow não imprime ou persiste o valor de secrets;
- capturas aprovadas exigem evidência HTTPS e commit de origem;
- os três escopos precisam apontar para o mesmo commit;
- somente um PR revisado pode substituir o registro oficial;
- a promoção da RC continua sob autoridade dos gates e RPCs do Supabase.

## Estado inicial

Os environments, serviços e callbacks permanecem `pending` até o workflow protegido ser executado com configuração real. A produção continua em `0.10.0`.

**Tehkné Solutions**
