# Prontidão para publicação nas lojas

Este checklist organiza a preparação técnica e editorial. Os requisitos finais devem ser confirmados nos consoles oficiais no dia da submissão.

## 1. Identidade do produto

- nome: BemMeCuida;
- desenvolvedor e assinatura: Tehkné Solutions;
- pacote Android de produção: `com.tehknesolutions.bemmecuida`;
- bundle iOS de produção: `com.tehknesolutions.bemmecuida`;
- scheme de produção: `bemmecuida`;
- ícone, adaptive icon, splash e favicon revisados;
- nenhuma marca de cliente, agência ou parceiro no produto.

## 2. Build

- gerar build de produção somente após promoção de uma candidata;
- usar version code/build number superior ao último publicado;
- confirmar assinatura e credenciais sob controle da Tehkné Solutions;
- conferir SHA-256 ou checksum do artefato;
- instalar o mesmo artefato destinado à submissão;
- validar atualização sobre a versão anterior;
- registrar URL, número e checksum no console operacional.

## 3. Funcionalidade crítica

- cadastro e confirmação de e-mail;
- login, recuperação de senha e deep links;
- onboarding e consentimentos;
- check-in online e offline;
- sincronização e isolamento entre contas;
- Diário, edição e exclusão lógica;
- medicamentos, práticas, consultas e tratamentos;
- plano de apoio e acesso de crise offline;
- relatórios e exportação;
- solicitação de exclusão da conta;
- bloqueio biométrico;
- notificações discretas e horário silencioso;
- acessibilidade;
- ausência do console operacional para usuários comuns.

## 4. Privacidade e segurança

- Política de Privacidade publicada em URL HTTPS estável;
- Termos de Uso publicados em URL HTTPS estável;
- contato para privacidade e suporte publicado;
- formulário de segurança de dados coerente com `DATA-SAFETY-MATRIX.md`;
- nenhum texto do Diário enviado para IA;
- nenhuma chave administrativa no bundle;
- SQLCipher confirmado em aparelho;
- RLS e migrations aplicadas no ambiente de produção;
- exportação e exclusão testadas;
- observabilidade técnica desligada por padrão;
- feedback e anexos enviados somente por ação explícita.

## 5. Conteúdo editorial

- título, resumo e descrição revisados;
- screenshots sem dados reais;
- textos sem prometer diagnóstico, cura, prevenção ou substituição profissional;
- aviso de que o app não altera medicamentos nem substitui atendimento;
- classificação etária revisada;
- categoria da loja revisada;
- palavras-chave e materiais localizados em pt-BR;
- informações de suporte consistentes.

## 6. Testes de loja

- conta de revisão sintética preparada, quando solicitada;
- instruções de acesso sem dados pessoais;
- recursos protegidos por login descritos;
- biometria não obrigatória para o revisor;
- modo offline explicado;
- tela de crise acessível sem depender de conexão;
- exclusão da conta localizável no aplicativo;
- nenhum fluxo exige chave interna ou perfil de operador.

## 7. Promoção e publicação

- candidata aprovada no console operacional;
- todos os gates obrigatórios passaram;
- nenhum feedback urgente ou bloqueador aberto;
- build Android disponível e registrado;
- manifesto de release gerado;
- plano de rollback definido;
- canal e rollout escolhidos;
- responsáveis pela observação pós-publicação definidos;
- comunicação de suporte preparada.

## 8. Pós-publicação

- confirmar instalação pela loja;
- validar login e deep links no build distribuído;
- acompanhar crashes e feedback técnico consentido;
- verificar sincronização e notificações;
- pausar rollout diante de bloqueador;
- registrar qualquer rollback no console;
- nunca remover evidências de uma candidata anterior.

## Assinatura

Tehkné Solutions.
