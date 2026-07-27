# Sprint 33 — captura protegida de revisões humanas do ciclo 0.12.0

## Objetivo

Permitir o registro auditável das revisões humanas previstas no Sprint 32 sem armazenar identidade bruta, sem permitir autoaprovação e sem transformar uma revisão em ativação automática do ciclo.

## Entregas

- configuração versionada da captura de revisões;
- workflow manual com inputs controlados;
- fingerprint SHA-256 derivado de `repository_id:actor_id`;
- resolução do autor do commit revisado pela API do GitHub;
- bloqueio da revisão quando autor e revisor são a mesma pessoa;
- geração de um registro JSON por revisor, trilha e commit;
- abertura automática de PR de evidência, sem auto-merge;
- validação de HTTPS, duplicidade, trilhas e vereditos;
- cálculo de prontidão por commit;
- testes, CI e verificações cumulativas.

## Trilhas aceitas

1. arquitetura;
2. segurança;
3. privacidade;
4. acessibilidade;
5. banco de dados.

## Vereditos aceitos

- `pass`;
- `pass-with-residual-risk`;
- `changes-required`.

## Critérios de pacote completo

Para um mesmo commit, todas as cinco trilhas precisam passar, deve haver ao menos três revisores distintos e segurança e privacidade precisam ter revisores diferentes. Qualquer `changes-required` mantém o pacote em `hold`.

Mesmo quando esses critérios forem atendidos, o resultado será `review-complete-activation-still-blocked`. O encerramento real da versão 0.11.0 e a ativação humana continuam obrigatórios.

## Privacidade

Os registros persistem somente fingerprint pseudonimizado, trilha, veredito, SHA revisado, URL HTTPS sanitizada e timestamp. Não são permitidos texto livre, dados pessoais, dados clínicos, conteúdo do Diário, feedback bruto ou secrets.

## Estado final

O mecanismo está `capture-ready-activation-blocked`. Nenhuma revisão é inventada neste sprint e a pasta de registros pode permanecer vazia até uma execução humana real.

**Tehkné Solutions**
