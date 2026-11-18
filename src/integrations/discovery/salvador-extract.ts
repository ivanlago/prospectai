import { open } from "node:fs/promises";
import { z } from "zod";
import bundledExtract from "../../../data/osm-salvador.json";
import { filterOsmElements, normalize, ProviderError, type BusinessSearchProvider, type DiscoveryFilters } from "./overpass";

const extractPath = ".local-data/osm-salvador.json";
const maxSize = 4 * 1024 * 1024;
const format = z.object({ snapshotDate: z.iso.date(), elements: z.array(z.unknown()).max(20000) });

export const extractEnabled = () => process.env.ENABLE_OSM_SALVADOR_EXTRACT === "true";

export function coversSalvador(input: Pick<DiscoveryFilters, "city" | "state">) {
  return normalize(input.city) === "salvador" && ["ba", "bahia"].includes(normalize(input.state));
}

export const salvadorProvider: BusinessSearchProvider = {
  id: "openstreetmap-geofabrik",
  async search(input, signal) {
    if (!coversSalvador(input)) throw new ProviderError("coverage");
    const file = await open(extractPath, "r").catch((error: NodeJS.ErrnoException) => {
      if (error.code !== "ENOENT") throw new ProviderError("extract");
      return null;
    });
    if (!file) {
      signal?.throwIfAborted();
      const payload = format.parse(bundledExtract);
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
