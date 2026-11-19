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

- Em **CRM**, cadastre nome, segmento e localização. Site e contato são opcionais. A busca aceita nome, cidade e segmento, com filtro por etapa.
- Em **Oportunidades**, mova empresas entre as onze etapas. Abra uma empresa para ver as alterações recentes e registrar uma nota.
- No **Dashboard**, selecione **Iniciar pesquisa** para definir os critérios. Escolha uma fonte e use **Salvar e executar** ou salve os critérios para voltar depois em **Encontrar empresas**. Para Salvador, Lauro de Freitas e Camaçari, use o [extrato municipal da Geofabrik](docs/data-sources.md#extratos-municipais). O piloto Overpass pode ser habilitado com `ENABLE_OSM_PILOT=true`. Use Brasil, UF por nome ou sigla e limite de até 50. As fontes atuais não oferecem avaliações ou busca por raio. Os resultados ficam em uma área separada do CRM.
- Nos resultados, alterne entre **Cards** e **Tabela**, filtre por presença digital, revisão, localização ou segmento e abra a revisão de cada oportunidade. O botão **Reexecutar consulta** usa os critérios da execução aberta e respeita os limites da fonte.
- No **Dashboard**, compare o funil e os indicadores por período de cadastro. A conversão usa a etapa atual das empresas cadastradas no período.
- Em **Configurações**, consulte a conta administrativa e alterne entre os temas claro e escuro. A escolha é salva no navegador.

### Verificar e qualificar empresas descobertas

Nos resultados, clique no nome de uma empresa. O painel classifica a URL registrada na fonte entre rede social, plataforma de terceiros e domínio candidato. Confira a presença digital externamente e registre a situação e a evidência comercial na revisão. O servidor analisa os endereços como texto.

Marque os sinais observados, ajuste os pesos e salve. O painel exibe o score de 0 a 100, sua composição e a confiança. Uma URL ausente na fonte tem significado diferente de um site que você procurou e não localizou. A importação fica disponível após atingir o mínimo de uma revisão conclusiva. Confirme a licença de origem para criar a empresa no CRM.

### Gerar demonstrações

Configure `AI_PROVIDER=groq` com `GROQ_API_KEY` para usar GPT-OSS 20B, ou `AI_PROVIDER=gemini` com `GEMINI_API_KEY` para usar Gemini 3.1 Flash-Lite. Reinicie a aplicação. O provedor selecionado recebe nome, segmento e serviços explicitamente confirmados. Confira os termos e a política de uso de dados do plano antes de autorizar o envio. Os demais dados do CRM ficam fora da requisição.

Abra uma empresa e selecione **Gerar demonstração de site**. Escolha um dos sete templates, informe os serviços confirmados e autorize o envio ao provedor. Se desejar, inclua diferenciais confirmados, contatos comerciais e uma foto com permissão de uso. Esses dados adicionais ficam na prévia privada. A geração nova abre na **Prévia composta**, com seções conforme os dados disponíveis. Os atalhos de comparação também permitem consultar os layouts anteriores. Confira o histórico em **Sites gerados** e revise o texto gerado antes de qualquer uso externo.

`AI_DAILY_LIMIT` e `AI_MONTHLY_BUDGET_USD` controlam as tentativas por dia e o orçamento estimado do mês em America/Bahia. Os padrões são cinco tentativas por dia e US$ 5 por mês. Cada tentativa reserva uma estimativa antes da chamada e registra os tokens de entrada e saída quando disponíveis. O custo usa a tarifa padrão publicada e não representa a cobrança da conta. Consulte as tarifas do [Groq](https://console.groq.com/docs/model/openai/gpt-oss-20b) e do [Gemini](https://aistudio.google.com/docs/pricing#gemini-3.1-flash-lite). Os testes de navegador usam resposta controlada de IA.

Na demonstração, use **Editar demonstração** para atualizar os textos, organizar as seções e trocar foto, paleta, tipografia ou espaçamento. Alterne entre **Desktop** e **Celular** para revisar a composição. **Salvar rascunho** cria uma revisão privada. Para recuperar uma anterior, selecione-a no histórico e use **Restaurar revisão**.

No editor, o **Assistente de edição** propõe mudanças sobre a última revisão salva. Após autorizar o envio do pedido e do contexto, confira os valores atuais e propostos. **Aplicar proposta** cria uma revisão, e **Desfazer alteração da IA** restaura a anterior. O limite de tentativas e o orçamento são compartilhados com a geração inicial. O envio inclui textos editáveis, segmento, template, aparência e quantidade de serviços. A integração não inclui foto, canais de contato, endereço ou notas do CRM como campos do contexto.

Em **Compartilhar demonstração**, revise a cópia pública e escolha validade de **1, 7 ou 30 dias**. Quem tiver o link pode abrir a demonstração sem login. Copie o endereço quando for criado e revogue o acesso na lista de links. Edições posteriores não alteram uma cópia já compartilhada.

A ficha no **CRM** reúne as demonstrações vinculadas, as revisões atuais, a quantidade de links ativos e o histórico de criação e revogação. Use **Gerenciar links** para emitir ou revogar links da demonstração. Em **Origem e evidências**, consulte as revisões importadas e suas referências. Importar novamente uma referência já vinculada reaproveita o cadastro e preserva sua etapa comercial.

Leia a documentação de [arquitetura](docs/architecture.md), [banco](docs/database.md), [fontes](docs/data-sources.md), [segurança](docs/security.md) e [implantação](docs/deployment.md).
