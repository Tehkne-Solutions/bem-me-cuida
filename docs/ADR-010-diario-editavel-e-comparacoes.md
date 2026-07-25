# ADR-010 — Diário editável, tombstones e comparações locais

**Status:** Aceito  
**Produto:** BemMeCuida  
**Assinatura:** Tehkné Solutions

## Contexto

Registros emocionais precisam ser corrigíveis e removíveis pelo usuário, inclusive sem internet. A sincronização local-first impede uma exclusão física imediata, pois outro dispositivo poderia reenviar uma cópia antiga. Comparações entre registros também exigem cuidado para não sugerir diagnóstico ou causalidade.

## Decisão

1. Edições preservam `id`, `userId`, `occurredAt` e `createdAt`, alterando apenas o conteúdo editável e `updatedAt`.
2. Exclusões usam tombstone em `deletedAt`, removendo o item das consultas locais sem apagar imediatamente a linha.
3. A fila de sincronização mantém somente a operação mais recente de cada `journal_entry`.
4. O backend recebe edição e tombstone pela função já protegida `sync_care_record`.
5. O pull remoto aplica `deleted_at` antes de tentar interpretar o conteúdo do registro.
6. Busca e filtros são executados somente no banco SQLCipher do aparelho.
7. Comparações usam grupos simples e exigem pelo menos dois registros em cada grupo.
8. Os textos descrevem médias observadas e sempre informam que não demonstram causa, risco ou eficácia.

## Consequências

- exclusões convergem entre dispositivos sem ressurreição de dados antigos;
- o histórico de criação permanece estável após edição;
- tombstones continuam protegidos por RLS e escopo de conta;
- consultas locais podem combinar texto, período, emoção e marcação profissional;
- comparações podem não aparecer quando a cobertura é insuficiente;
- nenhum cálculo exige envio de texto livre para serviço externo.

## Alternativas rejeitadas

### Exclusão física imediata

Rejeitada porque pode permitir que outro dispositivo offline restaure o registro durante uma sincronização posterior.

### Busca remota de texto

Rejeitada para reduzir exposição de conteúdo sensível e manter o recurso disponível offline.

### Correlação estatística apresentada como conclusão

Rejeitada porque amostras pessoais são pequenas, incompletas e inadequadas para inferência clínica ou causal.
