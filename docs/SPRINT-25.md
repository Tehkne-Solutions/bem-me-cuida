# Sprint 25 — Custódia iOS e homologação multiplataforma

## Objetivo

Estender a cadeia de custódia e homologação da RC `0.11.0-rc.1` para iPhone e iPad, consolidando resultados Android e iOS sem permitir promoção unilateral ou automática.

## Entregas

- descoberta e seleção segura do build iOS no EAS;
- captura do IPA e cálculo de SHA-256 pelo coletor existente;
- plano físico iOS com todos os itens inicialmente `pending`;
- sessões sanitizadas para iPhone e iPad;
- histórico imutável em `ios-sessions/`;
- `platformResults.ios` nas suítes canônicas;
- `requiredPlatforms: [android, ios]` explícito;
- pacote unificado de revisão `hold|promote`;
- workflows, comandos, testes e release check.

## Limites

- nenhum build iOS foi criado por este sprint;
- nenhum aparelho ou suíte recebeu aprovação real;
- sucesso em uma plataforma não aprova uma suíte multiplataforma;
- falha em qualquer plataforma pode bloquear a suíte global;
- OTA e rollback continuam obrigatórios;
- a decisão final permanece no console operacional e nas RPCs protegidas.

**Tehkné Solutions**
