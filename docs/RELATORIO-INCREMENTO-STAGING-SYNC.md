# Relatório técnico — Staging, sincronização e build

**Produto:** BemMeCuida
**Responsável:** Tehkné Solutions
**Sprint:** 01 — Incremento 03

## Resumo

Este incremento converte a fundação local-first em uma arquitetura preparada para homologação real. O aplicativo agora diferencia ambientes, protege conteúdo sensível no sistema operacional, sincroniza dados nos dois sentidos e impede que um dispositivo com informação antiga sobrescreva silenciosamente uma versão mais recente.

## Segurança implementada

- nenhuma credencial administrativa é aceita nas variáveis públicas;
- script verifica `.env` versionado, possíveis JWTs e Supabase secret keys;
- logs `console.log` e `console.debug` são bloqueados no código mobile;
- códigos de falha de sync removem e-mails e URLs;
- RLS continua sendo a fronteira de autorização;
- RPC de sincronização valida `auth.uid()` e o proprietário do registro;
- conteúdo é desfocado no app switcher do iOS e protegido por `FLAG_SECURE` no Android.

## Sincronização

O ciclo executa:

1. verificar conectividade;
2. marcar tentativa local;
3. enviar até 25 operações pendentes;
4. aplicar conflito no servidor;
5. remover operações confirmadas;
6. buscar até 500 mudanças remotas por página;
7. aplicar somente dados da conta ativa;
8. preservar alterações locais ainda pendentes;
9. atualizar cursor e instante de sucesso.

## Build e staging

Foram preparados `app.config.ts`, `eas.json`, EAS Workflow, scripts PowerShell/Bash e um guia de ativação. O APK somente poderá ser criado após login no Expo/EAS e cadastro das variáveis do projeto Supabase de staging.

## Pendência de validação executável

A tentativa de `npm install` excedeu o limite porque o registro de pacotes não respondeu. Assim, não há alegação de build ou typecheck completo aprovado neste ambiente. As verificações possíveis sem dependências foram executadas e registradas.
