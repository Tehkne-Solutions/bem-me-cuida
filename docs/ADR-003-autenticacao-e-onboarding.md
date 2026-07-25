# ADR-003 — Autenticação, onboarding e isolamento local

## Status

Aceito em 24 de julho de 2026.

## Decisão

- Supabase Auth com e-mail e senha no Sprint 01.
- Sessão persistida em armazenamento seguro no Android e iOS.
- Expo Router Protected Routes para separar autenticação, onboarding e área principal.
- Termos, privacidade e autorização para dados de saúde são obrigatórios; analytics e análise assistiva são opcionais.
- Conclusão do onboarding é persistida em transação no PostgreSQL pela função `complete_onboarding`.
- O estado de onboarding é armazenado localmente apenas como cache de disponibilidade offline.
- Check-ins locais devem sempre ser consultados pelo `user_id` autenticado.

## Consequências

- A tela de crise permanece disponível mesmo sem autenticação.
- Trocas de conta no mesmo aparelho não revelam registros locais de outra conta.
- Links de recuperação usam o scheme `bemmecuida://` e precisam ser permitidos no painel do Supabase.
- O aplicativo não deve incluir `service_role` ou qualquer segredo administrativo.
