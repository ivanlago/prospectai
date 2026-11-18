import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/auth";
import { PageHeader } from "@/components/controls";
import { DeleteForm } from "@/components/forms";
import { SearchEditor } from "@/components/search-editor";
import { getDb } from "@/db";
import { searches } from "@/db/schema";
import { id, searchForm } from "@/domain";
import { removeSearch } from "../../actions";

export default async function EditSearch({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const searchId = id.safeParse((await params).id).data;
  if (!searchId) notFound();
  const [row] = await getDb().select().from(searches).where(eq(searches.id, searchId));
  if (!row) notFound();
  const saved = searchForm.safeParse({ ...(row.config as object), name: row.name }).data;
  return <><PageHeader title={row.name} description="Edite os critérios salvos para esta pesquisa." />
    <section className="panel padded stack"><SearchEditor saved={saved} id={row.id} />
      <DeleteForm action={removeSearch.bind(null, row.id)} label="Excluir pesquisa" /></section></>;
}
