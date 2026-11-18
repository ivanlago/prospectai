# Implantação

## ProspectAI na Vercel

O domínio de produção é `https://prospectai-psi.vercel.app`. A publicação da branch `main` do repositório vinculado inicia o deploy. O domínio exibe a tela de login e as páginas administrativas exigem autenticação.

Em **Production**, configure `DATABASE_URL` com pooler e TLS, `BETTER_AUTH_URL` com a origem HTTPS e `BETTER_AUTH_SECRET` com um segredo exclusivo. Para geração, configure `AI_PROVIDER=groq` e `GROQ_API_KEY`. Habilite o recorte publicado com `ENABLE_OSM_SALVADOR_EXTRACT=true`. As variáveis são aplicadas em um novo deploy. Provisione o administrador no banco escolhido antes de abrir a aplicação.

## Procedimento geral

A implantação requer autorização. O build local usa Next.js com runtime Node.js e pode ser hospedado na Vercel ou em servidor Node.js via Coolify.

1. Prepare uma branch Neon de produção e configure a URL da aplicação com pooler e TLS. Restrinja a URL direta aos ambientes de migração e administração.
2. Configure a origem HTTPS e o segredo de sessão no gerenciador de segredos do ambiente de destino. Configure o remetente de recuperação se necessário.
3. Valide a migração em uma branch isolada e crie um ponto de recuperação antes de aplicar alterações em produção.
4. Execute a migração e o provisionamento do administrador no ambiente autorizado. Remova a senha de provisionamento.
5. Valide login, logout, bloqueio de rotas, cadastro, pesquisa salva e movimentação no CRM após a implantação.

Para backup, use a janela de recuperação da branch Neon ou exportações criptografadas com `pg_dump` pela URL direta. Teste a restauração em uma branch separada com acesso restrito.

A publicação de sites gerados será adicionada em fases posteriores. O desenho previsto começa com prévias privadas na aplicação e templates persistidos em PostgreSQL. Domínios personalizados, DNS e certificados exigem um fluxo próprio de aprovação.
