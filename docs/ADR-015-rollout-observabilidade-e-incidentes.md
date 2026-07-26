# ADR-015 — Rollout, observabilidade agregada e incidentes

## Status

Aceito no Sprint 11.

## Contexto

O BemMeCuida trata informações emocionais e de saúde. A publicação precisa ser acompanhada sem transformar conteúdo sensível em telemetria operacional e sem permitir que um cliente mobile execute ações administrativas irrestritas.

## Decisão

### 1. Separação entre produto e operação

O aplicativo continua armazenando e sincronizando dados do titular no escopo da própria conta. A operação de release utiliza tabelas independentes e não consulta conteúdo emocional para aprovar uma onda.

### 2. Métricas agregadas

`production_health_snapshots` aceita apenas números, percentuais, contagens e janelas de tempo. Não há coluna de texto livre para contexto de sessão ou usuário.

Os únicos textos operacionais ficam em incidentes e notas de submissão, com orientação explícita para conter somente contexto técnico.

### 3. Autoridade do servidor

A interface calcula uma prévia dos bloqueadores, mas `operator_advance_rollout` revalida atomicamente:

- estado do rollout;
- crescimento do percentual;
- leitura recente;
- limites técnicos;
- bloqueadores;
- incidentes críticos.

A regra não depende do estado visual do cliente.

### 4. RBAC

O papel vem de `auth.jwt() -> app_metadata -> role` e aceita somente:

- `release_operator`;
- `release_admin`.

`user_metadata` não concede acesso. A atribuição do papel ocorre fora do aplicativo.

### 5. Rollout progressivo

A sequência inicial é fixa em `1, 5, 10, 25, 50 e 100%`. Uma nova sequência exige migration, revisão dos testes e atualização do runbook.

### 6. Rollback

O rollback é explícito, exige justificativa e marca tanto o rollout quanto a candidata. A remoção ou interrupção efetiva na loja continua sendo uma ação externa e deve seguir o runbook.

### 7. Auditoria

Submissões, ondas, leituras, incidentes e rollbacks registram eventos no `operator_audit_log`.

## Alternativas rejeitadas

- usar `service_role` no aplicativo;
- enviar logs automáticos com texto livre;
- avançar rollout somente com validação do cliente;
- liberar 100% imediatamente após o build;
- misturar feedback emocional e métricas técnicas;
- automatizar submissão sem credenciais protegidas e revisão humana.

## Consequências

### Positivas

- menor exposição de dados sensíveis;
- rollback rastreável;
- avanço reproduzível;
- auditoria por operador;
- operação compatível com instalação gradual.

### Custos

- exige conta operacional separada;
- depende de fontes externas para métricas agregadas;
- requer registro manual ou integração administrativa futura;
- não elimina homologação física nem revisão nos consoles das lojas.

**Tehkné Solutions**
