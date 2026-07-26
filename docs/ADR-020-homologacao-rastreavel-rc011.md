# ADR-020 — Homologação rastreável da RC 0.11.0

## Status

Aceito.

## Contexto

O Sprint 15 criou a variante nativa e os gates da candidata, mas builds, aparelhos, OTA e rollback dependem de ambientes externos. Marcar esses itens diretamente no repositório sem captura verificável criaria risco de promoção por declaração informal.

## Decisão

A homologação será baseada em artefatos intermediários:

1. o workflow protegido consulta o build pelo ID;
2. baixa o binário e calcula SHA-256;
3. gera uma captura JSON sem dados pessoais ou clínicos;
4. um operador revisa e aplica a captura em uma cópia do registro oficial;
5. a alteração entra por PR;
6. o pacote de decisão calcula bloqueadores;
7. as RPCs do Supabase continuam responsáveis pela promoção.

A mesma separação é aplicada a publicação OTA, rollback, matriz de aparelhos e suítes funcionais.

## Consequências positivas

- evidências reproduzíveis;
- ausência de aprovação automática;
- histórico Git das decisões;
- checksum do artefato efetivamente testado;
- separação entre credenciais, execução e aprovação;
- bloqueio explícito quando dados estiverem pendentes.

## Consequências negativas

- mais passos operacionais;
- necessidade de revisão e PR para consolidar resultados;
- dependência de environments protegidos e contas EAS reais.

## Controles

- environments `rc-011-build` e `rc-011-homologation`;
- `EXPO_TOKEN` somente em secrets externos;
- URLs de evidência obrigatoriamente HTTPS;
- contas sintéticas nos testes;
- notas rejeitadas quando contêm indícios de dados pessoais ou clínicos;
- nenhum uso de `service_role` no cliente ou workflows.

## Assinatura

**Tehkné Solutions**
