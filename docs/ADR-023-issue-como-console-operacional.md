# ADR-023 — Issue como console operacional da RC

## Status

Aceito.

## Contexto

Os Sprints 15–18 criaram workflows separados para infraestrutura, build, homologação e PR de evidências. A operação ainda exigia navegar manualmente entre telas do GitHub Actions, copiar nomes de workflows e preencher inputs repetidos. Isso aumentava o risco de acionar a operação errada, usar um commit divergente ou perder a rastreabilidade com a issue #24.

## Decisão

A issue #24 será o ponto único de comando da candidata `0.11.0-rc.1`.

Comentários iniciados por `/rc011` serão processados por um workflow dedicado que:

1. aceita somente comandos e argumentos previamente definidos;
2. rejeita múltiplas linhas, URLs não HTTPS e padrões semelhantes a secrets;
3. consulta a permissão real do autor no repositório;
4. exige `admin` para captura, PR de evidências, build e coleta de artefato;
5. exige ao menos `write` para consultas e validações;
6. despacha exclusivamente workflows versionados e já protegidos;
7. publica uma confirmação factual na issue;
8. não acessa secrets diretamente.

## Controles

- o workflow atua somente na issue #24;
- comentários em pull requests são ignorados;
- comentários do próprio bot são ignorados;
- cada comentário possui grupo de concorrência próprio;
- o parser não chama shell, processos externos ou `eval`;
- SHA, run ID, build UUID e URLs possuem validações específicas;
- o nome do workflow e a operação são definidos no código, nunca pelo texto livre;
- ações administrativas dependem da permissão retornada pela API do GitHub;
- environments protegidos continuam exigindo seus revisores;
- o status lê somente JSON versionado da candidata;
- nenhum resultado altera gates automaticamente.

## Consequências positivas

- uma única trilha operacional;
- menor risco de erro de workflow ou input;
- autorização explícita por comando;
- histórico humano e técnico no mesmo local;
- possibilidade de operação por comentário sem expor credenciais;
- status reproduzível a partir do Git.

## Consequências negativas

- comandos inválidos aparecem como falha do workflow;
- a issue depende da disponibilidade do GitHub Actions;
- o comando apenas solicita a operação, não elimina aprovações dos environments;
- a configuração externa continua dependente de administradores autorizados.

## Alternativas rejeitadas

- criar um único workflow com acesso a todos os secrets;
- aceitar parâmetros livres de shell;
- permitir comandos em qualquer issue;
- promover automaticamente após um comentário;
- confiar apenas em `author_association` sem consultar a permissão atual.

**Tehkné Solutions**
