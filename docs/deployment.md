# Implantação

A implantação requer autorização. O build local usa Next.js com runtime Node.js e pode ser hospedado na Vercel ou em servidor Node.js via Coolify.

1. Prepare uma branch Neon de produção e configure a URL da aplicação com pooler e TLS. Restrinja a URL direta aos ambientes de migração e administração.
2. Configure a origem HTTPS e o segredo de sessão no gerenciador de segredos do ambiente de destino. Configure o remetente de recuperação se necessário.
3. Valide a migração em uma branch isolada e crie um ponto de recuperação antes de aplicar alterações em produção.
4. Execute a migração e o provisionamento do administrador no ambiente autorizado. Remova a senha de provisionamento.
5. Valide login, logout, bloqueio de rotas, cadastro, pesquisa salva e movimentação no CRM após a implantação.

Para backup, use a janela de recuperação da branch Neon ou exportações criptografadas com `pg_dump` pela URL direta. Teste a restauração em uma branch separada com acesso restrito.

A publicação de sites gerados será adicionada em fases posteriores. O desenho previsto começa com prévias privadas na aplicação e templates persistidos em PostgreSQL. Domínios personalizados, DNS e certificados exigem um fluxo próprio de aprovação.
