import type { z } from "zod";
import type { searchForm } from "../../domain";

export type SavedSearch = z.infer<typeof searchForm>;
export type BusinessResult = { reference: string; name: string; website: string; district: string; identityKey: string };
export type ProviderResponse = { results: BusinessResult[]; truncated: boolean; snapshotDate?: string };

export type BusinessSearchProvider<Filters> = {
  id: string;
  search(input: Filters, signal?: AbortSignal): Promise<ProviderResponse>;
};

export type DiscoveryProvider = {
  id: string;
  label: string;
  enabled(): boolean;
  available(criteria: Pick<SavedSearch, "city" | "state">): boolean;
  categories: { value: string; label: string }[];
  capabilities: { rating: boolean; reviews: boolean; radius: boolean; maxResults: number };
  retentionMs: number;
  cacheMs: number;
  quota?: { cooldownMs: number; dailyLimit: number };
  prepare(criteria: SavedSearch, category: unknown):
    | { error: string }
    | { filters: Record<string, unknown>; search(signal: AbortSignal): Promise<ProviderResponse> };
};

export class ProviderError extends Error {
  constructor(public readonly code: string) { super(code); }
}
