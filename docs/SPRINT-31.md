# Sprint 31 — desenho técnico bloqueado do ciclo 0.12.0

## Objetivo

Detalhar a arquitetura, os contratos, os testes, os rollbacks e as reservas de migrations dos três itens planejados para o ciclo 0.12.0, sem iniciar implementação funcional antes da ativação humana.

## Entregas

- planos técnicos para observabilidade, operações e priorização de UX;
- contratos arquiteturais com campos permitidos e proibidos;
- limiar mínimo de agregação para métricas técnicas;
- allowlist de environments temporários e proteção explícita da produção;
- estratégia de testes e rollback por item;
- detalhamento das reservas 022–024 como `reserved-not-created`;
- verificação automática de correspondência entre backlog, contratos, planos e migrations;
- CI dedicado, testes e ADR.

## Desenhos planejados

### BMC-012-OBS-01

Métricas exclusivamente agregadas por versão, plataforma e janela temporal, sem identificadores pessoais, conteúdo do Diário ou segmentação clínica. As leituras administrativas serão protegidas por RBAC, RLS e auditoria.

### BMC-012-OPS-01

Limpeza de environments temporários baseada em allowlist, dry-run determinístico, aprovação independente e confirmação destrutiva. Environments de produção são permanentemente protegidos.

### BMC-012-UX-01

Priorização por tema, contagem, impacto e esforço, sem texto bruto. A matriz auxilia a decisão, mas não substitui aprovação humana, revisão de acessibilidade ou revisão de privacidade.

## Estado preservado

O desenho permanece `design-blocked`. Nenhuma migration 022–029 foi criada, nenhum workflow destrutivo foi habilitado e nenhuma funcionalidade do ciclo 0.12.0 foi implementada.

**Tehkné Solutions**
