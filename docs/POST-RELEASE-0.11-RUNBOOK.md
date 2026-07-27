# Runbook pós-release — BemMeCuida 0.11.0

## Pré-condições

- release `v0.11.0` publicada;
- rollout iniciado ou concluído nos consoles oficiais;
- environment `production-observability` protegido;
- evidências HTTPS sanitizadas;
- somente métricas agregadas.

## 1. Capturar saúde

No GitHub Actions, executar `RC 0.11 Post-release Operations` com `capture-health`.

Informar:

- commit publicado;
- janela `rolling`, `24h`, `72h` ou `7d`;
- crash-free, sync, autenticação e notificações;
- tamanho da amostra;
- quantidade de incidentes críticos, SEV2 abertos e relatos bloqueadores;
- evidência HTTPS.

Depois executar `open-evidence-pr` com o Run ID da captura.

## 2. Registrar incidente

Usar `capture-incident` com:

- ID técnico sem dados pessoais;
- severidade `sev1` a `sev4`;
- estado `open`, `contained` ou `resolved`;
- plataforma;
- categoria técnica de impacto;
- contenção recomendada;
- evidência HTTPS.

Abrir o PR por `open-evidence-pr`.

## 3. Relatórios temporais

Executar `package-report` para:

- `24h`;
- `72h`;
- `7d`;
- `current` para leitura operacional intermediária.

Resultados possíveis:

- `await-release`;
- `monitor`;
- `pause-rollout`;
- `rollback-review`;
- `ready-to-close-cycle`;
- `cycle-closed`.

Nenhum resultado executa uma ação externa.

## 4. Pausa e rollback

- `pause-rollout`: interromper avanço nos consoles oficiais e registrar decisão;
- `rollback-review`: convocar revisão humana imediata e seguir `INCIDENT-RESPONSE.md`;
- qualquer SEV1 mantém o ciclo bloqueado;
- SEV2 precisa estar resolvido antes do encerramento.

## 5. Encerramento

Depois de 24h, 72h e 7d aprovados, rollout concluído, release publicada, ausência de SEV1/SEV2 e backlog `0.12.0` preparado:

1. executar `propose-cycle-closure`;
2. abrir PR com `open-evidence-pr`;
3. revisar a evidência;
4. mesclar somente com aprovação humana;
5. limpar environments temporários em mudança separada e auditável.

## Proibições

- não incluir Diário, diagnósticos, medicamentos ou contatos;
- não incluir e-mail, ID de usuário, device ID ou IP;
- não colar tokens em inputs;
- não fechar o ciclo diretamente pela Action;
- não apagar incidentes anteriores.

**Tehkné Solutions**
