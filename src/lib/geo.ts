import booleanPointInPolygon from "@turf/boolean-point-in-polygon";
import { normaliseFsa } from "./regions";
import type { Feature, FeatureCollection, MultiPolygon, Polygon } from "geojson";

export const FSA_GEOJSON_URL = "/geo/gta-fsa.geojson";

export type FsaFeature = Feature<Polygon | MultiPolygon, { CFSAUID: string }>;
export type FsaCollection = FeatureCollection<Polygon | MultiPolygon, { CFSAUID: string }>;
export type Bbox = [[number, number], [number, number]];

export function bboxOf(features: FsaFeature[]): Bbox {
  let [w, s, e, n] = [Infinity, Infinity, -Infinity, -Infinity];
  for (const f of features) {
    const polys = f.geometry.type === "Polygon" ? [f.geometry.coordinates] : f.geometry.coordinates;
    for (const ring of polys.flat()) {
      for (const [x, y] of ring) {
        w = Math.min(w, x);
        s = Math.min(s, y);
        e = Math.max(e, x);
        n = Math.max(n, y);
      }
    }
  }
  return [[w, s], [e, n]];
}

/** The FSA containing a point — used for "Use my location", entirely in the browser. */
export function fsaAt(collection: FsaCollection, lng: number, lat: number): string | null {
  return collection.features.find((f) => booleanPointInPolygon([lng, lat], f))?.properties.CFSAUID ?? null;
}

export type AreaLookup = { fsa: string } | { error: "notPostal" | "outside"; fsa?: string };

/**
 * The reporting area (FSA) for a postal code or FSA typed by a visitor or read
 * from a record. Only the first three characters are used. `covered` is the
 * set of FSAs on the map; pass null while it is still loading to skip the check.
 */
export function areaForPostalCode(value: string, covered: ReadonlySet<string> | null): AreaLookup {
  const fsa = normaliseFsa(value);
  if (!fsa) return { error: "notPostal" };
  if (covered && !covered.has(fsa)) return { error: "outside", fsa };
  return { fsa };
}
