import { z } from "zod";
import { composedSiteFields, defaultEditor, templateId, type ComposedSite, type TemplateId } from "./site-content";

export const publicDemo = composedSiteFields.pick({
  version: true, name: true, segment: true, city: true, state: true, services: true, benefits: true,
  copy: true, valueProposition: true, serviceDescriptions: true, tone: true, editor: true,
}).extend({ template: templateId }).strict()
  .refine(content => content.serviceDescriptions.every(item => item.index < content.services.length));
export type PublicDemo = z.infer<typeof publicDemo>;

export function projectPublicDemo(content: ComposedSite, template: TemplateId): PublicDemo {
  const editor = content.editor ?? defaultEditor(content, template);
  const servicesVisible = !editor.hidden.includes("servicos");
  return publicDemo.parse({
    template, version: content.version, name: content.name, segment: content.segment, city: content.city, state: content.state,
    services: servicesVisible ? content.services : [], benefits: editor.hidden.includes("beneficios") ? [] : content.benefits,
    copy: content.copy, valueProposition: content.valueProposition,
    serviceDescriptions: servicesVisible ? content.serviceDescriptions : [], tone: content.tone, editor,
  });
}

export function demoPreview(snapshot: PublicDemo): ComposedSite {
  return {
    version: snapshot.version, name: snapshot.name, segment: snapshot.segment, city: snapshot.city, state: snapshot.state,
    services: snapshot.services, benefits: snapshot.benefits, copy: snapshot.copy, valueProposition: snapshot.valueProposition,
    serviceDescriptions: snapshot.serviceDescriptions, tone: snapshot.tone, editor: snapshot.editor,
    address: "", email: "", whatsapp: "", images: [], optionalSections: [],
    seo: { title: "Demonstração independente", description: "Prévia demonstrativa independente." },
  };
}
