# ProspectAI 2.0 — auditoria e plano de implementação

Fase 0, 19/11/2026. Baseline de código `7e58b06`, branch local `feat/prospectai-v2`. A auditoria cobre o repositório e a execução local isolada. A produção ficou fora do escopo.

## Estado atual

- Next.js App Router, React, TypeScript em modo estrito, Tailwind CSS, Drizzle e PostgreSQL via `pg`. O README recomenda Neon. Preservar a stack e os contratos de rotas.
- O layout privado e as páginas consultadas usam `requireAdmin`. As mutações de CRM, pesquisas, revisão, sites e logout também verificam a sessão no servidor. Better Auth desabilita cadastro público e o banco restringe a instância a um administrador. Os dados de negócio são globais à instância. Qualquer expansão para múltiplas contas exige definir propriedade e autorização por registro.
- Zod valida formulários, UUIDs e parte dos parâmetros de consulta. URLs comerciais são classificadas ou exibidas como texto. Os pedidos externos observados usam endpoints definidos pelos adaptadores. O Next.js define cabeçalhos contra enquadramento, MIME sniffing e indexação.
- O esquema e o diário Drizzle correspondem a quatro migrações versionadas. `0000` cria autenticação, CRM, pesquisas e auditoria. `0001` adiciona execuções e resultados. `0002` adiciona revisão e proveniência. `0003` adiciona projetos de site com estado, JSONB e consumo de IA. Os registros próprios ficam em `companies` e os resultados temporários em `discovery_results`.

## Funcionalidades existentes e limitações observadas

| Área | Reaproveitar | Limitação observada |
| --- | --- | --- |
| Painel | `(painel)/layout.tsx`, dashboard, `controls.tsx`, `theme.tsx`, tokens de `globals.css`, métricas, funil, filtros de período e estados vazios | A chamada principal abre o cadastro manual. O menu se reorganiza no mobile e carece de controle para recolher e indicação de rota ativa. Empresas recentes aparecem como lista. |
| Descoberta | `discovery.ts`, `overpass.ts`, `municipal-extract.ts`, pesquisas salvas, histórico paginado, paginação de resultados, aviso de truncamento e deduplicação | A seleção de adaptadores e a validação estão acopladas a OSM. Avaliações, número de avaliações e raio são recusados para essas fontes. Resultados aparecem em tabela, ordenados por nome. A ausência de URL aparece como “Sem URL disponível”. |
| Execuções | Reserva transacional, uma execução ativa, opções de cancelamento e limites do Overpass de cinco tentativas em 24 horas e um minuto entre chamadas | A chamada roda dentro da ação. O estado do banco impede publicação de resultado cancelado, mas o aborto imediato depende do processo que possui o controlador. Os resultados e as revisões ficam indisponíveis após sete dias. A limpeza física depende de nova execução, enquanto o histórico resumido permanece. |
| Qualificação | Classificação de URL, evidência manual, score com pesos, confiança e limiar. Ausência na fonte fica distinta de site não localizado após revisão. Importação exige qualificação e confirmação de licença. | A revisão é atualizada em uma única linha por resultado. Na colisão por identidade com empresa existente, a importação retorna o ID existente sem anexar a nova proveniência. A chave primária de `company_sources` permite uma origem por empresa. |
| CRM | Cadastro, edição, exclusão, prevenção de duplicidade por identidade, funil de onze etapas, notas e atividades | O vínculo projeto–empresa aceita nulo após exclusão. Preservar esse comportamento para prévias privadas e definir o efeito da exclusão sobre compartilhamentos públicos. |
| Sites | `site-projects.ts`, `site-content.ts`, `site-ai.ts`, adaptadores Gemini/Groq, validação Zod, orçamento, histórico e renderizadores `SitePreview`, `BeautyPreview`, `ClinicPreview` e `DentalPreview` | O modelo retorna título, subtítulo, apresentação e uma chamada de conjunto fechado. Os serviços são linhas confirmadas; SEO é montado localmente. Os seis IDs de template incluem saúde, odontologia e beleza com prévias especializadas. Salão e barbearia entram em beleza. A composição é fixa. As rotas de sites oferecem geração e leitura privada, sem editor, versões de conteúdo ou rota pública. |

## Dependências externas e dados

| Dependência | Uso e condição para evolução |
| --- | --- |
| OSM / Overpass Private.coffee | Piloto configurável. Consulta região e categoria com limites de volume e tempo. Preservar atribuição ODbL e regras documentadas de expiração. |
| Geofabrik / IBGE | Extratos locais de Salvador, Lauro de Freitas e Camaçari com data de versão e fallback para cópia distribuída no projeto. Preservar cobertura, atribuição e origem. |
| Gemini / Groq | O operador confirma envio de nome, segmento e serviços. Limites diários e estimativa mensal usam America/Bahia. Revisar permissões e retenção do plano contratado antes de ampliar o contexto enviado. |
| Resend | Recuperação opcional com remetente configurado. A validação local usa dados sintéticos e dispensa envio de e-mails. |
| Google Places | Opção futura condicionada a configuração e validação de finalidade, atribuição, persistência, TTL e campos permitidos. O contrato do provedor deve manter valores indisponíveis distintos de zero e a origem atrelada ao resultado. |

As condições acima descrevem a configuração e a documentação do repositório. Contratos vigentes e permissões de novos usos serão verificados na fase que propuser habilitá-los.

## Riscos de regressão

- Mudanças de navegação podem quebrar links, redirecionamentos de ações e locators do Playwright. Manter rotas, formulários e autenticação e ajustar testes para os nomes acessíveis aplicáveis.
- Ordenação, filtros e agregações devem operar antes da paginação com desempate estável. Preservar resultados importados, expiração, bloqueios concorrentes e a distinção entre identidade do CRM e referência da fonte.
- O score atual pressupõe evidência de revisão. Filtros e cards devem distinguir estado informado pela fonte, observação do operador e score calculado.
- O JSONB atual já tem consumidores. Adotar leitura compatível ou adaptação de versões, com fixtures de projetos antigos. O fluxo de geração reserva orçamento antes da chamada e deve fechar a tentativa com estado coerente mesmo se a composição local falhar.
- O prompt e os filtros de texto da IA não comprovam veracidade. Vincular fatos a campos confirmados, manter revisão humana e aplicar projeção pública explícita. Fotos anexadas devem ter origem e permissão confirmadas antes de compartilhar.

## Plano incremental

| Fase | Entrega e aceite |
| --- | --- |
| 1. Painel | Adaptar layout e tokens, adicionar menu recolhível com rota ativa, navegação por teclado e estado mobile. Colocar pesquisa em primeiro plano com entrada pelo fluxo existente de `/pesquisas/nova`. Manter métricas e período, apresentar empresas recentes em cards e validar carregamento, erro e temas. Mapear Dashboard, Encontrar empresas, Oportunidades, Sites gerados e CRM às rotas atuais e criar uma entrada funcional de configurações. Validar login, links antigos, foco e viewport estreito. |
| 2. Pesquisa e resultados | Extrair contrato tipado de provedores com capacidades, cobertura e políticas de retenção. Adaptar OSM e extrato antes de habilitar outros. Unificar formulário e execução, derivar filtros de avaliações das capacidades, preservar histórico e permitir reexecução sujeita à cota. Separar estado da execução da instância que atende o pedido. Aplicar cache e expurgo conforme cada fonte. Oferecer cards e tabela, filtros na consulta, paginação estável, atribuição e estados incompletos. Testar limites, duplicidade, falha, cancelamento e importação. |
| 3. Gerador | Definir documento de site versionado e validado por Zod. Mapear serviços por referência a dados confirmados. Montar seções compostas com componentes React controlados e sete identidades, incluindo salão/barbearia. Omitir dados insuficientes na renderização destinada a compartilhamento e sinalizar pendências na prévia privada. Validar respostas dos dois adaptadores, renderizar documentos antigos e manter métricas de custo. |
| 4. Editor | Integrar árvore de seções, prévia desktop/mobile e painel de propriedades. Restringir estilos e componentes a opções tipadas. Adicionar revisões no PostgreSQL com rascunho, controle de concorrência e restauração que cria nova revisão. Testar persistência, propriedades inválidas e conflitos. |
| 5. Edição conversacional | Validar uma lista permitida de operações Zod sobre a revisão base. Mostrar proposta e aplicar só após confirmação, registrar custo, tokens e falhas e permitir desfazer. Proteger fatos confirmados e rejeitar propostas desatualizadas. |
| 6. Compartilhamento | Servir `/demo/[token]` com token aleatório, hash persistido, expiração e revogação. Vincular a uma revisão específica com projeção pública permitida e indicação de demonstração independente. Validar isolamento do CRM, cache compatível com revogação e cabeçalhos de não indexação. |
| 7. Integração final | Exibir demonstrações, versões, links e eventos na empresa correspondente. Tratar proveniência preservando revisões e referências originais. Executar o percurso completo da pesquisa à revogação e consolidar documentação de operação, permissões e retenção. |

Para mudanças de banco nas fases futuras, usar migrações aditivas e testar tanto um banco vazio quanto a atualização de uma cópia isolada do esquema anterior com dados sintéticos. Planejar retorno à versão anterior da aplicação mantendo as novas estruturas compatíveis. Alterações de banco, produção e envio externo seguem os pontos de autorização do projeto.

Na Fase 2, manter país, UF, cidade, bairro ou região, segmento, palavra-chave, presença de site e limite em um contrato de pesquisa validado no servidor. Incluir avaliação mínima e quantidade mínima somente segundo as capacidades da fonte. Cada resultado deve identificar fonte e data da consulta e distinguir site informado, somente rede social identificada, site não informado, site não localizado após revisão e presença não verificada. Ações em lote devem comunicar o efeito e exigir confirmação quando aplicável.

Na Fase 6, testar acesso sem login, expiração, revogação e remoção do vínculo comercial. A projeção deve aceitar apenas campos aprovados para a demonstração e excluir evidências, notas, atividades e identificadores internos. Para eventuais buscas de imagens ou URLs externas no servidor, exigir validação de destinos, endereços resolvidos e redirecionamentos, além de limites de tempo e tamanho.

## Verificações da Fase 0

| Comando | Resultado final |
| --- | --- |
| `npm run lint` | Passou. |
| `npm run typecheck` | Passou em nova execução sequencial. |
| `npm test` | 22 testes em 6 arquivos. Inclui aplicação das quatro migrações em PGlite descartável. |
| `npm run build` | Passou com configuração local de teste. |
| `npm run test:e2e` | 6 testes no Edge, incluindo os três extratos municipais. Banco PGlite via loopback e respostas controladas de Overpass e Gemini. |

A primeira execução de typecheck coincidiu com o build e encontrou arquivos gerados em transição. O build inicialmente retornou erro genérico de webpack no sandbox e o Playwright encontrou `EACCES` no loopback. Ambos passaram na execução autorizada. A fase realizou apenas a auditoria documental e os testes locais, sem mudança de esquema ou de dados comerciais.
