# Sprint 12 — Sustentação, hotfixes e OTA

## Objetivo

Transformar a preparação de produção em uma operação sustentável, com correções auditáveis, segregação de funções, compatibilidade de runtime, rollback e retenção previsível.

## Entregas

### Console consolidado

- saúde do rollout mais recente;
- sessões sem falha, sincronização e incidentes críticos;
- fila de hotfixes;
- aprovações e estados;
- artefatos binários;
- planos OTA;
- publicação e rollback registrados;
- simulação e execução de retenção.

### Hotfixes

- tipos `ota` e `binary`;
- severidades crítica, alta, média e baixa;
- commit de origem;
- runtime e canal alvo;
- indicação de mudança nativa;
- máquina de estados auditável;
- artefatos com URL HTTPS e SHA-256.

### Aprovação independente

- criador não pode aprovar;
- decisão exige `release_admin`;
- decisão persistida em `operation_approvals`;
- servidor revalida identidade e estado;
- nenhuma atribuição de papel pelo aplicativo.

### OTA

- canal interno `hotfix-validation`;
- runtime idêntico ao binário de produção;
- fingerprint SHA-256;
- quantidade de assets;
- rollout de 1%, 5%, 10%, 25%, 50% ou 100%;
- republicação do mesmo grupo validado;
- cancelamento de rollout ativo;
- rollback para grupo anterior;
- registro do EAS update group ID.

### Retenção

- 180 dias para saúde agregada;
- 365 dias para auditoria;
- 730 dias para timeline de incidentes resolvidos;
- legal hold para incidentes;
- hold temporal para auditoria e snapshots;
- dry run obrigatório como etapa operacional;
- execução efetiva restrita a `release_admin`.

### Engenharia

- migrations `015` e `016`;
- RLS e RPCs security definer;
- testes pgTAP;
- política local e testes Node;
- `ota:check`;
- executor EAS protegido;
- manifesto de hotfix;
- workflow manual com ambiente protegido;
- fluxo Maestro do console;
- `sprint12:check` integrado ao release check.

## Critérios de aceitação

- usuário comum não acessa o console;
- operador cria e solicita aprovação;
- administrador diferente decide;
- OTA com mudança nativa é bloqueada;
- runtime divergente é bloqueado;
- publicação exige plano aprovado;
- rollback exige justificativa;
- retenção efetiva exige frase e papel administrativo;
- CI valida TypeScript, lint, testes, Expo config, migrations e pgTAP;
- nenhum segredo administrativo entra no aplicativo.

## Fora do escopo

- executar uma publicação real sem credenciais;
- criar contas de loja ou EAS;
- substituir revisão humana;
- coletar telemetria pessoal ou clínica;
- apagar dados dos titulares pela rotina operacional;
- garantir que todos os aparelhos receberam uma atualização.

## Próximo marco

Após homologação real, o próximo ciclo deve tratar automação de relatórios de pós-incidente, gestão de capacidade, custos operacionais e evolução do produto com dados agregados e consentidos.

**Tehkné Solutions**
