import { extractEnabled, extractMunicipality, extractProvider } from "./municipal-extract";
import { categoryOptions, normalize, osmEnabled, osmFilters, osmProvider, type DiscoveryFilters } from "./overpass";
import type { BusinessSearchProvider, DiscoveryProvider } from "./provider";

function osmAdapter(
  provider: BusinessSearchProvider<DiscoveryFilters>,
  options: Pick<DiscoveryProvider, "label" | "enabled" | "available" | "cacheMs" | "quota">,
): DiscoveryProvider {
  const capabilities = { rating: false, reviews: false, radius: false, maxResults: 50 };
  return {
    ...options, id: provider.id, capabilities, categories: categoryOptions, retentionMs: 7 * 86400000,
    prepare(criteria, category) {
      if (!["brasil", "br"].includes(normalize(criteria.country)) || criteria.rating !== null ||
          criteria.reviews !== null || criteria.radius !== null || criteria.limit > capabilities.maxResults) {
        return { error: "unsupported" };
      }
      const filters = osmFilters.safeParse({ ...criteria, category }).data;
      if (!filters) return { error: "filters" };
      if (!options.available(filters)) return { error: "coverage" };
      return { filters, search: signal => provider.search(filters, signal) };
    },
  };
}

const providers = [
  osmAdapter(extractProvider, {
    label: "Extrato municipal · Geofabrik", enabled: extractEnabled,
    available: criteria => Boolean(extractMunicipality(criteria)), cacheMs: 0,
  }),
  osmAdapter(osmProvider, {
    label: "OpenStreetMap · Overpass", enabled: osmEnabled, available: () => true,
    cacheMs: 5 * 60000, quota: { cooldownMs: 60000, dailyLimit: 5 },
  }),
];

export function getDiscoveryProvider(id: unknown) {
  return providers.find(provider => provider.id === id && provider.enabled());
}

export function discoverySources(criteria?: { city: string; state: string }) {
  return providers.filter(provider => provider.enabled() && (!criteria || provider.available(criteria)))
    .map(({ id, label, categories, capabilities }) => ({ value: id, label, categories, capabilities }));
}
