# Beta fechada — BemMeCuida 0.9.0

**Responsável técnico:** Tehkné Solutions

## Objetivo

Distribuir uma versão interna para um grupo controlado de testadores, separada de desenvolvimento, preview e produção.

## Identidade da beta

- nome instalado: `BemMeCuida Beta`;
- Android package: `com.tehknesolutions.bemmecuida.beta`;
- iOS bundle: `com.tehknesolutions.bemmecuida.beta`;
- deep link: `bemmecuida-beta://`;
- canal EAS Update: `beta`;
- distribuição: interna;
- artefato Android: APK.

## Preparação do ambiente

1. Criar ou selecionar o ambiente `preview` no EAS para a beta.
2. Preencher somente credenciais públicas do aplicativo:
   - `EXPO_PUBLIC_SUPABASE_URL`;
   - `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`;
   - `EXPO_PUBLIC_EAS_PROJECT_ID`.
3. Nunca adicionar `service_role`, senha do banco ou token administrativo ao aplicativo.
4. No Supabase Auth, adicionar os callbacks:
   - `bemmecuida-beta://auth/callback`;
   - `bemmecuida-beta://reset-password`;
   - `bemmecuida-beta://` quando necessário para links gerais.
5. Aplicar as migrations no ambiente de homologação.

## Verificações obrigatórias

```bash
npm install
npm run config:check
npm run security:check
npm run release:check
npm run check
npm run staging:check
npm run beta:check
```

O `beta:check` deve reprovar quando:

- o perfil EAS beta não for interno;
- pacote, scheme ou canal estiverem ausentes;
- versões do monorepo divergirem;
- credenciais públicas estiverem vazias ou com placeholders;
- o checklist, Sprint 08 ou fluxo Maestro estiverem ausentes.

## Gerar o APK

```bash
npm run build:android:beta
```

O link de instalação deve ser compartilhado apenas com pessoas convidadas. Não publicar o APK em páginas públicas, grupos abertos ou repositórios.

## Roteiro de homologação em aparelho real

### Conta e segurança

- instalar a beta junto do build de desenvolvimento sem conflito;
- entrar e sair da conta;
- validar recuperação de senha pelo scheme beta;
- ativar biometria e confirmar bloqueio após background;
- cancelar a biometria e confirmar que o conteúdo permanece oculto.

### Banco e sincronização

- criar check-in, Diário e cuidado offline;
- voltar à internet e confirmar sincronização;
- editar e excluir uma entrada do Diário em dois aparelhos;
- confirmar isolamento entre contas diferentes.

### Notificações

- conceder, negar e reativar permissão do sistema;
- ativar e desativar cada categoria;
- validar medicamentos, práticas e consultas nos horários cadastrados;
- validar o convite diário de check-in;
- testar horário silencioso atravessando a meia-noite;
- confirmar ausência de nomes, emoções, diagnósticos e notas na tela bloqueada;
- reiniciar o aparelho e confirmar os agendamentos relevantes.

### Acessibilidade

- testar fonte do sistema em 100%, 150% e no maior valor disponível;
- testar os modos Grande e Muito grande do aplicativo;
- confirmar ausência de texto cortado em telas principais;
- testar alto contraste;
- testar redução de movimento;
- percorrer login, Home, check-in, Diário, crise e configurações com TalkBack ou VoiceOver;
- verificar foco, ordem de leitura, rótulos e estados dos seletores.

### Relatórios e privacidade

- gerar relatório de 7 e 30 dias;
- revisar opções sensíveis antes do compartilhamento;
- exportar dados integrais e confirmar aviso de conteúdo sensível;
- registrar e cancelar solicitação de exclusão.

## Critérios para convidar testadores

- CI verde em `quality` e `database`;
- APK beta instalado e validado em pelo menos um Android real;
- callbacks de autenticação funcionando;
- notificações verificadas com tela bloqueada;
- sem erros bloqueadores, perda de dados ou exposição de conteúdo sensível;
- canal de feedback e versão do build informados aos convidados.

## Dados dos testadores

A beta deve utilizar contas e dados de teste sempre que possível. Testadores devem ser informados de que a versão ainda está em homologação e não substitui atendimento profissional ou serviços de emergência.

## Assinatura

Desenvolvido por **Tehkné Solutions**.
