# ADR-001 — Arquitetura local-first

**Status:** aceita
**Data:** 2026-07-23
**Responsável:** Tehkné Solutions

## Contexto

O check-in emocional deve continuar disponível em momentos de baixa conectividade. Também precisa responder rapidamente e evitar perda de registro quando o aplicativo for fechado.

## Decisão

- Persistir primeiro no SQLite local criptografado.
- Criar o identificador no dispositivo.
- Inserir uma operação idempotente na fila `sync_queue`.
- Atualizar a interface antes da sincronização remota.
- Sincronizar com Supabase quando houver sessão e conectividade.
- Usar `client_id` como chave única no servidor para impedir duplicação.

## Consequências

### Positivas

- funcionamento offline;
- menor latência percebida;
- tolerância a falhas de rede;
- base adequada para diário e medicamentos.

### Custos

- necessidade de fila, retries e resolução de conflitos;
- testes adicionais de migração e sincronização;
- development build obrigatório para SQLCipher.
