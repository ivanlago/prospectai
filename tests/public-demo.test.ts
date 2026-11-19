import { expect, it } from "vitest";
import { demoPreview, projectPublicDemo, publicDemo } from "../src/features/public-demo";
import { defaultEditor, siteContent, toComposedSite } from "../src/features/site-content";

const document = toComposedSite(siteContent.parse({
  name: "Oficina", segment: "Automotivo", city: "Salvador", state: "Bahia", address: "Endereço privado",
  email: "interno@example.test", whatsapp: "5571999999999", photo: "data:image/png;base64,AAAA", services: ["Revisão"],
  copy: { headline: "Conheça a oficina", subtitle: "Uma apresentação dos serviços.", about: "Informações para revisão.", action: "Saiba mais" },
  seo: { title: "Oficina", description: "Descrição interna" },
}));

it("armazena somente os dados aprováveis e exclui seções comerciais ocultas", () => {
  const snapshot = projectPublicDemo({ ...document, editor: { ...defaultEditor(document, "auto"), hidden: ["servicos"] } }, "auto");
  expect(snapshot).toMatchObject({ template: "auto", name: "Oficina", services: [], serviceDescriptions: [] });
  for (const name of ["address", "email", "whatsapp", "photo", "seo", "images", "projectId", "notes"]) {
    expect(snapshot).not.toHaveProperty(name);
  }
  expect(demoPreview(snapshot)).toMatchObject({ address: "", email: "", whatsapp: "" });
  expect(publicDemo.safeParse({ ...snapshot, notes: "CRM" }).success).toBe(false);
});
