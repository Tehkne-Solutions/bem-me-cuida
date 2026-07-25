# ADR-004 — Sincronização bidirecional e conflitos

## Status

Aprovado no Sprint 01.

## Contexto

O check-in precisa ser salvo imediatamente, continuar disponível sem internet e permanecer consistente quando a mesma conta é usada em mais de um dispositivo. Dados emocionais não podem ser descartados silenciosamente nem sobrescritos por uma versão mais antiga.

## Decisão

1. O dispositivo é a primeira fonte de persistência para novas entradas.
2. Cada alteração autenticada cria uma operação idempotente em `sync_queue`.
3. O envio remoto ocorre por RPC `sync_mood_checkin`, nunca por chave administrativa no aplicativo.
4. O servidor compara `client_updated_at` e rejeita versões mais antigas com o resultado `remote_newer`.
5. Depois do envio, o aplicativo busca alterações remotas por usuário e cursor.
6. Uma mudança local pendente bloqueia o avanço do cursor naquela posição, impedindo que a versão remota seja esquecida.
7. Erros usam backoff exponencial com teto de 60 minutos e código sanitizado sem e-mail, URL ou conteúdo emocional.
8. Depois de oito tentativas, a operação fica bloqueada para inspeção técnica, sem ser apagada.

## Consequências

- O fluxo funciona offline e em mais de um dispositivo.
- Conflitos não são resolvidos apenas pelo relógio do servidor; o instante de edição do cliente participa da decisão.
- O cursor atual usa `updated_at`. Antes de alto volume, será necessário evoluir para cursor composto `updated_at + id`.
- O aplicativo precisa manter sincronização em primeiro plano e ao recuperar conectividade.
