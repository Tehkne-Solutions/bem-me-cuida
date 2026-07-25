# ADR-008 — Plano de apoio offline e personalizado

## Decisão

O plano de apoio é armazenado em SQLCipher, pode ser acessado offline e utiliza somente conteúdo escrito pelo usuário. Contatos de confiança são opcionais e ordenados por prioridade.

## Motivos

- a tela precisa permanecer útil quando a rede está indisponível;
- uma lista genérica não substitui o contexto pessoal do usuário;
- avaliação automática de risco pode produzir falsa segurança ou alarmes indevidos;
- o conteúdo é sensível e deve seguir isolamento por conta e RLS.

## Consequências

- o modo público mantém recursos gerais sem exigir login;
- conteúdo personalizado só aparece quando existe sessão ativa;
- o usuário continua responsável por verificar telefones e disponibilidade;
- futuras integrações com profissionais exigirão consentimento separado.
