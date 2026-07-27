# ADR-029 — Homologação física multiplataforma da RC

## Contexto

A candidata possui funcionalidades nativas, armazenamento criptografado, notificações, biometria e atualização OTA. Uma aprovação baseada somente em Android ou somente em iOS não representa a experiência distribuída.

## Decisão

1. Cada build possui ID, número, commit, URL HTTPS e SHA-256.
2. Android e iOS mantêm planos físicos e históricos de sessão independentes.
3. Cada suíte canônica declara `requiredPlatforms`.
4. Resultados são armazenados em `platformResults.android` e `platformResults.ios`.
5. Falha ou bloqueio em uma plataforma bloqueia a suíte global.
6. Uma suíte somente passa quando todas as plataformas obrigatórias passam.
7. O pacote multiplataforma não executa promoção; apenas recomenda.
8. Evidências usam contas sintéticas e não podem conter dados pessoais, clínicos, secrets ou identificadores únicos.

## Consequências

- aumenta a rastreabilidade e reduz falso positivo de homologação;
- exige aparelhos, certificados e distribuição reais fora do repositório;
- mantém a candidata em `hold` até Android, iOS, OTA e rollback estarem concluídos;
- preserva revisão humana e autoridade do servidor.

**Tehkné Solutions**
