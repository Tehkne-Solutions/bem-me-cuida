# Sprint 07 — Perfil, privacidade e controle da conta

**Produto:** BemMeCuida  
**Versão:** 0.8.0  
**Assinatura:** Tehkné Solutions

## Objetivo

Dar ao titular um ponto único para administrar identidade, consentimentos opcionais, proteção local, exportação e solicitação de exclusão da conta.

## Entregas

- central de conta acessível pela Home;
- edição do nome de exibição;
- consulta dos consentimentos obrigatórios;
- ativação e revogação de métricas opcionais;
- ativação e revogação do consentimento opcional de processamento por IA;
- exportação integral dos dados locais em JSON;
- aviso explícito de conteúdo emocional e de saúde na exportação;
- solicitação de exclusão registrada em tabela própria;
- cancelamento da solicitação enquanto estiver pendente;
- bloqueio biométrico ou por código do aparelho;
- intervalos de bloqueio imediato, 30 segundos, 1 minuto ou 5 minutos;
- preferências de segurança armazenadas no SecureStore;
- proteção de captura de tela mantida;
- RLS por titular em `account_deletion_requests`;
- testes da política de bloqueio, pgTAP e fluxo Maestro.

## Regras de segurança e privacidade

- termos, privacidade e autorização de dados de saúde são necessários para uma conta ativa;
- consentimentos opcionais podem ser revogados sem impedir o uso principal;
- o aplicativo não apaga a conta de forma instantânea;
- a solicitação de exclusão é registrada para processamento controlado;
- o usuário deve exportar seus dados antes da exclusão;
- a exportação não é enviada automaticamente;
- o bloqueio biométrico usa somente APIs do aparelho;
- o BemMeCuida não recebe nem armazena moldes biométricos;
- textos do Diário continuam sem envio para IA.

## Critérios de aceite

- nome atualizado aparece novamente após recarregar o perfil;
- consentimentos opcionais persistem no Supabase;
- exportação contém todas as entidades locais do usuário;
- solicitação de exclusão fica visível após reabrir a tela;
- usuário consegue cancelar solicitação pendente;
- outra conta não consegue ler ou alterar a solicitação;
- bloqueio ocorre após o intervalo escolhido;
- cancelamento da autenticação mantém o conteúdo oculto;
- versão `0.8.0` permanece alinhada em todos os pacotes;
- TypeScript, lint, testes Node, Expo config, pgTAP e lint PostgreSQL permanecem verdes.

## Homologação manual recomendada

1. Atualizar o nome de exibição.
2. Desativar e reativar métricas opcionais.
3. Exportar os dados e revisar o JSON compartilhado.
4. Registrar e cancelar uma solicitação de exclusão.
5. Ativar biometria em development build.
6. Colocar o app em segundo plano além do intervalo configurado.
7. Cancelar uma tentativa de desbloqueio e confirmar que os dados permanecem ocultos.
8. Desbloquear com biometria ou código do aparelho.

## Próximo incremento recomendado

Sprint 08:

- central de notificações e preferências por categoria;
- quiet hours;
- revisão de acessibilidade e tamanhos de texto;
- ajustes de contraste e redução de movimento;
- preparação de distribuição beta fechada.
