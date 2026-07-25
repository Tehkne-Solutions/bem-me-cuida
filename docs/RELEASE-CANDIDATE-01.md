# BemMeCuida 0.10.0 — Release Candidate 1

**Distribuição:** interna  
**Canal:** `rc`  
**Aplicativo:** BemMeCuida RC  
**Assinatura:** Tehkné Solutions

## Identificadores

- Android: `com.tehknesolutions.bemmecuida.rc`
- iOS: `com.tehknesolutions.bemmecuida.rc`
- Scheme: `bemmecuida-rc`
- Release exibida: `0.10.0-rc.1`

## Pré-requisitos

1. Projeto Supabase de homologação atualizado com todas as migrations.
2. URLs de callback `bemmecuida-rc://auth/callback` e `bemmecuida-rc://reset-password` cadastradas.
3. Ambiente EAS `preview` com URL, publishable key e project ID.
4. Nenhuma credencial administrativa no cliente.
5. CI da branch completamente verde.

## Validação antes do build

```bash
APP_VARIANT=rc npm run config:check
APP_VARIANT=rc npm run staging:check
APP_VARIANT=rc npm run rc:check
npm run security:check
npm run release:check
npm run check
```

## Build Android

```bash
npm run build:android:rc
```

O perfil gera APK interno e usa pacote próprio, permitindo instalação paralela com Dev, Preview, Beta e produção.

## Roteiro de homologação

### Instalação e identidade

- Confirmar nome **BemMeCuida RC**.
- Confirmar release `0.10.0-rc.1` na Central da beta.
- Confirmar login e recuperação por deep link RC.
- Confirmar isolamento de sessão em relação à Beta.

### Operação da beta

- Confirmar participação.
- Pausar e reativar participação.
- Enviar relato simples sem anexos.
- Enviar relato com diagnóstico.
- Ativar log técnico e enviar relato com eventos.
- Confirmar status `Recebido` no histórico.
- Confirmar que outra conta não lê os relatos.

### Privacidade

- Revisar payload no Supabase e confirmar ausência de nome, e-mail, diário, emoções, medicamentos e notas clínicas.
- Confirmar que o log começa desligado.
- Apagar o log e verificar contagem zero.
- Exportar a conta e confirmar presença de feedback e adesão.

### Resiliência

- Tentar envio sem conexão e confirmar erro claro sem falsa confirmação.
- Retomar conexão e reenviar.
- Reiniciar o aparelho e confirmar persistência das preferências locais.
- Testar retorno do background com log ligado e desligado.

### Acessibilidade

- TalkBack ou VoiceOver.
- Fonte do sistema no maior tamanho.
- Alto contraste.
- Redução de movimento.
- Navegação até o botão de envio e leitura das descrições.

## Critério de promoção

A RC só pode avançar quando:

- não houver bloqueadores técnicos;
- feedback de severidade `blocking` estiver zerado ou justificado;
- autenticação, SQLCipher, sincronização, notificações e privacidade estiverem homologados em aparelho físico;
- o checklist for assinado pela Tehkné Solutions.

## Rollback

A RC não substitui produção. Em caso de falha, interromper distribuição do canal `rc`, manter a Beta disponível e publicar uma nova candidata com build incrementado.

Desenvolvido por **Tehkné Solutions**.
