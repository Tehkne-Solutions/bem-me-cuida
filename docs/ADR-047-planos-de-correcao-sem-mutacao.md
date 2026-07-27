# ADR 047 — planos de correção sem mutação

## Status

Aceito para governança; execução proibida.

## Contexto

Após diagnóstico, proposta, decisão e validação, ainda é necessário separar o planejamento da alteração da alteração real. Permitir que uma decisão validada modifique diretamente a fonte eliminaria a revisão independente do escopo e aumentaria o risco de mudanças fora do alvo aprovado.

## Decisão

Uma decisão aceita e `current-and-compatible` pode gerar apenas um plano imutável. O plano referencia a decisão e a proposta, define o alvo, limita as raízes permitidas e marca todo item do mapa de impacto como não mutável.

O plano não contém patch, conteúdo substituto, comandos de execução ou autorização de merge. Uma futura correção exigirá outro PR e validação específica da fonte.

## Consequências

- rastreabilidade completa entre diagnóstico e escopo futuro;
- rejeição de decisões obsoletas ou não aceitas;
- bloqueio de arquivos fora das raízes permitidas;
- etapa adicional antes de qualquer alteração real.

## Alternativas rejeitadas

- aplicar a correção no mesmo workflow;
- permitir caminhos livres informados pelo operador;
- tratar o plano como autorização de implementação;
- gerar migrations, builds ou publicações automaticamente.

**Tehkné Solutions**
