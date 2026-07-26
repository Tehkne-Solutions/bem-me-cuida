# Sprint 13 — Governança pós-produção e ciclo 0.11.0

## Objetivo

Transformar a operação técnica criada nos Sprints 10 a 12 em um sistema de governança contínua, com indicadores de confiabilidade, orçamento de erro, pós-incidentes, ações corretivas, capacidade, custo, manutenção, dependências e planejamento do próximo ciclo.

## Escopo entregue

- catálogo de SLOs por serviço;
- medições agregadas e orçamento de erro;
- classificação por burn rate;
- pós-incidentes ligados aos incidentes de produção;
- aprovação independente dos relatórios;
- ações corretivas com prioridade, responsável, prazo e evidência;
- snapshots de capacidade e custo em BRL;
- calendário de manutenção com aprovação por quatro-olhos;
- revisões de dependências;
- ciclo de produto `0.11.0` com aprovação e máquina de estados;
- console executivo autenticado;
- relatório executivo JSON e Markdown;
- migrations, RLS, RPCs auditadas, testes Node e pgTAP.

## Limites de privacidade

O módulo não coleta nem processa:

- textos do Diário;
- emoções;
- diagnósticos;
- medicamentos;
- contatos de confiança;
- nomes, e-mails ou identificadores de aparelho em relatórios executivos.

Capacidade, custo e SLOs trabalham somente com números agregados.

## SLOs iniciais recomendados

| Serviço | Objetivo | Janela |
|---|---:|---:|
| Sessões sem falha | 99% | 30 dias |
| Sincronização | 97% | 30 dias |
| Autenticação | 98% | 30 dias |
| Entrega de notificações | 95% | 30 dias |

Os valores são parâmetros operacionais iniciais e devem ser revisados após dados reais de produção.

## Gates do ciclo 0.11.0

O ciclo não deve ser enviado para aprovação enquanto houver:

- incidente SEV1 ou SEV2 aberto;
- ação corretiva crítica aberta;
- ação de alta prioridade vencida;
- dependência de segurança pendente;
- SLO crítico;
- janela de manutenção futura sem aprovação.

## Validação esperada

```bash
npm install
npm run release:check
npm run typecheck
npm run lint
npm run test
npm run governance:report
npm run supabase:start
npm run supabase:test
npm run supabase:lint
npm run supabase:stop
```

## Homologação posterior

- executar o fluxo Maestro com conta operacional sintética;
- criar SLOs com dados agregados reais;
- validar aprovação com duas contas distintas;
- conferir formatação monetária em pt-BR;
- revisar o primeiro relatório executivo;
- aplicar migrations no Supabase de homologação antes da produção.

**Tehkné Solutions**
