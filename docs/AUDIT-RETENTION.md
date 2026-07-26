# Política de retenção operacional e auditoria

## Escopo

Esta política cobre somente dados técnicos de operação do BemMeCuida. Ela não altera a retenção dos dados pessoais, emocionais ou de saúde dos titulares.

## Prazos mínimos

| Categoria | Retenção mínima | Justificativa |
|---|---:|---|
| Snapshots agregados de saúde | 180 dias | Comparação de estabilidade, rollout e regressões |
| Auditoria de operadores | 365 dias | Rastreabilidade de decisões e mudanças privilegiadas |
| Atualizações de incidentes resolvidos | 730 dias | Aprendizado operacional e pós-incidente |

Os prazos são mínimos internos. Obrigações contratuais, regulatórias ou judiciais podem exigir retenção maior.

## Dados elegíveis

### Saúde agregada

Um snapshot pode ser elegível quando:

- tem mais de 180 dias;
- não possui `retention_hold_until` futuro.

### Auditoria

Uma entrada pode ser elegível quando:

- tem mais de 365 dias;
- não possui `retention_hold_until` futuro.

### Timeline de incidentes

Uma atualização pode ser elegível quando:

- tem mais de 730 dias;
- o incidente está resolvido;
- o incidente não está sob `legal_hold`.

## Dados não elegíveis

- incidentes abertos ou em monitoramento;
- incidentes sob legal hold;
- registros com hold de retenção ativo;
- dados abaixo do prazo mínimo;
- dados pessoais e clínicos fora do escopo operacional.

## Simulação obrigatória

Antes de uma execução efetiva:

1. execute `Simular retenção` no console;
2. revise as contagens elegíveis;
3. confirme que holds e incidentes ativos estão corretos;
4. registre a aprovação operacional;
5. execute a retenção somente com `release_admin`.

A simulação grava um `operations_retention_runs` com `dry_run=true` e não apaga registros.

## Execução efetiva

A interface exige a frase:

```text
EXCLUIR DADOS OPERACIONAIS ELEGÍVEIS
```

O servidor revalida o papel `release_admin`, calcula novamente os elegíveis e grava contagens antes e depois da exclusão.

## Legal hold

Use legal hold quando existir:

- investigação de incidente;
- disputa contratual;
- solicitação jurídica;
- auditoria de segurança;
- obrigação de preservação.

O hold deve ter motivo documentado no sistema externo de tickets. O aplicativo registra somente o estado do hold, sem anexar documentos confidenciais.

## Falhas e recuperação

- a função de retenção executa em transação;
- falha interrompe a operação;
- não tente corrigir exclusões diretamente pelo cliente;
- backups e restauração pertencem à operação segura do Supabase;
- qualquer divergência deve gerar incidente técnico.

## Privacidade

Nenhum texto do Diário, emoção, diagnóstico, medicamento, contato de confiança ou anotação clínica é criado, consultado ou apagado por esta rotina.

**Tehkné Solutions**
