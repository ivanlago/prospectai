# Fontes de dados

## OpenStreetMap

Os dados são licenciados pela ODbL. O piloto usa Overpass para selecionar estabelecimentos nomeados por município, UF e categoria. A interface exibe crédito aos colaboradores e vincula cada resultado ao elemento de origem. Os dados externos ficam em `discovery_results` e as execuções, em `search_runs`. Uma execução registra a fonte, os filtros, o horário, o estado final e a quantidade retornada. Não são persistidos telefone, e-mail ou a resposta integral do provedor.

Cada execução autorizada reserva uma chamada, inclusive se houver erro ou cancelamento. O piloto aceita um administrador, uma execução em andamento, pelo menos um minuto entre chamadas e cinco chamadas em 24 horas. Limita a leitura a 250 candidatos, 50 resultados e 1,5 MB de resposta, com timeout de 18 segundos. Custo direto conhecido por chamada no piloto comunitário: R$ 0. Erros de capacidade são exibidos ao administrador e não disparam reenvio automático.

Os filtros de palavra-chave, bairro e site usam os campos retornados e podem deixar estabelecimentos de fora. OSM não oferece avaliação pública ou quantidade de avaliações neste fluxo. A ausência de URL é uma informação incompleta da fonte. A deduplicação por nome e localização é indicativa.

Resultados ficam visíveis por sete dias. A próxima execução aceita remove do banco os resultados que já expiraram. O histórico preserva status, parâmetros e contagens. Para uma operação sempre ativa, programe limpeza regular de resultados vencidos e escolha uma instância própria ou contratada conforme volume e disponibilidade desejada.

Referências: [licença e atribuição OSM](https://www.openstreetmap.org/copyright) e [termos da instância Private.coffee](https://overpass.private.coffee/).

## Outras fontes

| Fonte | Situação |
| --- | --- |
| Google Places | Desabilitada. A política limita armazenamento e usos derivados e exige atribuição e páginas públicas de termos e privacidade. Antes de integrar, avalie a compatibilidade de cada uso com o contrato. [Política da Places API](https://developers.google.com/maps/documentation/places/web-service/policies). |
| Bases públicas | Desabilitadas. Cada conjunto exige avaliação da licença, formato, atualização e autorização de reutilização comercial. |
| Fornecedores comerciais | Desabilitados. Selecione somente com contrato explícito para prospecção, retenção e dados derivados. |
| Cadastro manual | Disponível no CRM. Utilize dados de cadastro próprios ou autorizados e mantenha só as informações necessárias. |
| CSV | Desabilitado. A futura importação precisa registrar origem e permissão de reutilização do conjunto. |
