# ADR-028 — Sessões físicas Android como evidência imutável e revisável

## Status

Aceito.

## Contexto

O APK da RC pode ser capturado com checksum, mas a existência do binário não demonstra instalação, upgrade, funcionamento offline, acessibilidade, biometria, notificações, desempenho ou privacidade em aparelhos reais.

Resultados inseridos diretamente na matriz perderiam a origem da evidência e poderiam aprovar gates sem distinguir Android de iOS.

## Decisão

Cada execução física será representada por uma sessão sanitizada e imutável, vinculada a:

- commit de origem;
- build ID;
- SHA-256 do APK;
- perfil abstrato do aparelho;
- versão do Android sem identificador único;
- modo de instalação;
- resultados de suítes;
- URL HTTPS da evidência.

A sessão será armazenada como artefato, consolidada por PR e preservada em `release/rc-0.11.0/android-sessions/`.

Resultados Android serão gravados em `platformResults.android`. Uma falha poderá bloquear o status global, mas um sucesso Android não aprovará sozinho uma suíte que ainda exija iOS.

A proposta de gates Android será informativa e exigirá revisão. O payload global continuará sendo a autoridade de promoção.

## Consequências

### Positivas

- rastreabilidade por sessão, build e checksum;
- retestes sem apagar a evidência anterior;
- redução do risco de aprovação prematura;
- ausência de dados pessoais, clínicos, secrets, IMEI e número de série;
- operação idempotente por Session ID.

### Custos

- mais de uma sessão pode ser necessária por perfil;
- a revisão humana continua obrigatória;
- Android aprovado não encerra sozinho a homologação multiplataforma.

**Tehkné Solutions**
