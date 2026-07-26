# ADR-027 — Descoberta determinística e custódia do build Android

## Status

Aceito.

## Contexto

O build iniciado pelo EAS precisa ser associado ao commit revisado da candidata. Selecionar apenas o build mais recente pode capturar uma reexecução, outro perfil ou outro package.

## Decisão

A descoberta deve filtrar simultaneamente:

- plataforma Android;
- perfil `rc011`;
- status concluído;
- versão `0.11.0`;
- commit Git exato;
- package da variante quando informado pelo EAS.

Quando houver mais de um candidato, a captura falha até que um build ID explícito seja fornecido. O binário selecionado é baixado, seu SHA-256 é calculado localmente e a captura é armazenada como artefato do GitHub Actions.

A alteração de `builds.json` e a criação do plano físico ocorrem somente por PR. Todos os dispositivos e testes começam como `pending`.

## Controles

- environment protegido de homologação;
- nenhum token nos artefatos;
- URL HTTPS e SHA-256 obrigatórios;
- commit do build igual ao commit solicitado;
- PR idempotente por build ID;
- merge humano obrigatório;
- nenhuma aprovação automática.

## Consequências

A operação pode exigir um build ID manual quando existirem reexecuções legítimas. Esse atrito é intencional para evitar custódia equivocada do binário.

**Tehkné Solutions**
