# ADR 042 — reconciliação auditável dos relatos da fila

## Status

Aceito para observabilidade operacional; qualquer correção continua manual e separada.

## Contexto

O Sprint 37 permitiu registrar progresso, dependências e evidências sem alterar o estado real da fila. Com o tempo, esses relatos podem ficar desatualizados, apontar para commits anteriores ou afirmar uma evolução ainda não refletida na fonte de verdade correspondente.

Sem reconciliação explícita, um relato informativo poderia ser interpretado incorretamente como conclusão de gate, aprovação de revisão ou resolução de dependência.

## Decisão

Criar um reconciliador somente leitura que:

- reconstrói a fila a partir das fontes de verdade atuais;
- valida os relatos pela política do Sprint 37;
- compara commit, pendência, dependências e tipo de evidência;
- classifica cada registro em um conjunto fechado de resultados;
- remove identidade e fingerprint do artefato final;
- produz relatório JSON e resumo Markdown;
- recomenda revisão humana quando houver alertas ou divergências críticas.

A reconciliação não possui permissão para modificar arquivos, abrir PRs, atualizar gates, encerrar pendências ou ativar o ciclo.

## Ordem de classificação

A classificação prioriza:

1. referência inválida;
2. conflito de estado;
3. pendência já refletida como fechada na fonte;
4. commit desatualizado;
5. dependência relatada como resolvida, mas ainda presente;
6. evidência aguardando reflexo na fonte;
7. alinhamento informativo com item aberto.

Essa ordem evita que um alerta de commit antigo esconda uma inconsistência mais grave.

## Consequências positivas

- relatos deixam de ser confundidos com fonte de verdade;
- divergências são detectadas de modo determinístico;
- registros antigos continuam auditáveis;
- o relatório não expõe o relator;
- a fila e os gates permanecem fail-closed.

## Consequências negativas

- a reconciliação pode apontar alertas que exigem investigação humana;
- corrigir a fonte de verdade continua dependendo de fluxo específico;
- relatos válidos podem ficar marcados como antigos após mudanças de commit.

## Alternativas rejeitadas

- alterar automaticamente o gate a partir da evidência relatada;
- remover registros antigos;
- sobrescrever o estado da fila com o progresso informado;
- aprovar evidência pelo simples fato de usar HTTPS;
- incluir identidade ou fingerprint no relatório final.

**Tehkné Solutions**
