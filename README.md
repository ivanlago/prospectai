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
- Em **Pesquisas**, salve os critérios e escolha uma fonte de descoberta. Para Salvador, Bahia, a opção **Extrato de Salvador · Geofabrik** lê o [recorte local](docs/data-sources.md#extrato-local-de-salvador). O piloto Overpass pode ser habilitado com `ENABLE_OSM_PILOT=true`. Use Brasil, UF por nome ou sigla e limite de até 50. Deixe avaliação, quantidade de avaliações e raio vazios. Os resultados ficam em uma área separada do CRM.
- Em **Visão geral**, compare o funil e as contagens por período de cadastro. A conversão usa a etapa atual das empresas cadastradas no período.

### Verificar e qualificar empresas descobertas

Nos resultados, clique no nome de uma empresa. O painel classifica a URL registrada na fonte entre rede social, plataforma de terceiros e domínio candidato. Confira a presença digital externamente e registre a situação e a evidência comercial na revisão. O servidor analisa os endereços como texto.

Marque os sinais observados, ajuste os pesos e salve. O painel exibe o score de 0 a 100, sua composição e a confiança. Uma URL ausente na fonte tem significado diferente de um site que você procurou e não localizou. A importação fica disponível após atingir o mínimo de uma revisão conclusiva. Confirme a licença de origem para criar a empresa no CRM.

### Gerar demonstrações

Configure `AI_PROVIDER=groq` com `GROQ_API_KEY` para usar GPT-OSS 20B, ou `AI_PROVIDER=gemini` com `GEMINI_API_KEY` para usar Gemini 3.1 Flash-Lite. Reinicie a aplicação. O provedor selecionado recebe nome, segmento e serviços explicitamente confirmados. Confira os termos e a política de uso de dados do plano antes de autorizar o envio. Os demais dados do CRM ficam fora da requisição.

Abra uma empresa e selecione **Gerar demonstração de site**. Escolha um dos cinco templates, informe os serviços confirmados e autorize o envio ao provedor. Confira a prévia privada e o histórico em **Sites gerados**. Campos sem confirmação são sinalizados na prévia. Leia o texto gerado antes de usá-lo em uma comunicação externa.

`AI_DAILY_LIMIT` e `AI_MONTHLY_BUDGET_USD` controlam as tentativas por dia e o orçamento estimado do mês em America/Bahia. Os padrões são cinco tentativas por dia e US$ 5 por mês. Cada tentativa reserva uma estimativa antes da chamada e registra os tokens de entrada e saída quando disponíveis. O custo usa a tarifa padrão publicada e não representa a cobrança da conta. Consulte as tarifas do [Groq](https://console.groq.com/docs/model/openai/gpt-oss-20b) e do [Gemini](https://aistudio.google.com/docs/pricing#gemini-3.1-flash-lite). Os testes de navegador usam resposta controlada de IA.

Leia a documentação de [arquitetura](docs/architecture.md), [banco](docs/database.md), [fontes](docs/data-sources.md), [segurança](docs/security.md) e [implantação](docs/deployment.md).
