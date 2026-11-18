import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { requireAdmin } from "@/auth";
import { PageHeader } from "@/components/controls";
import { ActionForm } from "@/components/forms";
import { OsmCredit } from "@/components/osm-credit";
import { id, formatDate } from "@/domain";
import { classifyWebsite, presenceLabels } from "@/features/qualification";
import { getReview } from "@/features/reviews";
import { importReview, updateReview } from "./actions";

const weights = [
  ["gapWeight", "Ausência de site após revisão", 30],
  ["infoWeight", "Informações confirmadas", 20],
  ["priorityWeight", "Segmento prioritário", 20],
  ["regionWeight", "Região prioritária", 15],
  ["staleWeight", "Site aparentemente desatualizado", 15],
  ["threshold", "Pontuação mínima", 50],
] as const;
const breakdownSchema = z.object({ confidence: z.string(), threshold: z.number(), factors: z.array(z.object({ label: z.string(), points: z.number() })),
  settings: z.record(z.string(), z.union([z.number(), z.literal("on")])).optional() });

export default async function ReviewPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const resultId = id.safeParse((await params).id).data;
  if (!resultId) notFound();
  const [entry] = await getReview(resultId);
  if (!entry) notFound();
  const { result, run, review } = entry;
  const kind = classifyWebsite(result.website);
  const detected = { unlisted: "Sem URL na fonte", invalid: "URL inválida", social: "Rede social", platform: "Plataforma de terceiros", domain: "Domínio candidato a site próprio" };
  const breakdown = breakdownSchema.safeParse(review?.breakdown).data;
  return <>
    <PageHeader title={result.name} description="Verificação e qualificação" href={`/pesquisas/execucoes/${run.id}`} action="Voltar aos resultados" />
    <section className="panel padded stack">
      <h2>Evidência da descoberta</h2><p>{detected[kind]}{result.website ? ` · ${result.website}` : ""}</p>
      <p><a href={`https://www.openstreetmap.org/${result.reference}`} rel="noreferrer" target="_blank">Abrir registro de origem no OpenStreetMap</a></p>
      <OsmCredit />
      <p>Confira a identidade da empresa e documente o que você observou. Um domínio listado ainda precisa de confirmação.</p>
    </section>
    <div className="detail-grid">
      <section className="panel padded stack">
        <h2>Revisão manual</h2>
        <ActionForm action={updateReview.bind(null, result.id)} label="Salvar revisão">
          <label>Presença digital<select name="presence" defaultValue={review?.presence ?? (kind === "unlisted" ? "website_not_listed" : "needs_review")}>
            {Object.entries(presenceLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select></label>
          <label>URL observada<input type="url" name="website" maxLength={2048} defaultValue={review?.website ?? result.website} /></label>
          <label>Evidência da revisão<textarea name="evidence" minLength={12} maxLength={1000} rows={4} required defaultValue={review?.evidence} /></label>
          <fieldset className="stack"><legend>Sinais observados</legend>
            {([["information", "Informações comerciais confirmadas"], ["priority", "Segmento prioritário"], ["region", "Região prioritária"], ["stale", "Site aparentemente desatualizado"]] as const)
              .map(([key, label]) => <label key={key} className="toolbar"><input type="checkbox" name={key} defaultChecked={breakdown?.settings?.[key] === "on"} />{label}</label>)}
          </fieldset>
          <fieldset className="field-grid"><legend>Pesos da pontuação</legend>
            {weights.map(([key, label, value]) => <label key={key}>{label}<input type="number" name={key} min={0} max={100} required defaultValue={breakdown?.settings?.[key] ?? value} /></label>)}
          </fieldset>
        </ActionForm>
      </section>
      <section className="panel padded stack">
        <h2>Qualificação</h2>
        {review && breakdown ? <>
          <p><strong>{review.score}/100 · {review.qualified ? "Qualificada" : "Pendente de qualificação"}</strong></p>
          <p>Confiança {breakdown.confidence} · {formatDate(review.reviewedAt)} · mínimo {breakdown.threshold}</p>
          <ul className="history">{breakdown.factors.map(factor => <li key={factor.label}>{factor.label} · {factor.points} ponto(s)</li>)}</ul>
          <p>A pontuação organiza a fila de prospecção.</p>
          {review.qualified && <ActionForm action={importReview.bind(null, result.id)} label="Importar para o CRM">
            <label className="toolbar"><input type="checkbox" name="permission" required />Confirmo o uso dos dados de origem sob ODbL.</label>
          </ActionForm>}
        </> : <p>Salve a revisão para calcular a pontuação.</p>}
        <Link href="/empresas">Abrir empresas do CRM</Link>
      </section>
    </div>
  </>;
}
