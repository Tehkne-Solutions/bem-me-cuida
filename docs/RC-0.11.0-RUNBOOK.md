# Runbook — BemMeCuida 0.11.0-rc.1

## Pré-condições

- ciclo `0.11.0` aprovado e ativo;
- backlog comprometido sem itens bloqueados;
- mudanças de escopo decididas;
- experimentos concluídos, pausados definitivamente ou cancelados;
- marco de RC concluído;
- gates obrigatórios aprovados;
- zero incidentes SEV1 ou SEV2 abertos;
- zero dependências de segurança bloqueadoras;
- migrations aplicadas em homologação;
- CI verde.

## Relatório agregado

```bash
npm run cycle:report
```

Revise os arquivos:

```text
artifacts/bemmecuida-cycle-0.11.0.json
artifacts/bemmecuida-cycle-0.11.0.md
```

## Trava da RC

Preencha as variáveis operacionais e execute:

```bash
npm run cycle:rc:check
```

A checagem exige:

- `CYCLE_VERSION=0.11.0`;
- `CYCLE_RC_VERSION=0.11.0-rc.1`;
- ciclo ativo ou congelado;
- marco de RC concluído;
- zero bloqueadores;
- todos os gates obrigatórios aprovados;
- evidência HTTPS;
- commit Git de origem.

## Congelamento

O congelamento deve ser iniciado pelo console de execução. A interface consulta os bloqueadores e a RPC repete toda a avaliação de forma transacional.

Não contorne o servidor alterando tabelas diretamente.

## Build

O Sprint 14 prepara a RC, mas não altera automaticamente a versão-base nem dispara build externo. Depois da homologação, será necessário:

1. atualizar a variante RC para `0.11.0-rc.1` em PR específico;
2. validar configuração Expo;
3. gerar build interno Android e iOS;
4. registrar URL e SHA-256;
5. testar em aparelhos físicos;
6. voltar ao console e concluir os gates correspondentes.

## Rollback

Se um bloqueador aparecer depois do congelamento:

- não avance para lançamento;
- reabra o ciclo somente por alteração auditada futura;
- registre incidente quando aplicável;
- corrija o gate ou o marco;
- gere nova candidata, sem reutilizar artefato inválido.

## Privacidade

O relatório da RC contém somente agregações técnicas. Não anexe exportações de conta, Diário, diagnósticos ou dados de tratamento.

## Assinatura

Tehkné Solutions
