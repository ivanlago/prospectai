# ProspectAI

Painel privado de prospecção comercial. A Fase 1 cobre autenticação de um administrador, dashboard, cadastro manual de empresas, pesquisas salvas e CRM básico.

## Executar localmente

Requisitos: Node.js 22 ou superior e um banco PostgreSQL, preferencialmente uma branch de desenvolvimento no Neon.

1. Execute `npm ci` para instalar as dependências do lockfile.
2. Copie `.env.example` para `.env.local`. Configure `DATABASE_URL` com a conexão da aplicação, `DATABASE_URL_DIRECT` com a conexão direta para migrações e `BETTER_AUTH_URL` com a origem exata que será aberta no navegador.
3. Gere o segredo da sessão com `node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"` e salve o valor em `BETTER_AUTH_SECRET`.
4. Defina `ADMIN_EMAIL` e `ADMIN_PASSWORD` (14 a 128 caracteres). Execute `npm run db:migrate` e `npm run admin:create`. Remova `ADMIN_PASSWORD` do arquivo e do ambiente depois do provisionamento.
5. Execute `npm run dev` e abra [o painel local](http://localhost:3000/).

O comando de provisionamento cria o primeiro administrador e falha se já existir uma conta. Para recuperação por e-mail, configure `RESEND_API_KEY` e `RESET_FROM` com um endereço de remetente verificado no Resend. A página de login exibe a recuperação quando os dois valores estão configurados.

## Verificação

```sh
npm run lint
npm run typecheck
npm test
npm run build
npx playwright install chromium
npm run test:e2e
```

Os testes usam um PostgreSQL embarcado (PGlite) descartável, sem conexão com a branch configurada no arquivo de ambiente. O Playwright sobe o build de produção na porta 3841. Para aproveitar um navegador Edge já instalado, defina `PLAYWRIGHT_CHANNEL=msedge` no ambiente do teste.

## Operação do painel

- Em **Empresas**, cadastre nome, segmento e localização. Site e contato são opcionais. A busca aceita nome, cidade e segmento, com filtro por etapa.
- Em **Oportunidades**, mova empresas entre as onze etapas. Abra uma empresa para ver as alterações recentes e registrar uma nota.
- Em **Pesquisas**, cadastre os critérios e abra uma pesquisa salva para executar o piloto de descoberta por OpenStreetMap. Em um ambiente de desenvolvimento, defina `ENABLE_OSM_PILOT=true` e reinicie o servidor. Use Brasil, UF por nome ou sigla, nome do município tal como consta no OSM e limite de até 50. Deixe avaliação, quantidade de avaliações e raio vazios. Os resultados ficam em uma área separada do CRM.
- Em **Visão geral**, compare o funil e as contagens por período de cadastro. A conversão usa a etapa atual das empresas cadastradas no período.

Leia a documentação de [arquitetura](docs/architecture.md), [banco](docs/database.md), [fontes](docs/data-sources.md), [segurança](docs/security.md) e [implantação](docs/deployment.md).
