import { z } from "zod";
import { composedSite, defaultEditor, editorOptions, type ComposedSite, type TemplateId } from "./site-content";

export const editFields = ["headline", "subtitle", "about", "valueProposition", "action", "palette", "font", "spacing", "servicesVisibility"] as const;
const plain = (max: number) => z.string().trim().min(5).max(max).refine(text =>
  !/[<>`]|https?:|www\.|\b\d+\b|\b(?:certificad[oa]s?|premiad[oa]s?|garantid[oa]s?|depoimentos?|avaliações)\b/i.test(text));
const fields = {
  headline: plain(100), subtitle: plain(180), about: plain(420), valueProposition: plain(140),
  action: z.enum(["Conheça os serviços", "Saiba mais"]),
  palette: editorOptions.shape.palette, font: editorOptions.shape.font, spacing: editorOptions.shape.spacing,
  servicesVisibility: z.enum(["mostrar", "ocultar"]),
};
export const editProposal = z.object({
  operations: z.array(z.object({ field: z.enum(editFields), value: z.string().trim().max(420) }).strict())
    .max(editFields.length).refine(ops => new Set(ops.map(op => op.field)).size === ops.length &&
      ops.every(op => fields[op.field].safeParse(op.value).success)),
}).strict();
export type EditProposal = z.infer<typeof editProposal>;

export function applyOperations(content: ComposedSite, template: TemplateId, proposal: EditProposal) {
  const editor = content.editor ?? defaultEditor(content, template);
  const copy = { ...content.copy };
  const appearance = { ...editor };
  let valueProposition = content.valueProposition;
  for (const { field, value } of proposal.operations) {
    switch (field) {
      case "headline": case "subtitle": case "about": copy[field] = value; break;
      case "action": copy.action = fields.action.parse(value); break;
      case "valueProposition": valueProposition = value; break;
      case "palette": appearance.palette = fields.palette.parse(value); break;
      case "font": appearance.font = fields.font.parse(value); break;
      case "spacing": appearance.spacing = fields.spacing.parse(value); break;
      case "servicesVisibility":
        if (value === "mostrar" && !content.services.length) return undefined;
        appearance.hidden = editor.hidden.filter(section => section !== "servicos");
        if (value === "ocultar") appearance.hidden.push("servicos");
        break;
    }
  }
  return composedSite.safeParse({ ...content, copy, valueProposition, editor: appearance }).data;
}
