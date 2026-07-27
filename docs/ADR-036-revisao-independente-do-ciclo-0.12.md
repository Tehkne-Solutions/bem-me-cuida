# ADR 036 — revisão independente antes da ativação do ciclo 0.12.0

## Status

Aceito para preparação; aprovação e ativação permanecem bloqueadas.

## Contexto

O Sprint 31 definiu contratos e planos técnicos, mas um desenho correto no repositório não substitui revisão independente. Como o BemMeCuida trata contexto emocional e de saúde, mudanças em observabilidade, operações e priorização de UX precisam de avaliação explícita de arquitetura, segurança, privacidade, acessibilidade e banco de dados.

## Decisão

Criar um pacote versionado de revisão com cinco trilhas obrigatórias. Cada trilha começa como `pending` e precisa de papel específico, critérios objetivos e evidência HTTPS sanitizada.

A aprovação exige:

- ao menos três revisores distintos;
- autor impedido de aprovar a própria mudança;
- segurança e privacidade revisadas por pessoas diferentes;
- todas as trilhas aprovadas;
- encerramento factual do ciclo 0.11.0;
- escopo aprovado e proposta de ativação mesclada.

O pacote não autoriza implementação, migrations ou ativação automática.

## Modelo de ameaças

A revisão utiliza uma abordagem inspirada em STRIDE e inclui cenários de:

- divulgação por baixa cardinalidade;
- elevação de privilégio;
- adulteração do plano operacional;
- abuso de privacidade;
- negação de serviço.

Cada ameaça precisa de impacto, mitigações, risco residual e mecanismo de verificação. Risco residual acima de `medium` bloqueia o pacote.

## Consequências positivas

- decisões ficam rastreáveis e separadas da autoria;
- segurança, privacidade e acessibilidade tornam-se gates formais;
- evidências sensíveis são rejeitadas por política;
- o ciclo permanece fail-closed até existirem condições reais.

## Consequências negativas

- a ativação depende de revisão humana externa;
- mudanças no desenho exigem nova rodada de revisão;
- o pacote pode permanecer em `hold` mesmo com CI verde.

## Alternativas rejeitadas

- considerar CI verde como aprovação do ciclo;
- permitir aprovação por um único revisor;
- unir segurança e privacidade na mesma assinatura obrigatória;
- preencher fingerprints ou evidências fictícias;
- autorizar migrations durante a revisão.

**Tehkné Solutions**
