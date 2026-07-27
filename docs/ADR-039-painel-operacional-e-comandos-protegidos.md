# ADR 039 — painel operacional somente leitura e comandos protegidos

## Status

Aceito.

## Contexto

Os Sprints 33 e 34 criaram captura, consolidação e proposta protegida para revisões humanas do ciclo 0.12.0. Faltava uma forma simples de consultar o estado factual sem abrir arquivos manualmente ou introduzir caminhos operacionais capazes de alterar migrations, builds ou ativação.

## Decisão

Adotar um painel gerado exclusivamente a partir de artefatos versionados e comandos GitHub de consulta com correspondência exata.

Comandos permitidos:

- `/cycle012 status`;
- `/cycle012 reviews`;
- `/cycle012 blockers`;
- `/cycle012 gates`.

O workflow:

- executa apenas em issues;
- exige associação `OWNER`, `MEMBER` ou `COLLABORATOR`;
- faz checkout explícito da `main`;
- não persiste identidade ou fingerprint;
- não aceita texto livre;
- publica somente uma resposta Markdown sanitizada;
- não possui permissão para alterar conteúdo do repositório.

## Invariantes

- `activationAllowed` é sempre `false`;
- o painel é somente leitura;
- migrations 022–029 continuam proibidas antes da aprovação;
- não há build, publicação, merge ou exclusão de environment;
- dados pessoais, clínicos, Diário, feedback bruto e secrets não aparecem no painel.

## Consequências positivas

- visão operacional consistente e auditável;
- redução de leitura manual de múltiplos JSONs;
- menor risco de execução acidental;
- consulta rápida por pessoas autorizadas;
- mesma lógica usada por CI, artefato e comentário em issue.

## Consequências negativas

- o painel representa somente o estado versionado;
- evidências externas ainda precisam ser capturadas por fluxos próprios;
- usuários sem associação autorizada não recebem resposta automática.

## Alternativas rejeitadas

- painel com comandos de ativação;
- parsing de texto livre;
- execução sobre a branch do autor do comentário;
- exposição de fingerprints ou IDs dos revisores;
- workflow com permissão de escrita em conteúdo.

**Tehkné Solutions**
