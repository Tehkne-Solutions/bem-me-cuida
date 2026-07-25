# ADR-012 — Preferências locais, horário silencioso e beta isolada

## Status

Aceito no Sprint 08.

## Contexto

Notificações e acessibilidade precisam funcionar mesmo sem conectividade e não devem ampliar o conjunto de dados sensíveis sincronizados. A beta fechada também precisa coexistir com builds de desenvolvimento e produção sem compartilhar sessão ou deep links.

## Decisão

### Preferências locais

Preferências de notificações e acessibilidade são armazenadas por `userId` no Expo SecureStore. Elas não são sincronizadas nesta versão porque representam escolhas específicas do aparelho, como biometria, escala visual e comportamento de notificações locais.

### Horário silencioso

O horário silencioso não remove lembretes. Ele seleciona um canal Android de baixa importância, sem som ou vibração, e solicita conteúdo silencioso nas demais plataformas. Isso evita ocultar cuidados programados enquanto reduz interrupções.

### Privacidade das notificações

Todo conteúdo é deliberadamente genérico. O payload contém apenas rota interna e categoria técnica. Nomes de medicamentos, profissionais, emoções, diagnósticos, notas e conteúdo do Diário não são exibidos.

### Acessibilidade

Um provider autenticado combina preferência manual e sinal do sistema. Componentes-base aplicam escala de texto, contraste e redução de movimento, evitando implementações divergentes tela a tela.

### Beta fechada

A variante `beta` usa:

- nome `BemMeCuida Beta`;
- scheme `bemmecuida-beta`;
- Android `com.tehknesolutions.bemmecuida.beta`;
- iOS `com.tehknesolutions.bemmecuida.beta`;
- canal EAS `beta`;
- distribuição interna.

## Consequências

- preferências não acompanham automaticamente o usuário em outro aparelho;
- alterações de horário silencioso exigem recriação dos agendamentos locais;
- notificações permanecem pouco descritivas por escolha de privacidade;
- a beta pode ser instalada em paralelo e precisa de callback próprio no Supabase Auth;
- homologação real de permissões, canais, VoiceOver, TalkBack e escala extrema permanece obrigatória.
