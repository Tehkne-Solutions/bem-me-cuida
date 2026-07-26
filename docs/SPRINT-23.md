# Sprint 23 — Descoberta e custódia do artefato Android

## Objetivo

Localizar com segurança o primeiro build Android da candidata `0.11.0-rc.1`, baixar o binário, calcular seu SHA-256, registrar os metadados por PR e iniciar uma matriz física totalmente pendente.

## Entregas

- descoberta por plataforma, perfil, status, versão e commit;
- seleção explícita quando houver mais de um candidato;
- captura reutilizando o coletor de checksum do Sprint 16;
- workflow `RC 0.11 Android Artifact`;
- PR idempotente que altera somente o registro do build e o plano Android;
- plano físico vinculado ao build ID e ao SHA-256;
- comandos operacionais na issue #24;
- testes e trava de release.

## Limites

- nenhuma build é criada por este sprint;
- nenhuma captura é aceita sem binário baixado;
- nenhum aparelho, suíte ou gate é aprovado automaticamente;
- o PR de artefatos exige revisão e merge humano;
- a candidata continua em `hold` enquanto os registros reais estiverem pendentes.

**Tehkné Solutions**
