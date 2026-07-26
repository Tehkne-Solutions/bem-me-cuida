# Resposta a incidentes — BemMeCuida

## Objetivo

Padronizar contenção, comunicação, investigação e recuperação de incidentes técnicos sem expor dados emocionais ou clínicos.

## Severidades

### SEV1 — crítico

- indisponibilidade ampla;
- perda, corrupção ou exposição confirmada de dados;
- autenticação ou sincronização indisponível para grande parte da base;
- comportamento que possa impedir acesso a informações essenciais do próprio usuário.

Ação: pausar rollout, abrir incidente, acionar liderança técnica e avaliar rollback imediato.

### SEV2 — alto

- falha significativa sem evidência de perda de dados;
- regressão em fluxo essencial;
- aumento relevante de falhas ou erros de sincronização.

Ação: congelar avanço, investigar e definir correção ou rollback.

### SEV3 — moderado

- falha com alternativa disponível;
- impacto localizado;
- degradação de desempenho sem perda funcional crítica.

Ação: monitorar, planejar correção e manter rollout pausado quando necessário.

### SEV4 — baixo

- problema cosmético;
- melhoria operacional;
- inconsistência sem impacto relevante.

Ação: registrar e priorizar no ciclo normal.

## Primeiros passos

1. Confirmar que o relato não contém dados pessoais ou emocionais desnecessários.
2. Abrir o incidente no console com título e impacto técnicos.
3. Associar candidata e rollout.
4. Classificar severidade.
5. Pausar o rollout quando houver dúvida sobre segurança.
6. Preservar horário, versão, build e evidências agregadas.
7. Definir responsável.

## Contenção

- pausar ou reverter rollout;
- retirar submissão ou interromper distribuição na loja quando aplicável;
- desabilitar funcionalidade somente por mecanismo aprovado e auditável;
- não pedir que usuários enviem Diário, diagnósticos ou capturas com dados sensíveis;
- não apagar logs operacionais antes da revisão.

## Comunicação

A comunicação deve informar:

- o que está indisponível;
- quais versões são afetadas;
- orientação segura e não clínica;
- quando haverá nova atualização;
- canal oficial de suporte.

Não deve:

- diagnosticar usuários;
- minimizar impacto;
- expor dados individuais;
- prometer horário sem evidência;
- atribuir culpa antes da investigação.

## Investigação

Reunir somente o necessário:

- versão e build;
- plataforma;
- horários;
- percentuais agregados;
- códigos de erro sanitizados;
- passos técnicos reproduzíveis;
- alterações recentes de banco, configuração ou release.

## Recuperação

1. Corrigir em nova branch e nova candidata.
2. Executar CI, migrations e testes E2E.
3. Homologar em aparelho.
4. Publicar nova RC.
5. Retomar em 1% ou no percentual aprovado pela revisão de risco.
6. Encerrar o incidente somente após observar estabilidade.

## Pós-incidente

Documentar:

- causa raiz;
- fatores contribuintes;
- detecção;
- tempo de contenção;
- decisões de rollback;
- ações preventivas;
- responsáveis e prazos.

A timeline do console registra mudanças de estado, mas o relatório detalhado deve permanecer em repositório administrativo protegido.

**Tehkné Solutions**
