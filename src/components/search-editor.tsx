import { persistSearch } from "@/app/(painel)/actions";
import { ActionForm } from "./forms";
import type { searchForm } from "@/domain";
import type { z } from "zod";

export function SearchEditor({ saved, id }: { saved?: z.infer<typeof searchForm>; id?: string }) {
  const fields = [
    ["name", "Nome da pesquisa", true], ["country", "País", true], ["state", "Estado", true],
    ["city", "Cidade", true], ["region", "Bairro ou região", false], ["segment", "Segmento", true],
    ["keyword", "Palavra-chave", false],
  ] as const;
  return <ActionForm action={persistSearch.bind(null, id ?? null)} label="Salvar pesquisa">
    <div className="field-grid">
      {fields.map(([key, label, required]) => <label key={key}>{label}<input name={key} required={required}
        maxLength={160} defaultValue={saved?.[key] ?? (key === "country" ? "Brasil" : "")} /></label>)}
      <label>Raio (km)<input name="radius" type="number" min={1} max={50} defaultValue={saved?.radius ?? ""} /></label>
      <label>Avaliação mínima<input name="rating" type="number" min={0} max={5} step="0.1" defaultValue={saved?.rating ?? ""} /></label>
      <label>Mínimo de avaliações<input name="reviews" type="number" min={0} max={1000000} defaultValue={saved?.reviews ?? ""} /></label>
      <label>Presença de site<select name="presence" defaultValue={saved?.presence ?? "any"}><option value="any">Qualquer</option><option value="without">Sem site cadastrado</option><option value="with">Com site cadastrado</option></select></label>
      <label>Limite de resultados<input name="limit" type="number" min={1} max={100} required defaultValue={saved?.limit ?? 20} /></label>
    </div>
  </ActionForm>;
}
