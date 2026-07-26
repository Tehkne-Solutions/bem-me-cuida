# Matriz de segurança de dados

Esta matriz descreve o comportamento implementado e serve como base de revisão dos formulários das lojas e da Política de Privacidade. Ela não substitui a conferência dos requisitos vigentes nos consoles oficiais.

| Categoria | Exemplos no BemMeCuida | Finalidade | Local | Transmissão | Compartilhamento | Controle do titular |
|---|---|---|---|---|---|---|
| Identificação da conta | e-mail, ID da conta, nome de exibição | autenticação e personalização | Supabase e cache local mínimo | sim, com o backend da conta | não para publicidade | editar nome, exportar, solicitar exclusão |
| Dados emocionais e de saúde | check-ins, Diário, emoções, sono, ansiedade, medicamentos, tratamentos | acompanhamento pessoal e organização do cuidado | SQLCipher local e tabelas protegidas por RLS | somente para sincronização da própria conta | somente quando o titular exporta ou compartilha | criar, editar, excluir, exportar e solicitar exclusão |
| Contatos e apoio | profissionais e contatos de confiança | organização e plano pessoal de apoio | local criptografado e backend da conta | sincronização autenticada | não automaticamente | editar, excluir e exportar |
| Agenda e rotina | horários, práticas, consultas e lembretes | organização do cuidado | local criptografado e backend da conta | sincronização autenticada | não automaticamente | editar, excluir e controlar notificações |
| Diagnóstico técnico | versão, plataforma, schema, conectividade, contagens técnicas | suporte e homologação | gerado sob demanda | somente quando anexado explicitamente a um feedback | equipe operacional da Tehkné Solutions | revisar antes do envio e não anexar |
| Eventos técnicos locais | sessão iniciada, background, foreground, resultado agregado de diagnóstico | depuração consentida | SQLCipher local, máximo de 200 eventos | nunca automaticamente; até 40 podem acompanhar um feedback | equipe operacional somente após envio explícito | desligado por padrão, limpar histórico, não anexar |
| Feedback da beta | categoria, impacto, mensagem, passos de reprodução | correção e melhoria da beta | Supabase com RLS | somente ao pressionar enviar | equipe operacional da Tehkné Solutions | revisar texto antes do envio e acompanhar status |
| Preferências | notificações, horário silencioso, acessibilidade e bloqueio | experiência do aplicativo | SecureStore por conta e aparelho | não sincronizadas por padrão | não | alterar ou desativar a qualquer momento |
| Dados de operação de release | gates, builds, status, auditoria e triagem | gestão interna da distribuição | Supabase com RLS operacional | usados apenas por contas operacionais | não disponibilizados a usuários comuns | não se aplicam ao titular comum |

## Princípios implementados

- minimização por padrão;
- SQLCipher para registros locais sensíveis;
- SecureStore para chaves e preferências protegidas;
- RLS por titular e por papel operacional;
- nenhuma chave administrativa no aplicativo;
- texto do Diário fora da IA e da observabilidade;
- notificações com conteúdo genérico;
- diagnóstico e eventos anexados somente por escolha explícita;
- exportação preparada sob demanda;
- solicitação de exclusão disponível dentro do aplicativo.

## Pontos que exigem revisão antes da loja

- URL pública da Política de Privacidade;
- endereço e canal de contato do controlador/operador aplicável;
- prazos operacionais de exclusão e retenção;
- subprocessadores efetivamente contratados no ambiente de produção;
- regiões de armazenamento e transferência do projeto Supabase utilizado;
- ferramentas adicionais de analytics ou crash reporting, caso sejam introduzidas;
- declaração final de coleta, criptografia, exclusão e compartilhamento em cada loja.

## Restrições editoriais

- não afirmar que o aplicativo diagnostica ou trata condições;
- não classificar observabilidade opcional como necessária ao funcionamento;
- não declarar ausência de coleta quando a sincronização de conta estiver ativa;
- não ocultar que feedback enviado contém texto fornecido pelo usuário;
- manter materiais de loja consistentes com o comportamento real da versão submetida.

## Assinatura

Tehkné Solutions.
