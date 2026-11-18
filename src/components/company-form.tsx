import type { companies } from "@/db/schema";
import { persistCompany } from "@/app/(painel)/actions";
import { ActionForm } from "./forms";

export function CompanyForm({ company }: { company?: typeof companies.$inferSelect }) {
  const fields = [
    ["name", "Nome", true, 160], ["segment", "Segmento", true, 160], ["country", "País", true, 160],
    ["state", "Estado", true, 160], ["city", "Cidade", true, 160], ["address", "Endereço comercial", false, 300],
    ["website", "Site", false, 2048], ["contact", "Contato comercial", false, 300],
  ] as const;
  return <ActionForm action={persistCompany.bind(null, company?.id ?? null)} label="Salvar empresa">
    <div className="field-grid">{fields.map(([key, label, required, max]) =>
      <label key={key}>{label}<input name={key} required={required} maxLength={max} type={key === "website" ? "url" : "text"}
        defaultValue={company?.[key] ?? (key === "country" ? "Brasil" : "")} /></label>)}</div>
    <label>Observações<textarea name="notes" rows={4} maxLength={4000} defaultValue={company?.notes} /></label>
  </ActionForm>;
}
