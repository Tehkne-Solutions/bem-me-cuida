# ADR 043 — propostas humanas separadas da correção da fonte

## Status

Aceito para governança; aplicação automática proibida.

## Contexto

O Sprint 38 identifica relatos alinhados, desatualizados, conflitantes ou ainda não refletidos nas fontes de verdade. Usar o próprio diagnóstico para alterar essas fontes criaria um ciclo de automação autojustificada, com risco de fechar pendências, aprovar evidências ou modificar gates sem revisão independente.

## Decisão

Cada diagnóstico pode originar somente uma proposta imutável e auditável. A proposta:

- referencia um registro existente na reconciliação atual;
- aceita apenas a ação definida para sua classificação;
- aponta para um alvo controlado;
- não contém instruções livres;
- é criada em branch própria;
- entra por pull request;
- exige revisão humana independente;
- nunca altera a fonte de verdade no mesmo PR.

A eventual correção será feita em outro PR, utilizando o contrato e os testes específicos da fonte afetada.

## Mapeamento

- item aberto e alinhado: confirmar que nenhuma alteração da fonte é necessária;
- item já refletido como fechado: propor supersessão do relato antigo;
- commit desatualizado: propor atualização contra a fonte atual;
- evidência ainda não refletida: solicitar revisão da evidência na fonte;
- dependência ainda presente: solicitar revisão da fonte da dependência;
- conflito de estado: solicitar resolução humana do conflito;
- referência inválida: solicitar revisão do catálogo da fila.

## Consequências positivas

- separa diagnóstico, decisão e correção;
- impede autoaplicação de resultados;
- preserva trilha de auditoria;
- reduz risco de alterar a fonte errada;
- permite revisão independente antes de qualquer correção.

## Consequências negativas

- uma divergência pode exigir dois PRs;
- a correção permanece dependente de ação humana;
- propostas antigas podem se tornar obsoletas após mudanças na `main`.

## Alternativas rejeitadas

- alterar a fonte diretamente no workflow de reconciliação;
- permitir ação livre digitada pelo operador;
- aceitar mais de uma ação para a mesma classificação;
- fazer merge automático da proposta;
- considerar a proposta como evidência de resolução.

**Tehkné Solutions**
