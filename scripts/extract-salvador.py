"""Create the local Salvador POI index from a Geofabrik PBF and an IBGE municipal boundary."""

import argparse
from datetime import date
import json
from pathlib import Path

import osmium
from shapely.geometry import Point, shape
from shapely.ops import unary_union
from shapely.prepared import prep


CATEGORIES = {
    ("amenity", "cafe"), ("amenity", "restaurant"), ("amenity", "clinic"), ("amenity", "dentist"),
    ("shop", "hairdresser"), ("shop", "beauty"), ("shop", "car_repair"), ("shop", "bakery"),
    ("leisure", "fitness_centre"),
}
DETAILS = ("name", "website", "contact:website", "addr:suburb", "addr:neighbourhood", "addr:district")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("pbf", type=Path)
    parser.add_argument("boundary", type=Path)
    parser.add_argument("snapshot_date", type=date.fromisoformat)
    parser.add_argument("--output", type=Path, default=Path(".local-data/osm-salvador.json"))
    args = parser.parse_args()

    boundary = json.loads(args.boundary.read_text(encoding="utf-8"))
    geometry = unary_union([shape(feature["geometry"]) for feature in boundary["features"]])
    if geometry.is_empty or not geometry.is_valid or geometry.geom_type not in {"Polygon", "MultiPolygon"}:
        raise ValueError("Malha municipal inválida.")
    municipality = prep(geometry)

    nodes = osmium.FileProcessor(args.pbf, osmium.osm.NODE).with_filter(osmium.filter.TagFilter(*sorted(CATEGORIES)))
    elements = []
    for node in nodes:
        name = node.tags.get("name", "").strip()
        if not name or len(name) > 160 or not node.location.valid():
            continue
        if not municipality.covers(Point(node.location.lon, node.location.lat)):
            continue
        tags = {key: value for key, value in node.tags if (key, value) in CATEGORIES or key in DETAILS}
        elements.append({"type": "node", "id": node.id, "tags": tags})

    if not elements:
        raise ValueError("O recorte não produziu estabelecimentos.")
    args.output.parent.mkdir(parents=True, exist_ok=True)
    payload = {"snapshotDate": args.snapshot_date.isoformat(), "elements": elements}
    temporary = args.output.with_suffix(".tmp")
    temporary.write_text(json.dumps(payload, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    temporary.replace(args.output)
    print(f"{len(elements)} estabelecimentos no extrato.")


if __name__ == "__main__":
    main()
