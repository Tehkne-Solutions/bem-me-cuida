# Sprint 05 — Relatórios e compartilhamento seguro

**Produto:** BemMeCuida  
**Versão:** 0.6.0  
**Assinatura:** Tehkné Solutions

## Objetivo

Gerar relatórios descritivos de 1, 7, 30 ou 90 dias para revisão pessoal e conversas com profissionais, mantendo minimização de dados e controle explícito do usuário.

## Entregas

- relatório longitudinal calculado localmente;
- cobertura de check-ins e diário por dias registrados;
- médias de humor, ansiedade, energia, concentração, sono e outros indicadores;
- temas do diário sem incluir textos livres;
- adesão registrada a medicamentos e práticas;
- resumo de consultas e tratamentos;
- opções de privacidade por seção;
- nomes e doses de medicamentos desativados por padrão;
- compartilhamento somente por ação explícita;
- testes do formatador e fluxo Maestro.

## Limites

O relatório:

- não diagnostica;
- não prevê episódios ou crises;
- não afirma causalidade;
- não substitui prontuário ou avaliação clínica;
- não inclui textos do diário;
- não é salvo automaticamente no servidor;
- não é enviado sem ação explícita do usuário.

## Critérios de aceite

- usuário escolhe entre 1, 7, 30 e 90 dias;
- relatório mostra claramente dias com dados disponíveis;
- seções sensíveis podem ser incluídas ou removidas;
- nomes de medicamentos e tratamentos ficam desativados por padrão;
- texto compartilhável contém aviso de limite clínico e assinatura da Tehkné Solutions;
- typecheck, lint, testes, Expo config e CI do banco permanecem verdes.
