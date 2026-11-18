const originalFetch = globalThis.fetch;
const endpoint = "https://overpass.private.coffee/api/interpreter";

globalThis.fetch = (input, init) => {
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
