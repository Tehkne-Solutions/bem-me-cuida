# Checklist de homologação — Sprint 01

Produto: **BemMeCuida**
Responsável técnico: **Tehkné Solutions**

Use somente contas e registros sintéticos. Não capture telas, e-mails, notas ou informações reais de saúde.

## 1. Preparação

- [ ] Projeto Supabase de staging criado.
- [ ] Migrations aplicadas na ordem do repositório.
- [ ] Redirects `bemmecuida-dev://**` e `bemmecuida-preview://**` autorizados no Supabase Auth.
- [ ] Variáveis development configuradas no EAS.
- [ ] APK development instalado em um aparelho Android físico.
- [ ] Segundo aparelho ou emulador disponível para validar sincronização.
- [ ] Conta E2E confirmada e com onboarding concluído.

## 2. Diagnóstico do aparelho

1. Entre na conta E2E.
2. Abra **Cuidado → Diagnosticar este aparelho**.
3. Execute a verificação.

Critérios:

- [ ] Banco local no schema 5 ou superior.
- [ ] SecureStore/Keystore aprovado.
- [ ] Sessão corresponde ao escopo local.
- [ ] Nenhuma operação bloqueada na fila.
- [ ] Relatório compartilhado não contém nome, e-mail, ID, token ou conteúdo emocional.

## 3. Autenticação

- [ ] Cadastro exibe orientação para confirmação de e-mail.
- [ ] Link de confirmação abre a variante correta do aplicativo.
- [ ] Login incorreto não informa se o e-mail existe.
- [ ] Recuperação de senha abre o aplicativo e permite definir nova senha.
- [ ] Logout remove a sessão da interface.
- [ ] Uma segunda conta no mesmo aparelho não visualiza dados da primeira.

## 4. Onboarding e consentimentos

- [ ] Não é possível concluir sem Termos, Privacidade e Dados de Saúde.
- [ ] Analytics e análise assistiva permanecem opcionais.
- [ ] Perfil e consentimentos são gravados juntos.
- [ ] Fechar e reabrir o aplicativo não repete o onboarding concluído.
- [ ] Os documentos legais podem ser abertos antes da conclusão.

## 5. Check-in local-first

- [ ] O registro é salvo com internet.
- [ ] O registro é salvo em modo avião.
- [ ] Fechar o aplicativo imediatamente após salvar não perde o registro.
- [ ] O resumo da Home mostra o último check-in da conta ativa.
- [ ] O campo de nota respeita 500 caracteres.
- [ ] Valores fora das escalas são rejeitados pelo domínio e pelo banco.

## 6. Sincronização entre dois dispositivos

### Envio offline

1. Coloque o aparelho A em modo avião.
2. Crie um check-in sintético.
3. Confirme que a Home informa registro pendente.
4. Reative a internet.

- [ ] A fila é enviada sem duplicação.
- [ ] A pendência volta a zero.

### Recuperação remota

1. No aparelho B, entre na mesma conta.
2. Aguarde ou toque em **Sincronizar agora**.

- [ ] O registro do aparelho A aparece no aparelho B.
- [ ] Reiniciar o aparelho B não duplica o registro.

### Conflito

1. Use o mesmo registro sintético em dois dispositivos de teste com versões diferentes.
2. Sincronize primeiro a versão mais nova e depois a antiga.

- [ ] A versão antiga não substitui a mais nova.
- [ ] O dispositivo antigo recupera a versão remota após o ciclo completo.
- [ ] Uma página com timestamps iguais não omite registros; o cursor usa horário e ID.

## 7. Privacidade e segurança

- [ ] O Android impede captura de tela enquanto o aplicativo está aberto.
- [ ] A visualização no seletor de aplicativos não revela conteúdo sensível.
- [ ] Logs não incluem payload, e-mail, nota ou tokens.
- [ ] Nenhuma chave `service_role` está no APK ou no repositório.
- [ ] RLS impede leitura cruzada entre duas contas de teste.
- [ ] A tela de crise abre sem login e sem internet.

## 8. Acessibilidade

- [ ] Fluxo principal é utilizável com TalkBack.
- [ ] Botões têm nome e estado acessíveis.
- [ ] Escalas anunciam valor e seleção.
- [ ] Texto ampliado não impede salvar o check-in.
- [ ] Áreas de toque principais possuem pelo menos 44×44 pontos aproximados.

## 9. Automação

Fluxo público:

```bash
maestro test .maestro/smoke-public.yml
```

Fluxo autenticado, usando credenciais sintéticas fora do repositório:

```bash
maestro test \
  -e E2E_EMAIL="conta-e2e@exemplo.com" \
  -e E2E_PASSWORD="senha-e2e-segura" \
  .maestro/authenticated-check-in.yml
```

- [ ] Fluxo público aprovado.
- [ ] Login e check-in sintético aprovados.
- [ ] Workflow EAS executado sob demanda com a label `e2e` no pull request.
- [ ] `npm run verify` aprovado.
- [ ] `npm run release:check` aprovado.
- [ ] Testes pgTAP aprovados.

## 10. Go/no-go

O Sprint 01 pode ser aprovado somente quando:

- [ ] Não houver erro vermelho no diagnóstico do aparelho.
- [ ] Não houver vazamento entre contas.
- [ ] Check-in offline sobreviver ao fechamento do app.
- [ ] Sincronização não duplicar nem perder registros.
- [ ] Conflito preservar a versão mais nova.
- [ ] Fluxo de crise funcionar sem rede.
- [ ] APK development estiver instalável e o CI estiver verde.

Pendências externas, como criação de credenciais e aprovação de textos legais, devem ser registradas separadamente e não podem ser ocultadas no aceite técnico.
