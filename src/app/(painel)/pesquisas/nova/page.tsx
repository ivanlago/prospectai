import { requireAdmin } from "@/auth";
import { PageHeader } from "@/components/controls";
import { SearchEditor } from "@/components/search-editor";
import { discoverySources } from "@/integrations/discovery/registry";
import { OsmCredit } from "@/components/osm-credit";

export default async function NewSearch() {
  await requireAdmin();
  return <><PageHeader title="Nova pesquisa" description="Defina o recorte geográfico e os filtros." />
    <section className="panel padded stack">
      <SearchEditor sources={discoverySources()} />
      <OsmCredit />
    </section></>;
}
