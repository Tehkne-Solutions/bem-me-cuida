# ADR 035 — desenho técnico bloqueado do ciclo 0.12.0

## Status

Aceito para arquitetura; implementação bloqueada até ativação humana.

## Contexto

O Sprint 30 transformou o escopo preliminar do ciclo 0.12.0 em backlog verificável. Ainda assim, iniciar código funcional ou migrations antes do encerramento factual da 0.11.0 violaria os gates fail-closed e poderia antecipar decisões de dados sem evidência suficiente.

## Decisão

Produzir planos técnicos e contratos arquiteturais versionados, sem runtime ativo. Cada item do backlog deve possuir:

- arquitetura por camada;
- estratégia mínima de testes;
- rollback explícito;
- revisão obrigatória de segurança e privacidade;
- contrato de campos permitidos e proibidos;
- correspondência exata com reservas de migrations, quando aplicável.

As migrations 022–024 permanecem apenas descritas como `reserved-not-created`. O CI rejeita arquivos SQL prematuros, divergência entre backlog e planos, ausência de rollback, controles incompletos ou inclusão de dimensões identificáveis.

## Controles específicos

- métricas com agregação mínima de 10 registros;
- proibição de `userId`, e-mail, identificadores de dispositivo, conteúdo do Diário e segmentação clínica;
- allowlist exclusiva para `rc-011-build` e `rc-011-homologation`;
- proteção permanente dos environments de produção;
- feedback limitado a temas e contagens agregadas;
- decisão humana obrigatória na priorização de produto.

## Consequências

### Positivas

- reduz incerteza antes da implementação;
- permite revisão antecipada de segurança e privacidade;
- torna migrations futuras rastreáveis e reversíveis;
- mantém o ciclo integralmente fail-closed.

### Negativas

- não entrega funcionalidade nova ao usuário nesta etapa;
- contratos podem precisar de revisão após feedback real;
- aprovação e ativação externas continuam bloqueadoras.

## Alternativas rejeitadas

- criar tabelas e RPCs antecipadamente;
- usar configuração de runtime para simular o ciclo ativo;
- armazenar eventos individuais para agregar posteriormente;
- permitir exclusão automática de environments após CI verde.

**Tehkné Solutions**
