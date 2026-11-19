const originalFetch = globalThis.fetch;
const endpoint = "https://overpass.private.coffee/api/interpreter";

globalThis.fetch = (input, init) => {
  if (input === "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent") {
    const data = JSON.parse(init.body);
    const company = JSON.parse(data.contents[0].parts[0].text);
    if (company.name !== "Oficina Central" || !["Manutenção preventiva", "Cuidados faciais"].includes(company.services[0]) ||
        Object.keys(company).sort().join() !== "name,segment,services") {
      return Promise.resolve(new Response(null, { status: 400 }));
    }
    return Promise.resolve(Response.json({
      candidates: [{ finishReason: "STOP", content: { parts: [{ text: JSON.stringify({
        headline: "Cuidado em cada detalhe", subtitle: "Conheça a proposta de atendimento da oficina.",
        about: "Uma apresentação dos serviços desta oficina.", action: "Conheça os serviços",
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
