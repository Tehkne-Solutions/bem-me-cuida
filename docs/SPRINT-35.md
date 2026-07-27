# Sprint 35 — painel operacional e comandos protegidos do ciclo 0.12.0

## Objetivo

Disponibilizar uma visão operacional única para acompanhar revisões humanas, gates externos e bloqueadores do ciclo 0.12.0, sem permitir que o painel ou seus comandos alterem o estado do produto.

## Entregas

- configuração versionada do painel;
- snapshot operacional em JSON;
- painel Markdown sanitizado;
- comandos exatos `/cycle012 status`, `/cycle012 reviews`, `/cycle012 blockers` e `/cycle012 gates`;
- autorização por associação GitHub `OWNER`, `MEMBER` ou `COLLABORATOR`;
- execução somente em issues, nunca em comentários de pull request;
- checkout confiável da `main`;
- resposta operacional sem fingerprint ou identidade bruta;
- testes dos estados incompleto, revisado porém bloqueado e apto somente à proposta humana;
- CI dedicado e artefatos com retenção limitada.

## Estados exibidos

- `review-incomplete`;
- `review-complete-external-blocked`;
- `ready-for-human-proposal`.

Nenhum estado apresentado pelo painel autoriza ativação. A propriedade `activationAllowed` permanece sempre `false`.

## Segurança operacional

Os comandos usam correspondência exata e não aceitam texto livre. O workflow possui acesso de leitura ao conteúdo e escrita somente para publicar a resposta na issue. Não executa scripts oriundos de branches não confiáveis.

## Privacidade

O painel apresenta apenas contagens, estados e bloqueadores. Não inclui fingerprints de revisores, IDs, nomes, dados pessoais, informações clínicas, Diário, feedback bruto ou secrets.

## Estado factual

A versão 0.11.0 continua sem encerramento operacional registrado. Assim, o painel atual deve recomendar `hold`.

**Tehkné Solutions**
