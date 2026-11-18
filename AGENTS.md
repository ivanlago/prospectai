# ProspectAI

- Trabalhe por fases. Peça autorização ao final de uma fase antes de iniciar a seguinte. Deploy, migrações destrutivas e envio externo exigem autorização.
- Use TypeScript strict, Next.js App Router, React, Zod, Drizzle e PostgreSQL. Mantenha a interface em português brasileiro.
- Valide sessão em páginas e mutações protegidas. Trate dados de formulário e URLs como entradas não confiáveis.
- Use migrações versionadas e teste-as em um banco isolado. Nunca inclua valores de `.env.local`, tokens ou dados comerciais em commits ou logs.
- Mantenha dados próprios separados de resultados externos. Documente permissões e retenção antes de habilitar qualquer provedor.
- Antes de concluir, execute lint, typecheck, Vitest, build e Playwright. Registre resultados e pendências na entrega.
