# Sprint 45 — Autorização protegida para preparar PR de correção

## Objetivo

Registrar autorização humana explícita para preparar um futuro pull request de correção a partir de um plano validado, mantendo patch, mutação, execução, merge e ativação bloqueados.

## Entregas

- política versionada;
- contrato imutável de autorização;
- identificador determinístico;
- referências obrigatórias ao plano e ao commit de validação;
- testes fail-closed;
- verificador estrutural;
- CI dedicado;
- ADR 049.

## Elegibilidade

Somente planos classificados como `current-and-compatible` podem receber `authorize-pr-preparation`.

## Não escopo

- geração de patch;
- edição de fonte de verdade;
- migrations 022–029;
- execução de correção;
- criação automática de PR funcional;
- aprovação ou merge automático;
- build, publicação ou ativação.

## Resultado factual

Nenhuma autorização operacional real é criada neste sprint. O ciclo 0.12.0 permanece fail-closed.
