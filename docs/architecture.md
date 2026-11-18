# Arquitetura da Fase 1

Next.js App Router renderiza as telas privadas no servidor. Os formulários usam Server Actions para validar e persistir os dados. Better Auth autentica e grava sessões no PostgreSQL. O provisionamento local usa o hash de senha da própria biblioteca.

- `src/app/(painel)` organiza as páginas privadas e suas Server Actions.
- `src/domain.ts` define validação e etapas compartilhadas.
- `src/features/companies.ts` implementa as operações transacionais de empresa e CRM.
- `src/db` define o pool Node.js e o esquema Drizzle.
- `drizzle` contém a migração e o histórico do esquema.
- `tests` valida o domínio, aplica a migração e testa o fluxo pelo navegador contra o build.

O cadastro manual persiste diretamente em `companies`. Pesquisas guardam apenas configuração. Uma futura execução de pesquisa deve registrar seus próprios resultados, com origem, licença e retenção, e importar ao CRM mediante revisão.

A interface usa componentes próprios e Tailwind CSS. Formulários usam recursos nativos de React e Next.js. A Fase 1 usa SQL síncrono por operação e dispensa filas.
