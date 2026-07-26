# Política de evidências — RC 0.11.0-rc.1

## Finalidade

Definir quais evidências podem sustentar a homologação sem expor pessoas, dados emocionais ou informações de saúde.

## Permitido

- build ID e número;
- package, bundle, runtime e canal;
- SHA-256 e tamanho do artefato;
- versão do sistema operacional e classe do aparelho;
- timestamps técnicos;
- capturas de telas sem conteúdo de usuário;
- logs de navegação com contas sintéticas;
- contagens agregadas;
- resultado passed, failed, blocked ou skipped;
- links HTTPS com acesso controlado.

## Proibido

- nome, e-mail, telefone, CPF ou identificador pessoal;
- texto do Diário;
- emoção registrada;
- diagnóstico;
- medicamento, dose ou tratamento;
- contato de confiança;
- informação sobre crise;
- tokens, certificados, senhas e chaves administrativas;
- dumps do banco local de uma pessoa real.

## Contas de teste

Todos os fluxos autenticados usam contas sintéticas criadas exclusivamente para homologação. Os textos de teste devem ser neutros e não representar histórias clínicas reais.

## Armazenamento

- capturas intermediárias: artefatos do GitHub com retenção de 90 dias;
- registros aprovados: arquivos JSON versionados;
- screenshots e vídeos: repositório de evidências com URL HTTPS e acesso restrito;
- segredos: somente environments externos;
- binários: EAS ou armazenamento aprovado, nunca commitados no Git.

## Aprovação

Uma evidência `passed` exige:

1. URL HTTPS;
2. operador identificado por papel, não por dado pessoal;
3. timestamp;
4. resultado reproduzível;
5. revisão antes do merge;
6. ausência de conteúdo proibido.

## Falhas

Evidências `failed` ou `blocked` não podem ser omitidas do pacote de decisão. A correção exige nova execução e nova evidência, preservando o histórico anterior.

## Assinatura

**Tehkné Solutions**
