import { open } from "node:fs/promises";
import { z } from "zod";
import lauroExtract from "../../../data/osm-lauro-de-freitas.json";
import camacariExtract from "../../../data/osm-camacari.json";
import bundledExtract from "../../../data/osm-salvador.json";
import { filterOsmElements, normalize, ProviderError, type BusinessSearchProvider, type DiscoveryFilters } from "./overpass";

const municipalities = [
  { key: "salvador", name: "Salvador", bundled: bundledExtract },
  { key: "lauro de freitas", name: "Lauro de Freitas", bundled: lauroExtract },
  { key: "camacari", name: "Camaçari", bundled: camacariExtract },
];
const maxSize = 4 * 1024 * 1024;
const format = z.object({ snapshotDate: z.iso.date(), elements: z.array(z.unknown()).max(20000) });

export const extractEnabled = () => process.env.ENABLE_OSM_SALVADOR_EXTRACT === "true";

export function extractMunicipality(input: Pick<DiscoveryFilters, "city" | "state">) {
  if (!["ba", "bahia"].includes(normalize(input.state))) return undefined;
  return municipalities.find(municipality => municipality.key === normalize(input.city));
}

export const extractProvider: BusinessSearchProvider = {
  id: "openstreetmap-geofabrik",
  async search(input, signal) {
    const municipality = extractMunicipality(input);
    if (!municipality) throw new ProviderError("coverage");
    const extractPath = `.local-data/osm-${municipality.key.replaceAll(" ", "-")}.json`;
    const file = await open(extractPath, "r").catch((error: NodeJS.ErrnoException) => {
      if (error.code !== "ENOENT") throw new ProviderError("extract");
      return null;
    });
    if (!file) {
      signal?.throwIfAborted();
      const payload = format.parse(municipality.bundled);
      return { ...filterOsmElements(payload.elements, input), snapshotDate: payload.snapshotDate };
    }
    try {
      const stat = await file.stat();
      if (!stat.isFile() || stat.size > maxSize) throw new ProviderError("extract");
      const contents = await file.readFile({ encoding: "utf8", signal });
      const payload = format.safeParse(JSON.parse(contents));
      if (!payload.success) throw new ProviderError("extract");
      return { ...filterOsmElements(payload.data.elements, input), snapshotDate: payload.data.snapshotDate };
    } finally {
      await file.close();
    }
  },
};
