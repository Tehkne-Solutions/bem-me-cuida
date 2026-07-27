# Sprint 37 — registro protegido de atualizações da fila

## Objetivo

Permitir que responsáveis operacionais registrem progresso, dependências e evidências das pendências do ciclo 0.12.0 por meio de arquivos imutáveis e pull requests auditáveis, sem concluir itens ou modificar gates automaticamente.

## Entregas

- política versionada de atualização da fila;
- estados controlados e não terminais de progresso;
- estados informativos de dependência;
- tipos controlados de evidência;
- validação HTTPS sem credenciais ou hosts locais;
- fingerprint pseudonimizado do relator, sem identidade bruta;
- gerador de registro determinístico;
- workflow manual restrito a permissões `write`, `maintain` e `admin`;
- criação de branch e PR contendo exatamente um registro;
- incorporação dos relatos aprovados ao JSON e Markdown da fila;
- testes, verificadores, CI e ADR.

## Estados de progresso permitidos

- `not-started`;
- `in-progress`;
- `blocked`;
- `evidence-submitted`;
- `review-requested`.

Estados terminais como `completed`, `closed`, `resolved`, `approved` ou `done` são rejeitados.

## Efeito dos registros

Os registros possuem efeito exclusivamente informativo. Um relato pode indicar andamento, bloqueio, dependência parcialmente resolvida ou evidência submetida, mas não altera:

- `status` ou `ready` do item;
- prioridade e próximo passo;
- resultado de revisão;
- gate externo;
- autorização de migration ou implementação;
- estado de ativação do ciclo.

## Fluxo operacional

1. Um membro autorizado inicia o workflow manual.
2. A `main` confiável é carregada.
3. O item e suas dependências são reconstruídos a partir dos artefatos atuais.
4. Um único registro JSON é gerado.
5. Uma branch é criada com somente esse arquivo.
6. Um pull request é aberto para revisão humana.
7. Após merge humano, o relato passa a aparecer na fila como progresso reportado.

## Estado final

O mecanismo fica `update-capture-ready-activation-blocked`. Nenhuma atualização real é criada pelo Sprint 37 e o ciclo continua sem ativação automática.

**Tehkné Solutions**
