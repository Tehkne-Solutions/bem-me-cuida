# Sprint 16 — Homologação operacional da RC 0.11.0

## Objetivo

Transformar os artefatos e checklists do Sprint 15 em uma operação rastreável para capturar builds reais, executar OTA de validação, registrar evidências físicas e produzir uma recomendação formal de promoção.

## Entregas

- workflow manual protegido `RC 0.11 Homologation`;
- consulta e download de builds EAS por ID;
- SHA-256 calculado sobre o APK ou IPA baixado;
- captura técnica de publicação e rollback EAS Update;
- registros versionados de builds e OTA;
- geração revisável de evidências para aparelhos e suítes;
- validação estrutural, de captura e de promoção;
- pacote JSON e Markdown com recomendação `hold` ou `promote`;
- política explícita de evidências sem dados pessoais ou clínicos;
- integração ao `release:check` e ao CI.

## Princípios

1. Um build concluído não equivale a um build homologado.
2. Resultado físico só pode mudar de `pending` com evidência técnica.
3. Arquivos gerados pelo workflow são revisados antes de entrar na árvore Git.
4. Nenhum workflow altera automaticamente gates ou estado do ciclo.
5. O Supabase permanece como autoridade da promoção.
6. Produção `0.10.0` continua intacta até aprovação formal do ciclo `0.11.0`.

## Fora do escopo automático

- criação do environment e secrets no GitHub;
- execução de builds sem `EXPO_TOKEN`;
- instalação em aparelhos físicos;
- aprovação humana dos gates;
- publicação em lojas;
- uso de informações reais de saúde em testes.

## Assinatura

**Tehkné Solutions**
