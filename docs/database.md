# Banco de dados

Use uma branch Neon dedicada ao desenvolvimento. Configure a URL com pooler para a aplicação e a URL direta para executar as migrações. Use TLS conforme a string fornecida pelo Neon. PostgreSQL local é suportado.

| Entidades | Finalidade |
| --- | --- |
| users, accounts, sessions, verifications | Administrador único, credencial, sessão e recuperação |
| rate_limits | Janelas de tentativas por operação |
| companies | Dados cadastrados manualmente e etapa atual |
| searches | Critérios para pesquisas futuras |
| website_projects, website_revisions | Geração original e revisões privadas de demonstrações |
| activities, audit_logs | Histórico de CRM e trilha mínima de eventos |

A chave de duplicidade combina nome, cidade, estado e país normalizados. Cadastros homônimos na mesma cidade precisam de nomes distintos. Alterações cadastrais registram o evento e sua data. A exclusão remove a empresa e suas atividades, incluindo notas. A auditoria mantém o identificador e o tipo do evento, sem copiar nome, contato ou observações.

Gere mudanças com `npm run db:generate`, revise o SQL e aplique com `npm run db:migrate` no banco de destino autorizado. Os testes aplicam o histórico em PGlite descartável e verificam a atualização da versão anterior com um projeto existente.

A migração `0004_website_revisions` cria apenas a tabela, seu índice e as chaves estrangeiras. A geração em `website_projects.content` é a revisão zero. Os rascunhos e as restaurações acrescentam linhas com uma sequência por projeto. Durante a gravação, a aplicação bloqueia a linha do projeto e compara a revisão que o operador editou com a revisão atual.

Para reverter a aplicação, restaure a versão anterior do código e mantenha a tabela aditiva. O código anterior lê a geração original. As revisões permanecem disponíveis para quando a versão com editor voltar. Qualquer remoção posterior da tabela exige autorização própria e preservação dos dados que precisarem ser recuperados.
