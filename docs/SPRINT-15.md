# Sprint 15 — Materialização da RC 0.11.0-rc.1

## Objetivo

Transformar a preparação lógica do ciclo `0.11.0` em uma candidata nativa isolada, reproduzível e auditável para Android e iOS.

## Entregas

- variante `rc011` independente das versões Dev, Beta, RC antiga e produção;
- versão nativa `0.11.0`, candidata `1` e runtime OTA `0.11.0`;
- package Android e bundle iOS `com.tehknesolutions.bemmecuida.rc011`;
- scheme `bemmecuida-rc011` e canal EAS `rc-0-11`;
- build interno Android APK e iOS ad hoc/internal;
- gates de prebuild, artefatos e promoção;
- manifesto com build IDs, números, URLs e SHA-256;
- matriz obrigatória de aparelhos;
- registro de instalação limpa, upgrade, banco local, OTA e rollback;
- workflow protegido pelo environment GitHub `rc-011-build`;
- smoke tests Maestro da RC e do upgrade;
- relatório técnico agregado sem dados pessoais ou clínicos.

## Estados da RC

1. **Configurada:** variante, versão, canal e runtime validados.
2. **Apta ao build:** gates do ciclo, Supabase público e EAS configurados.
3. **Artefatos disponíveis:** Android e iOS possuem IDs, números, URLs e checksums.
4. **Homologada:** matriz física e suítes obrigatórias possuem status `passed` e evidência HTTPS.
5. **Apta à promoção:** `npm run rc011:promotion:check` aprovado.

## Limites

O merge deste Sprint não executa builds externos, não publica OTA, não promove a candidata e não altera a versão de produção `0.10.0`. Credenciais continuam fora do repositório.

**Tehkné Solutions**
