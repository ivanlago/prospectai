import { notFound } from "next/navigation";
import { requireAdmin } from "@/auth";
import { PageHeader } from "@/components/controls";
import { ActionForm } from "@/components/forms";
import { id } from "@/domain";
import { getCompany } from "@/features/companies";
import { suggestedTemplate, templates } from "@/features/site-content";
import { generationConfig } from "@/features/site-projects";
import { siteAiProvider } from "@/integrations/ai/provider";
import { buildSite } from "../../actions";

export const metadata = { title: "Gerar demonstração" };

export default async function NewSite({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const companyId = id.safeParse((await params).id).data;
  if (!companyId) notFound();
  const company = await getCompany(companyId);
  if (!company) notFound();
  const config = generationConfig();
  const adapter = siteAiProvider();
  const showBudget = adapter?.id !== "groq" || process.env.GROQ_PAID_PLAN === "true";
  const money = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "USD", maximumFractionDigits: 6 });

  return <>
    <PageHeader title="Gerar demonstração" description={company.name} href={`/empresas/${company.id}`} action="Voltar à empresa" />
    <section className="panel padded stack">
      {adapter && config ? <>
        <p>{adapter.label} · {config.daily} tentativa(s) por dia{showBudget && <> · orçamento mensal estimado de {money.format(config.budget)}</>}.</p>
        {showBudget && <p>A tentativa reserva {money.format(adapter.reservedMicros / 1000000)} no orçamento interno, pela tarifa padrão. A cobrança efetiva depende do plano.</p>}
        <ActionForm action={buildSite.bind(null, company.id, adapter.id)} label="Gerar demonstração">
          <label>Template<select name="template" defaultValue={suggestedTemplate(company.segment)}>
            {Object.entries(templates).map(([key, template]) => <option key={key} value={key}>{template.label}</option>)}
          </select></label>
          <label>Serviços confirmados (um por linha)<textarea name="serviceLines" maxLength={1100} rows={5} placeholder="Até oito serviços. Deixe em branco se ainda precisam de confirmação." /></label>
          <label>Foto autorizada da empresa para Beleza e estética ou Clínicas dentárias
            <input name="photo" type="file" accept="image/jpeg,image/png,image/webp" />
            <small>Opcional. JPEG, PNG ou WebP de até 500 KB. A foto fica na prévia privada.</small>
          </label>
          {company.address && <label className="toolbar"><input type="checkbox" name="includeAddress" />Incluir endereço comercial confirmado na demonstração</label>}
          <div className="field-grid">
            <label>E-mail comercial autorizado<input name="email" type="email" maxLength={254} /></label>
            <label>WhatsApp comercial autorizado<input name="whatsapp" type="tel" inputMode="numeric" maxLength={15} placeholder="Somente dígitos, incluindo país e DDD" pattern="[1-9][0-9]{9,14}" /></label>
          </div>
          <label className="toolbar"><input type="checkbox" name="authorize" required />Confirmo o nome, segmento e serviços comerciais acima e autorizo o envio desses dados ao {adapter.label}.</label>
        </ActionForm>
      </> : <p role="status">A geração aguarda a configuração do provedor de IA e dos limites no servidor.</p>}
    </section>
  </>;
}
