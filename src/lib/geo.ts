import booleanPointInPolygon from "@turf/boolean-point-in-polygon";
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
