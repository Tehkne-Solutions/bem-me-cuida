# Sprint 24 — Homologação física Android da RC 0.11

## Objetivo

Registrar sessões físicas verificáveis para o APK Android capturado, consolidar aparelhos, suítes, falhas e retestes, e gerar recomendações de gates sem alterar aprovações globais automaticamente.

## Entregas

- workflow `RC 0.11 Android Physical Validation`;
- captura estruturada de sessão por aparelho e build;
- evidência HTTPS obrigatória;
- contas sintéticas e proibição de dados pessoais, clínicos, secrets, IMEI e número de série;
- estados `passed`, `failed` e `blocked`;
- instalação limpa, upgrade e reteste;
- PR idempotente por Session ID;
- atualização do plano Android, matriz, resultados por plataforma e histórico de sessões;
- proposta de gates restrita ao Android;
- relatório JSON e Markdown;
- comandos operacionais na issue #24;
- testes e trava de release.

## Controles

- a sessão precisa corresponder ao commit, build ID e SHA-256 capturados;
- falha Android pode bloquear o gate global;
- aprovação Android não aprova uma suíte global enquanto plataformas exigidas continuarem pendentes;
- toda atualização de registro exige PR e revisão humana;
- o workflow nunca executa merge automático;
- gates globais continuam sendo a autoridade de promoção.

## Limites

- o sprint não executa testes físicos por conta própria;
- nenhuma sessão real é criada durante a implementação;
- o APK precisa ter sido registrado pelo Sprint 23;
- o estado da candidata permanece `hold` até evidências externas reais.

**Tehkné Solutions**
