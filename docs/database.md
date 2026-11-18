# Banco de dados

Use uma branch Neon dedicada ao desenvolvimento. Configure a URL com pooler para a aplicação e a URL direta para executar as migrações. Use TLS conforme a string fornecida pelo Neon. PostgreSQL local é suportado.

| Entidades | Finalidade |
| --- | --- |
| users, accounts, sessions, verifications | Administrador único, credencial, sessão e recuperação |
| rate_limits | Janelas de tentativas por operação |
| companies | Dados cadastrados manualmente e etapa atual |
| searches | Critérios para pesquisas futuras |
| activities, audit_logs | Histórico de CRM e trilha mínima de eventos |

A chave de duplicidade combina nome, cidade, estado e país normalizados. Cadastros homônimos na mesma cidade precisam de nomes distintos. Alterações cadastrais registram o evento e sua data. A exclusão remove a empresa e suas atividades, incluindo notas. A auditoria mantém o identificador e o tipo do evento, sem copiar nome, contato ou observações.

Gere mudanças com `npm run db:generate`, revise o SQL e aplique com `npm run db:migrate` no banco de destino. Os testes aplicam a migração inicial em um banco descartável.
