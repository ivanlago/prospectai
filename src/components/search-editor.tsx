"use client";

import { useState } from "react";
import { persistSearch } from "@/app/(painel)/actions";
import { ActionForm } from "./forms";
import type { searchForm } from "@/domain";
import type { z } from "zod";
import type { discoverySources } from "@/integrations/discovery/registry";

export function SearchEditor({ saved, id, sources = [] }: {
  saved?: z.infer<typeof searchForm>; id?: string; sources?: ReturnType<typeof discoverySources>;
}) {
  const [sourceId, setSourceId] = useState("");
  const source = sources.find(item => item.value === sourceId);
  const legacy = saved && [saved.radius, saved.rating, saved.reviews].some(value => value !== null);
  const fields = [
    ["name", "Nome da pesquisa", true], ["country", "País", true], ["state", "Estado", true],
    ["city", "Cidade", true], ["region", "Bairro ou região", false], ["segment", "Segmento", true],
    ["keyword", "Palavra-chave", false],
  ] as const;
  return <ActionForm action={persistSearch.bind(null, id ?? null)} label="Salvar pesquisa" executeLabel={sources.length ? "Salvar e executar" : undefined}>
    <div className="field-grid">
      {fields.map(([key, label, required]) => <label key={key}>{label}<input name={key} required={required}
        maxLength={160} defaultValue={saved?.[key] ?? (key === "country" ? "Brasil" : "")} /></label>)}
      {source?.capabilities.radius && <label>Raio (km)<input name="radius" type="number" min={1} max={50} /></label>}
      {source?.capabilities.rating && <label>Avaliação mínima<input name="rating" type="number" min={0} max={5} step="0.1" /></label>}
      {source?.capabilities.reviews && <label>Mínimo de avaliações<input name="reviews" type="number" min={0} max={1000000} /></label>}
      <label>Presença de site<select name="presence" defaultValue={saved?.presence ?? "any"}><option value="any">Qualquer</option><option value="without">Sem URL informada na fonte</option><option value="with">Com URL informada na fonte</option></select></label>
      <label>Limite de resultados<input name="limit" type="number" min={1} max={source?.capabilities.maxResults ?? Math.max(50, saved?.limit ?? 0)} required defaultValue={saved?.limit ?? 20} /></label>
      {sources.length > 0 && <>
        <label>Fonte<select name="provider" value={sourceId} onChange={event => setSourceId(event.target.value)}>
          <option value="">Selecione para executar</option>
          {sources.map(item => <option key={item.value} value={item.value}>{item.label}</option>)}
        </select></label>
        {source && <label>Categoria da fonte<select key={sourceId} name="category" defaultValue="">
          <option value="">Selecione uma categoria</option>
          {source.categories.map(item => <option key={item.value} value={item.value}>{item.label}</option>)}
        </select></label>}
      </>}
    </div>
    {legacy && <label className="toolbar"><input type="checkbox" name="clearLegacy" /> Limpar filtros antigos de raio e avaliações para executar com OpenStreetMap
      <input type="hidden" name="radius" value={saved.radius ?? ""} />
      <input type="hidden" name="rating" value={saved.rating ?? ""} />
      <input type="hidden" name="reviews" value={saved.reviews ?? ""} />
    </label>}
  </ActionForm>;
}
