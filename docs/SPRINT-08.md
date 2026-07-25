# Sprint 08 — Notificações, acessibilidade e beta fechada

**Produto:** BemMeCuida  
**Versão:** 0.9.0  
**Assinatura:** Tehkné Solutions

## Objetivo

Dar ao titular controle granular sobre lembretes e conforto de uso, preservando privacidade na tela bloqueada e preparando uma distribuição beta isolada da produção.

## Entregas

### Notificações

- central autenticada de notificações;
- permissão do aparelho visível;
- preferência geral para ativar ou cancelar lembretes locais;
- categorias independentes para medicamentos, práticas, consultas, reposição e convite diário de check-in;
- convite diário desligado por padrão;
- horário silencioso configurável;
- canal Android sem som ou vibração durante o horário silencioso;
- lembretes continuam visíveis para não ocultar cuidados programados;
- conteúdo genérico sem nomes de medicamentos, emoções, diagnósticos ou texto do Diário;
- revisão completa dos agendamentos ao salvar preferências.

### Acessibilidade

- tamanho de texto padrão, grande ou muito grande;
- combinação com escala de fonte do sistema;
- alto contraste em textos, campos, superfícies e bloqueio do aplicativo;
- redução de movimento manual;
- respeito automático à redução de movimento do aparelho;
- rótulos, estados e foco visível nos controles principais;
- orientação para TalkBack, VoiceOver e controle por voz.

### Beta fechada

- variante `beta` com nome, scheme e identificadores próprios;
- instalação paralela sem misturar sessão com desenvolvimento, preview ou produção;
- perfil EAS `beta` com distribuição interna e APK Android;
- canal OTA `beta`;
- comando `npm run beta:check`;
- comando `npm run build:android:beta`;
- checklist operacional de convite e homologação.

## Limites de segurança

- notificações não recomendam medicamentos, doses ou alterações de tratamento;
- horário silencioso não apaga ou esconde cuidados programados;
- preferências permanecem locais e separadas por conta no SecureStore;
- nenhum texto do Diário é usado em notificações;
- beta usa credenciais públicas do ambiente de homologação, nunca `service_role`;
- distribuição externa continua bloqueada até homologação em aparelho físico.

## Critérios de aceite

- titular consegue ativar e desativar cada categoria;
- horários inválidos voltam para valores seguros;
- horário que atravessa meia-noite é interpretado corretamente;
- salvar preferências cancela e recria agendamentos sem duplicação conhecida;
- alto contraste e tamanho de texto afetam componentes-base;
- bloqueio respeita redução de movimento;
- variante beta possui pacote e deep link próprios;
- TypeScript, lint, testes, Expo config e CI do banco permanecem verdes.
