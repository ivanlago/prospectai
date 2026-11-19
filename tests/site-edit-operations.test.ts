import { expect, it } from "vitest";
import { applyOperations, editProposal } from "../src/features/site-edit-operations";
import { siteContent, toComposedSite } from "../src/features/site-content";

const content = toComposedSite(siteContent.parse({
  name: "Oficina", segment: "Automotivo", city: "Salvador", state: "Bahia", address: "Endereço informado",
  email: "contato@example.test", services: ["Revisão"],
  copy: { headline: "Conheça a oficina", subtitle: "Uma apresentação dos serviços.",
    about: "Informações para revisão.", action: "Saiba mais" }, seo: { title: "Oficina", description: "Demonstração" },
}));

it("aplica operações aprovadas sem alterar fatos ou contatos", () => {
  const proposal = editProposal.parse({ operations: [
    { field: "palette", value: "oceano" }, { field: "headline", value: "Conheça nossos serviços" },
    { field: "servicesVisibility", value: "ocultar" },
  ] });
  const next = applyOperations(content, "auto", proposal);
  expect(next).toMatchObject({ name: content.name, email: content.email, address: content.address, services: content.services });
  expect(next?.copy.headline).toBe("Conheça nossos serviços");
  expect(next?.editor).toMatchObject({ palette: "oceano", hidden: ["servicos"] });
});

it("recusa campos protegidos, conteúdo executável e operações repetidas", () => {
  for (const operations of [
    [{ field: "email", value: "outro@example.test" }],
    [{ field: "palette", value: "url(https://example.test)" }],
    [{ field: "headline", value: "<script>Exemplo</script>" }],
    [{ field: "font", value: "serifa" }, { field: "font", value: "sem-serifa" }],
  ]) expect(editProposal.safeParse({ operations }).success).toBe(false);
  const show = editProposal.parse({ operations: [{ field: "servicesVisibility", value: "mostrar" }] });
  expect(applyOperations({ ...content, services: [] }, "auto", show)).toBeUndefined();
});
