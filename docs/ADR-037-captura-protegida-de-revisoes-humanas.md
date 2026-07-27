# ADR 037 — captura protegida de revisões humanas

## Status

Aceito para captura de evidências; ativação do ciclo permanece bloqueada.

## Contexto

O Sprint 32 definiu cinco trilhas obrigatórias de revisão independente e uma política com mínimo de três revisores. Faltava um mecanismo operacional que permitisse registrar essas decisões sem inserir aprovações fictícias no repositório, expor identidades desnecessárias ou dar ao workflow poder para ativar o ciclo.

## Decisão

Disponibilizar um workflow acionado manualmente que:

- aceita somente trilhas e vereditos predefinidos;
- exige SHA completo do commit revisado;
- resolve o autor do commit pela API do GitHub;
- rejeita a execução quando autor e revisor possuem o mesmo `actor_id`;
- cria um fingerprint SHA-256 a partir de `repository_id:actor_id`;
- persiste somente o fingerprint, sem username ou ID bruto;
- exige uma URL HTTPS de evidência sem credenciais;
- cria um registro único por trilha, revisor e commit;
- abre um PR dedicado para revisão da evidência;
- nunca executa merge automático.

A prontidão é calculada separadamente por commit. Todas as cinco trilhas devem passar, com pelo menos três fingerprints distintos e revisores diferentes para segurança e privacidade.

## Limites de autoridade

Um pacote de revisões completo não ativa a versão 0.12.0. O resultado máximo deste mecanismo é `review-complete-activation-still-blocked`. A autorização de migrations e implementação depende do encerramento factual da 0.11.0, da aprovação do escopo e de uma ativação humana separada.

## Consequências positivas

- evidências humanas passam a ter trilha auditável;
- autoaprovação é bloqueada tecnicamente;
- identidade bruta não é persistida nos registros;
- revisões concorrentes não sobrescrevem umas às outras;
- qualquer mudança permanece sujeita ao processo normal de PR.

## Consequências negativas

- a associação entre fingerprint e pessoa depende dos logs de auditoria do GitHub;
- commits sem autor ou committer resolvível por ID não podem ser revisados pelo fluxo;
- uma URL de evidência válida ainda precisa ser analisada por humanos;
- o workflow requer permissão de escrita para criar branch e PR de evidência.

## Alternativas rejeitadas

- registrar username diretamente no JSON;
- aceitar aprovação por comentário de issue sem validação estrutural;
- permitir que o autor aprove o próprio commit;
- atualizar diretamente a `main` com o registro;
- ativar o ciclo após a quinta revisão;
- usar texto livre para justificativas dentro do repositório.

**Tehkné Solutions**
