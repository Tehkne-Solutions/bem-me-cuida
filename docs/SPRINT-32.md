# Sprint 32 — pacote de revisão técnica do ciclo 0.12.0

## Objetivo

Consolidar o desenho técnico do ciclo 0.12.0 em um pacote formal de revisão independente, cobrindo arquitetura, segurança, privacidade, acessibilidade e banco de dados sem autorizar implementação, migrations ou ativação automática.

## Entregas

- pacote de revisão com recomendação inicial `hold`;
- cinco trilhas independentes de revisão;
- modelo de ameaças com mitigação, risco residual e verificação;
- política de aprovação com segregação de funções;
- mínimo de três revisores distintos;
- segurança e privacidade obrigatoriamente revisadas por pessoas diferentes;
- evidências HTTPS sanitizadas;
- testes e verificações fail-closed;
- workflow dedicado, ADR e integração cumulativa ao release check.

## Trilhas obrigatórias

1. arquitetura;
2. segurança;
3. privacidade;
4. acessibilidade;
5. banco de dados.

Todas começam como `pending`. O pacote permanece `review-blocked`, a decisão permanece `blocked` e o ciclo continua em `hold`.

## Ameaças prioritárias

- reidentificação por baixa cardinalidade;
- elevação de privilégio em operações de environment;
- alteração do plano entre dry-run e execução;
- entrada de feedback bruto ou clínico;
- sobrecarga das consultas agregadas.

## Limites

Este sprint não executa revisão humana, não preenche fingerprints, não cria migrations, não exclui environments e não ativa o ciclo 0.12.0.

## Privacidade

Nenhum dado pessoal, clínico, conteúdo do Diário, feedback bruto ou secret é aceito nos artefatos ou evidências.

**Tehkné Solutions**
