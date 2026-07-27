# Sprint 27 — ativação externa e rollout de produção

## Objetivo

Preparar a transição controlada da candidata `0.11.0-rc.1` para a versão `0.11.0`, sem executar publicação automática ou registrar aprovações sem evidência.

## Entregas

- atestações finais independentes para release, QA e privacidade/segurança;
- environment protegido `production-release`;
- rascunho da GitHub Release `v0.11.0`;
- custódia dos builds oficiais Android e iOS;
- pacote de prontidão para Google Play e App Store;
- rollout gradual em 1%, 5%, 10%, 25%, 50% e 100%;
- critérios objetivos de pausa e rollback;
- métricas agregadas sem dados pessoais ou clínicos;
- comandos operacionais e PRs de evidência idempotentes;
- pacote de ativação que recomenda a próxima ação sem executá-la.

## Estado inicial

Todos os registros externos permanecem `pending` ou bloqueados. A existência do workflow não cria environment, secret, build, submissão, release publicada ou estágio de rollout.

## Critério de encerramento

- `quality` e `database` verdes;
- release checks cumulativos até o Sprint 27;
- pacote de ativação gerado em `hold` com os dados atuais;
- nenhuma evidência externa fictícia;
- assinatura exclusiva Tehkné Solutions.

Tehkné Solutions.
