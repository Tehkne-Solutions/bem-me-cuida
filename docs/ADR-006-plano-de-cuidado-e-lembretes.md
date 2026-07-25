# ADR-006 — Plano de cuidado e lembretes locais

## Decisão

Medicamentos e práticas são tratados como registros definidos pelo usuário e por seus profissionais. O aplicativo agenda notificações locais somente após ação explícita do usuário.

## Privacidade

A notificação usa sempre:

- título: `Lembrete de cuidado`;
- corpo: `Você tem um cuidado programado agora.`

Nome do medicamento, dose, diagnóstico e nome da prática não são exibidos na tela bloqueada.

## Persistência

O registro é salvo primeiro no SQLite com SQLCipher. A fila de sincronização é independente do agendamento nativo da notificação. Identificadores nativos permanecem apenas no dispositivo e não são enviados ao backend.

## Conflitos

Cada entidade possui `client_updated_at`. O backend recusa sobrescrever uma versão mais nova e o cliente reinicia o cursor da entidade para recuperar a versão remota.

## Alternativas rejeitadas

- lembretes push dependentes de servidor: desnecessários no MVP e mais invasivos;
- nome do medicamento na notificação: risco de exposição;
- sequência diária e pontuação: pode produzir culpa e abandono;
- recomendações automáticas de tratamento: ultrapassam o limite do produto.
