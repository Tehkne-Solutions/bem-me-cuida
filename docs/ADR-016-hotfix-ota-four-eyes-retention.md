# ADR-016 — Hotfixes, OTA, quatro-olhos e retenção operacional

## Status

Aceito para o Sprint 12.

## Contexto

O BemMeCuida manipula dados emocionais e de saúde e, por isso, correções em produção não podem depender apenas da velocidade de publicação. A operação precisa impedir três classes de risco:

1. envio de JavaScript incompatível com o código nativo instalado;
2. aprovação e implantação executadas pela mesma pessoa sem revisão independente;
3. retenção indefinida ou exclusão prematura de evidências operacionais.

## Decisão

### Hotfix como entidade auditável

Todo hotfix possui identidade, versão, severidade, tipo, commit de origem, runtime alvo, canal, resumo técnico e estado próprio. O registro no banco não executa builds, EAS Update ou ações nas lojas; ele documenta e controla a operação externa.

### Quatro-olhos

- quem cria um hotfix não pode aprová-lo;
- somente `release_admin` decide hotfixes e planos OTA;
- a aprovação fica registrada em `operation_approvals`;
- o servidor revalida papel, identidade do criador e estado atual;
- a interface apenas antecipa os bloqueadores.

### OTA compatível

Um plano OTA só pode ser criado quando:

- o hotfix é do tipo `ota`;
- não existem mudanças nativas;
- o runtime é exatamente o runtime aprovado;
- o canal coincide com o canal aprovado;
- existe fingerprint SHA-256;
- a quantidade de assets e o rollout são válidos.

A publicação segue validação no canal `hotfix-validation` e republicação do mesmo grupo para `production`. Isso evita gerar um bundle diferente entre homologação e produção.

### Hotfix binário

Mudanças nativas, dependências nativas, plugins de configuração, permissões, package identifiers ou alterações de runtime exigem `binary`. Artefatos são registrados por plataforma com URL HTTPS e SHA-256 antes da implantação ser marcada como concluída.

### Retenção

Retenções mínimas:

- snapshots agregados de saúde: 180 dias;
- auditoria operacional: 365 dias;
- timeline de incidentes resolvidos: 730 dias.

Incidentes abertos, incidentes sob `legal_hold` e registros com `retention_hold_until` não são elegíveis. A execução efetiva exige `release_admin`; simulações não excluem dados.

## Consequências

### Positivas

- reduz risco de OTA incompatível;
- cria segregação de funções;
- preserva rastreabilidade de decisões;
- permite retenção previsível com holds explícitos;
- mantém credenciais EAS, certificados e service role fora do aplicativo.

### Custos

- exige ao menos duas pessoas para aprovações críticas;
- adiciona etapas antes de uma correção urgente;
- depende de configuração externa do ambiente protegido no GitHub e no EAS;
- não substitui homologação em aparelho físico.

## Limites

- o aplicativo não executa automaticamente operações destrutivas externas;
- o registro de publicação não prova sozinho que todos os aparelhos receberam a atualização;
- rollback registrado no banco precisa corresponder à ação executada no EAS ou na loja;
- textos do Diário, emoções, diagnósticos e informações clínicas não entram nos manifestos ou métricas operacionais.

**Tehkné Solutions**
