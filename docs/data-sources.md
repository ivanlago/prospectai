# Fontes de dados

## OpenStreetMap

Os dados são licenciados pela ODbL. O piloto usa Overpass para selecionar estabelecimentos nomeados por município, UF e categoria. A interface exibe crédito aos colaboradores e vincula cada resultado ao elemento de origem. Os dados externos ficam em `discovery_results` e as execuções, em `search_runs`. Uma execução registra a fonte, os filtros, o horário, o estado final e a quantidade retornada. Não são persistidos telefone, e-mail ou a resposta integral do provedor.

Cada execução autorizada reserva uma chamada, inclusive se houver erro ou cancelamento. O piloto aceita um administrador, uma execução em andamento, pelo menos um minuto entre chamadas e cinco chamadas em 24 horas. Limita a leitura a 250 candidatos, 50 resultados e 1,5 MB de resposta, com timeout de 18 segundos. Custo direto conhecido por chamada no piloto comunitário: R$ 0. Erros de capacidade são exibidos ao administrador e não disparam reenvio automático.

Os filtros de palavra-chave, bairro e site usam os campos retornados e podem deixar estabelecimentos de fora. OSM não oferece avaliação pública ou quantidade de avaliações neste fluxo. A ausência de URL é uma informação incompleta da fonte. A deduplicação por nome e localização é indicativa.

Resultados ficam visíveis por sete dias. A próxima execução aceita remove do banco os resultados que já expiraram. O histórico preserva status, parâmetros e contagens. Para uma operação sempre ativa, programe limpeza regular de resultados vencidos e escolha uma instância própria ou contratada conforme volume e disponibilidade desejada.

A revisão de presença digital pertence ao resultado temporário e segue sua expiração. Ao importar manualmente uma oportunidade qualificada, o administrador confirma o uso sob ODbL. O CRM guarda a referência OSM, a fonte da execução, uma cópia da evidência, o score e a data da revisão. A exclusão da empresa remove esse registro de origem. Registre apenas observações comerciais necessárias.

Referências: [licença e atribuição OSM](https://www.openstreetmap.org/copyright) e [termos da instância Private.coffee](https://overpass.private.coffee/).

### Extrato local de Salvador

A opção **Extrato de Salvador · Geofabrik** consulta um recorte do arquivo OSM do Nordeste, com limite municipal pela malha do IBGE (código 2927408). Inclui estabelecimentos das categorias do painel mapeados como pontos. A data da versão aparece na execução. Esta fonte reutiliza os filtros do OpenStreetMap, tem a mesma retenção de resultados e consulta um arquivo local, sem usar a cota do Overpass. O arquivo de dados é regenerável e fica fora do Git.

Para preparar ou atualizar o extrato, baixe o PBF do [Diretório Geofabrik do Nordeste](https://download.geofabrik.de/south-america/brazil/nordeste.html) e a [malha municipal GeoJSON do IBGE](https://servicodados.ibge.gov.br/api/v3/malhas/municipios/2927408?formato=application%2Fvnd.geo%2Bjson&qualidade=intermediaria). Use a data da publicação do arquivo baixado.

```sh
python -m pip install "osmium==4.3.2" "shapely>=2.1,<3"
python scripts/extract-salvador.py nordeste-261117.osm.pbf salvador.geojson 2026-11-17
```

Defina `ENABLE_OSM_SALVADOR_EXTRACT=true` no ambiente local e reinicie o servidor. Para incluir o teste de navegador com dados reais, execute o Playwright com `PLAYWRIGHT_REAL_EXTRACT=true`. Em hospedagem, a fonte exige que o extrato seja disponibilizado ao runtime.

## Outras fontes

| Fonte | Situação |
| --- | --- |
| Google Places | Desabilitada. A política limita armazenamento e usos derivados e exige atribuição e páginas públicas de termos e privacidade. Antes de integrar, avalie a compatibilidade de cada uso com o contrato. [Política da Places API](https://developers.google.com/maps/documentation/places/web-service/policies). |
| Bases públicas | Desabilitadas. Cada conjunto exige avaliação da licença, formato, atualização e autorização de reutilização comercial. |
| Fornecedores comerciais | Desabilitados. Selecione somente com contrato explícito para prospecção, retenção e dados derivados. |
| Cadastro manual | Disponível no CRM. Utilize dados de cadastro próprios ou autorizados e mantenha só as informações necessárias. |
| CSV | Desabilitado. A futura importação precisa registrar origem e permissão de reutilização do conjunto. |
