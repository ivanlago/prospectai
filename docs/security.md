# Segurança e operação

- Better Auth verifica a sessão no servidor. O provisionamento usa o hash do Better Auth e uma restrição de administrador único no banco.
- O login, a solicitação de recuperação e a redefinição usam um limite de cinco tentativas por operação e por janela fixa de um minuto, gravado no banco. O padrão agrupa tentativas por operação em toda a instância. Configure `AUTH_IP_HEADER` apenas quando o proxy substituir o cabeçalho com um IP confiável.
- Use HTTPS em produção e defina `BETTER_AUTH_URL` como a origem exata. As Server Actions validam a sessão e o framework valida a origem das requisições. O logout encerra a sessão no servidor.
- As páginas privadas usam cabeçalhos contra indexação, enquadramento e inferência de tipo. React escapa os valores de cadastro. URLs cadastradas são texto nesta fase.
- Configure recuperação por e-mail somente com um remetente verificado. O e-mail contém um token de uso único, expira em quinze minutos e a redefinição revoga sessões.
- Restrinja acesso ao banco e ao ambiente de execução. Remova a senha de provisionamento após o uso. Revise periodicamente a finalidade dos cadastros, os backups e a retenção dos registros de auditoria.
- O servidor registra identificadores de eventos técnicos. Integre coleta e alertas ao configurar o ambiente de produção.
- A rota `/demo/[token]` serve somente uma cópia aprovada de uma revisão. O token tem 256 bits aleatórios e aparece por inteiro apenas na criação. A rota usa `no-store`, `noindex` e `no-referrer`. Revogação, expiração e perda do vínculo com a empresa bloqueiam novas visitas. Nas configurações de observabilidade do hospedeiro, restrinja acesso aos caminhos completos ou mascare o segmento do token.
