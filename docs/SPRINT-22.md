# Sprint 22 — Transição das evidências para o primeiro Android

## Objetivo

Encadear a captura externa, o PR de evidências, a revogação dos secrets temporários e o primeiro build Android da candidata `0.11.0-rc.1` sem autoaprovação ou promoção automática.

## Entregas

- workflow `RC 0.11 Release Transition`;
- fase `prepare-evidence` para inspecionar a captura e despachar o PR;
- fase `finalize-and-build` somente após merge humano;
- validação estrita do conteúdo do PR de evidências;
- revogação comprovada de `RC011_ADMIN_TOKEN` e `RC011_EXPO_TOKEN`;
- relatório sanitizado da transição;
- workflow de build reutilizável por `workflow_call`;
- validação protegida antes da solicitação Android;
- documentação e testes de regressão.

## Regras

1. A captura precisa conter três escopos `ready` e o mesmo commit de origem.
2. O PR de evidências deve alterar somente `release/rc-0.11.0/infrastructure-readiness.json`.
3. O PR precisa ser revisado e mesclado por uma pessoa.
4. O executor da finalização precisa ser administrador.
5. Os dois secrets temporários precisam desaparecer do repositório antes do build.
6. O token EAS permanente continua somente no environment protegido `rc-011-build`.
7. O Android é solicitado apenas depois de uma execução protegida de validação.
8. Build ID, URL e SHA-256 continuam obrigatórios antes da homologação.

## Estado inicial

A infraestrutura externa continua em `hold`, pois o modo `apply` do Sprint 21 ainda não foi executado. Portanto, o Sprint 22 entrega a automação, mas não produz evidências ou builds fictícios.

**Tehkné Solutions**
