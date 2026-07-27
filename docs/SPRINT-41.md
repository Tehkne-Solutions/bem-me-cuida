# Sprint 41 — decisões humanas sobre propostas validadas

## Objetivo

Registrar decisões humanas sobre propostas validadas sem executar a ação proposta, alterar fontes de verdade ou autorizar ativação do ciclo `0.12.0`.

## Decisões controladas

- `accept-for-future-correction`: aceita a proposta apenas para preparação de um PR futuro e separado;
- `reject-proposal`: rejeita a proposta sem alterar o diagnóstico ou sua fonte;
- `request-replacement`: solicita uma nova proposta compatível com a validação atual.

## Regras

A aceitação é permitida somente para propostas classificadas como `current-and-compatible`. Propostas obsoletas, duplicadas, conflitantes ou inválidas podem ser rejeitadas ou substituídas conforme a política.

Cada decisão é imutável, auditável, registrada em arquivo próprio e integrada somente por pull request. O registro não contém nome, login, e-mail ou identificador bruto.

## Controles

- nenhuma proposta é executada;
- nenhuma correção é autorizada automaticamente;
- nenhum gate, revisão, fila ou reconciliação é alterado;
- nenhuma migration `022–029` é criada;
- nenhum build, publicação, auto-merge ou ativação é permitido.

## Estado factual

Nenhuma decisão operacional real é criada neste sprint. O ciclo permanece fail-closed.

**Tehkné Solutions**
