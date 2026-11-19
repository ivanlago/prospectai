const originalFetch = globalThis.fetch;
const endpoint = "https://overpass.private.coffee/api/interpreter";

globalThis.fetch = (input, init) => {
  if (input === "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent") {
    const data = JSON.parse(init.body);
    const company = JSON.parse(data.contents[0].parts[0].text);
    if (data.generationConfig.responseJsonSchema.properties.operations) {
      if (company.instruction !== "Troque a paleta para azul e branco." ||
          Object.keys(company.site).sort().join() !== "copy,font,palette,segment,serviceCount,servicesVisible,spacing,template,valueProposition") {
        return Promise.resolve(new Response(null, { status: 400 }));
      }
      return Promise.resolve(Response.json({
        candidates: [{ finishReason: "STOP", content: { parts: [{ text: JSON.stringify({
          operations: [{ field: "palette", value: "oceano" }, { field: "headline", value: "Conheça a nossa oficina" }],
        }) }] } }],
        usageMetadata: { promptTokenCount: 120, candidatesTokenCount: 45 },
      }));
    }
    if (company.name !== "Oficina Central" || !["Manutenção preventiva", "Cuidados faciais", "Limpeza dental"].includes(company.services[0]) ||
        Object.keys(company).sort().join() !== "name,segment,services") {
      return Promise.resolve(new Response(null, { status: 400 }));
    }
    return Promise.resolve(Response.json({
      candidates: [{ finishReason: "STOP", content: { parts: [{ text: JSON.stringify({
        headline: "Cuidado em cada detalhe", subtitle: "Conheça a proposta de atendimento da oficina.",
        about: "Uma apresentação dos serviços desta oficina.", action: "Conheça os serviços",
        valueProposition: "Conheça os serviços disponíveis.",
        serviceDescriptions: [{ index: 0, description: "Consulte a empresa para conhecer os detalhes deste serviço." }],
        seo: { title: "Conheça a empresa", description: "Uma apresentação dos serviços da empresa." },
        tone: "suave", images: ["detalhes"], optionalSections: ["galeria"],
      }) }] } }],
      usageMetadata: { promptTokenCount: 300, candidatesTokenCount: 110 },
    }));
  }
  if (input !== endpoint) return originalFetch(input, init);
  const query = init?.body?.get("data");
  if (init?.method !== "POST" || !query?.includes('["name"="Salvador"]')) {
    return Promise.resolve(new Response(null, { status: 400 }));
  }
  const elements = Array.from({ length: 21 }, (_, index) => ({
    id: index + 1,
    type: "node",
    tags: { name: `Cafeteria de teste ${String(index + 1).padStart(2, "0")}`, amenity: "cafe", "addr:suburb": "Pituaçu" },
  }));
  return Promise.resolve(Response.json({ elements }));
};
