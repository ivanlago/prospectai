# Arquitetura da Fase 1

Next.js App Router renderiza as telas privadas no servidor. Os formulários usam Server Actions para validar e persistir os dados. Better Auth autentica e grava sessões no PostgreSQL. O provisionamento local usa o hash de senha da própria biblioteca.

O gerador salva documentos com `version: 1` no JSONB existente de `website_projects.content`. A leitura também aceita os projetos anteriores sem versão. Gemini e Groq devolvem o mesmo contrato validado por Zod. Cada descrição referencia o índice de um serviço confirmado, e o servidor preserva os nomes, contatos, foto e diferenciais fornecidos pelo operador. O modelo recebe somente nome, segmento e serviços. A composição usa componentes, opções de estilo e categorias de mídia predefinidos. A foto autorizada fica no documento privado e as sugestões de imagem são textuais.

A ficha de CRM usa o vínculo entre empresa e projeto para consultar revisões e eventos de compartilhamento sem carregar as cópias públicas. O endereço completo de um link continua disponível apenas na emissão. As origens de pesquisa aprovadas no CRM preservam a referência, a evidência e as datas separadamente dos resultados temporários. A rota pública lê apenas a projeção aprovada do documento e o estado de disponibilidade do projeto.

- `src/app/(painel)` organiza as páginas privadas e suas Server Actions.
- `src/domain.ts` define validação e etapas compartilhadas.
- `src/features/companies.ts` implementa as operações transacionais de empresa e CRM.
- `src/db` define o pool Node.js e o esquema Drizzle.
- `drizzle` contém a migração e o histórico do esquema.
- `tests` valida o domínio, aplica a migração e testa o fluxo pelo navegador contra o build.

O cadastro manual persiste diretamente em `companies`. Pesquisas guardam apenas configuração. Uma futura execução de pesquisa deve registrar seus próprios resultados, com origem, licença e retenção, e importar ao CRM mediante revisão.

A interface usa componentes próprios e Tailwind CSS. Formulários usam recursos nativos de React e Next.js. A Fase 1 usa SQL síncrono por operação e dispensa filas.
