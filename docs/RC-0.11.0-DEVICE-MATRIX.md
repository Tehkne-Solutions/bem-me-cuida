# RC 0.11.0 — Matriz de aparelhos

## Cobertura obrigatória

### Android

- versão mínima suportada pelo SDK;
- versão intermediária em aparelho de uso comum;
- versão estável mais recente homologada;
- ao menos um aparelho de baixa memória;
- tablet como cobertura complementar.

### iOS

- versão mínima suportada pelo SDK;
- versão intermediária;
- versão estável mais recente homologada;
- iPad como cobertura complementar.

## Roteiro por perfil

Cada perfil obrigatório deve validar:

1. instalação limpa;
2. autenticação e recuperação de sessão;
3. check-in e Diário;
4. operação offline e sincronização;
5. notificações e horário silencioso;
6. biometria ou código do aparelho;
7. fontes ampliadas, contraste e redução de movimento;
8. exportação e privacidade da tela bloqueada;
9. atualização OTA no runtime `0.11.0` pelo canal `rc-0-11`;
10. cancelamento ou rollback do update sem perda de dados.

## Registro

O arquivo `release/rc-0.11.0/device-matrix.json` é a fonte versionada. Para cada perfil obrigatório, preencher:

- `status`: `passed`, `failed` ou `blocked`;
- `evidenceUrl`: URL HTTPS da evidência técnica;
- `notes`: resumo sem dados pessoais ou clínicos.

A promoção é bloqueada enquanto qualquer perfil obrigatório não estiver em `passed`.

## Evidência aceitável

- relatório do dispositivo com modelo anonimizado por classe;
- versão do sistema;
- versão instalada `0.11.0-rc.1`;
- build number;
- resultado técnico por etapa;
- captura sem conteúdo emocional;
- link protegido com retenção definida.

## OTA

Um update é aceito somente quando:

- runtime é `0.11.0`;
- canal é `rc-0-11`;
- não contém mudança nativa;
- instalação base possui `expo-updates` configurado;
- reinício carrega o update esperado;
- rollback retorna ao grupo anterior.

**Tehkné Solutions**
