import { requireAdmin } from "@/auth";
import { PageHeader } from "@/components/controls";
import { SearchEditor } from "@/components/search-editor";

export default async function NewSearch() {
  await requireAdmin();
  return <><PageHeader title="Nova pesquisa" description="Defina o recorte geográfico e os filtros." />
    <section className="panel padded"><SearchEditor /></section></>;
}
