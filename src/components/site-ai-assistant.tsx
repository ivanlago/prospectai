"use client";

import { useActionState } from "react";
import { ActionForm } from "./forms";
import { defaultEditor, type ComposedSite, type TemplateId } from "@/features/site-content";
import type { requestEdit } from "@/app/(painel)/sites/[id]/editar/ai-actions";

const labels = {
  headline: "Título principal", subtitle: "Subtítulo", about: "Apresentação", valueProposition: "Proposta de valor",
  action: "Chamada para ação", palette: "Paleta", font: "Tipografia", spacing: "Espaçamento", servicesVisibility: "Seção de serviços",
};
type State = Awaited<ReturnType<typeof requestEdit>>;

export function SiteAiAssistant({ provider, request, confirm, content, template }: {
  provider: string; request: (state: State, form: FormData) => Promise<State>;
  confirm: (attemptId: string) => Promise<string>; content: ComposedSite; template: TemplateId;
}) {
  const [state, formAction, pending] = useActionState(request, { message: "" });
  const editor = content.editor ?? defaultEditor(content, template);
  const before = { ...content.copy, valueProposition: content.valueProposition, palette: editor.palette,
    font: editor.font, spacing: editor.spacing, servicesVisibility: content.services.length && !editor.hidden.includes("servicos") ? "mostrar" : "ocultar" };
  const cost = state.costMicros === undefined ? null : new Intl.NumberFormat("pt-BR", {
    style: "currency", currency: "USD", maximumFractionDigits: 6,
  }).format(state.costMicros / 1000000);
  return <section className="panel padded stack" aria-labelledby="site-assistant">
    <div className="stack">
      <h2 id="site-assistant">Assistente de edição</h2>
      <p>A proposta usa a revisão salva. Salve o rascunho antes de pedir alterações sobre ele.</p>
    </div>
    <form action={formAction} className="stack">
      <label>O que você quer mudar?
        <textarea name="instruction" required minLength={5} maxLength={600} rows={3} placeholder="Ex.: troque a paleta para azul e branco e simplifique o título." />
      </label>
      <label className="toolbar"><input name="authorize" type="checkbox" required /> Autorizo enviar o pedido e o contexto de edição ao {provider}.</label>
      <p>O contexto inclui os textos editáveis, o segmento, a aparência e a quantidade de serviços. Evite inserir contatos ou dados privados no pedido.</p>
      <div><button className="button primary" disabled={pending}>{pending ? "Preparando proposta…" : "Gerar proposta"}</button></div>
    </form>
    {state.message && <p className="feedback" role="status">{state.message}</p>}
    {!pending && state.proposal && state.attemptId && <section className="stack" aria-labelledby="site-ai-proposal">
      <h3 id="site-ai-proposal">Alterações propostas</h3>
      <div className="table-scroll"><table><thead><tr><th>Campo</th><th>Atual</th><th>Proposta</th></tr></thead>
        <tbody>{state.proposal.operations.map(({ field, value }) => <tr key={field}>
          <th scope="row">{labels[field]}</th><td style={{ whiteSpace: "normal" }}>{before[field]}</td><td style={{ whiteSpace: "normal" }}>{value}</td>
        </tr>)}</tbody></table></div>
      <p>Estimativa {cost} · Tokens de entrada {state.inputTokens ?? "—"} · Tokens de saída {state.outputTokens ?? "—"}</p>
      <ActionForm action={confirm.bind(null, state.attemptId)} label="Aplicar proposta">{null}</ActionForm>
    </section>}
  </section>;
}
