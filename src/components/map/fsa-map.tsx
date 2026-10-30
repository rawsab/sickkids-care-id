"use client";

import "maplibre-gl/dist/maplibre-gl.css";
import { setWorkerUrl, type ExpressionSpecification } from "maplibre-gl";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import Map, { Layer, NavigationControl, Source, type MapLayerMouseEvent, type MapRef } from "react-map-gl/maplibre";
import { useI18n } from "@/i18n/client";
import { bboxOf, type FsaCollection } from "@/lib/geo";

const BASEMAP_STYLE =
  process.env.NEXT_PUBLIC_BASEMAP_STYLE ?? "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json";
const HATCH = "care-id-hatch";
const NAVY = "#00205b";

// MapLibre loads its worker from a file beside its own bundle, which the
// bundler doesn't emit; serve the copy made by `postinstall` instead.
setWorkerUrl("/maplibre-gl-worker.mjs");

export interface FsaMapPadding {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

/** Diagonal hatch, matching the `.hatch` CSS swatch, for areas without published data. */
function hatchImage(size = 8) {
  const data = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const onLine = (x + y) % size < 2;
      const [r, g, b, a] = onLine ? [175, 185, 198, 255] : [230, 234, 240, 200];
      data.set([r, g, b, a], (y * size + x) * 4);
    }
  }
  return { width: size, height: size, data };
}

/**
 * Choropleth of GTA FSAs. FSAs with a colour in `fillColors` are filled; all
 * others (suppressed or no data) are hatched. Shared by the community map and
 * the dashboard map.
 */
export function FsaMap({
  geojson,
  fillColors,
  selected,
  onSelect,
  renderTooltip,
  padding,
  label,
  cooperative = false,
  controlsInset = 0,
}: {
  geojson: FsaCollection;
  fillColors: Record<string, string>;
  selected: string | null;
  onSelect: (fsa: string) => void;
  renderTooltip: (fsa: string) => ReactNode;
  padding: FsaMapPadding;
  label: string;
  /** For maps embedded in a scrolling page: require Ctrl/⌘ + scroll (or two fingers) to zoom. */
  cooperative?: boolean;
  /** Lifts the zoom buttons and attribution above anything covering the bottom of the map (px). */
  controlsInset?: number;
}) {
  const { dict } = useI18n();
  const mapRef = useRef<MapRef>(null);
  const [beforeId, setBeforeId] = useState<string | undefined>();
  const [ready, setReady] = useState(false);
  const [hover, setHover] = useState<{ fsa: string; x: number; y: number } | null>(null);

  const bounds = useMemo(() => bboxOf(geojson.features), [geojson]);

  const fillExpression = useMemo((): ExpressionSpecification | string => {
    const entries = Object.entries(fillColors).flat();
    return entries.length ? (["match", ["get", "CFSAUID"], ...entries, "rgba(0,0,0,0)"] as unknown as ExpressionSpecification) : "rgba(0,0,0,0)";
  }, [fillColors]);
  const coloured = useMemo(() => Object.keys(fillColors), [fillColors]);

  // Padding changes (e.g. the panel collapsing) shouldn't re-trigger a zoom.
  const paddingRef = useRef(padding);
  useEffect(() => {
    paddingRef.current = padding;
  });

  // Fit to the selected FSA (from a click, search or location), or the whole GTA.
  const userMoved = useRef(false);
  const fit = useCallback(
    (duration: number) => {
      const map = mapRef.current;
      if (!map) return;
      const feature = selected && geojson.features.find((f) => f.properties.CFSAUID === selected);
      map.fitBounds(feature ? bboxOf([feature]) : bounds, { padding: paddingRef.current, maxZoom: 11.5, duration });
    },
    [selected, geojson, bounds],
  );

  useEffect(() => {
    if (!ready) return;
    userMoved.current = false;
    fit(700);
  }, [ready, fit]);

  const onLoad = () => {
    const map = mapRef.current?.getMap();
    if (!map) return;
    if (!map.hasImage(HATCH)) map.addImage(HATCH, hatchImage(), { pixelRatio: 2 });
    // Draw areas beneath the basemap's labels so place names stay readable.
    setBeforeId(map.getStyle().layers.find((l) => l.type === "symbol")?.id);
    setReady(true);
  };

  const fsaFromEvent = (e: MapLayerMouseEvent) => e.features?.[0]?.properties?.CFSAUID as string | undefined;

  return (
    <div
      className="fsa-map relative size-full"
      role="region"
      aria-label={label}
      style={{ "--controls-inset": `${controlsInset}px` } as React.CSSProperties}
    >
      <Map
        ref={mapRef}
        mapStyle={BASEMAP_STYLE}
        initialViewState={{ bounds, fitBoundsOptions: { padding } }}
        minZoom={7}
        maxZoom={14}
        dragRotate={false}
        cooperativeGestures={cooperative}
        locale={dict.mapControls}
        pitchWithRotate={false}
        touchPitch={false}
        interactiveLayerIds={["fsa-fill"]}
        cursor={hover ? "pointer" : "grab"}
        onLoad={onLoad}
        onMoveStart={(e) => {
          if (e.originalEvent) userMoved.current = true;
        }}
        // The container can still be settling when the map loads; keep the
        // initial framing until the user pans or zooms.
        onResize={() => {
          if (!userMoved.current) fit(0);
        }}
        onMouseMove={(e) => {
          const fsa = fsaFromEvent(e);
          setHover(fsa ? { fsa, x: e.point.x, y: e.point.y } : null);
        }}
        onMouseLeave={() => setHover(null)}
        onClick={(e) => {
          const fsa = fsaFromEvent(e);
          if (fsa) onSelect(fsa);
        }}
        attributionControl={{ compact: true, customAttribution: dict.mapControls.boundaries }}
      >
        <NavigationControl position="bottom-right" showCompass={false} />
        {ready && (
          <Source id="fsa" type="geojson" data={geojson} promoteId="CFSAUID">
            <Layer
              id="fsa-hatch"
              type="fill"
              beforeId={beforeId}
              filter={["!", ["in", ["get", "CFSAUID"], ["literal", coloured]]]}
              paint={{ "fill-pattern": HATCH, "fill-opacity": 0.85 }}
            />
            <Layer
              id="fsa-fill"
              type="fill"
              beforeId={beforeId}
              paint={{ "fill-color": fillExpression, "fill-opacity": 0.9 }}
            />
            <Layer
              id="fsa-outline"
              type="line"
              beforeId={beforeId}
              paint={{ "line-color": "#ffffff", "line-width": ["interpolate", ["linear"], ["zoom"], 8, 0.4, 12, 1.5] }}
            />
            <Layer
              id="fsa-hover"
              type="line"
              filter={["==", ["get", "CFSAUID"], hover?.fsa ?? ""]}
              paint={{ "line-color": NAVY, "line-width": 1.5, "line-opacity": 0.7 }}
            />
            <Layer
              id="fsa-selected"
              type="line"
              filter={["==", ["get", "CFSAUID"], selected ?? ""]}
              paint={{ "line-color": NAVY, "line-width": 3 }}
            />
          </Source>
        )}
      </Map>

      {hover && (
        <div
          className="pointer-events-none absolute z-10 min-w-40 -translate-x-1/2 -translate-y-[calc(100%+12px)] rounded-xl bg-surface px-3 py-2 text-sm shadow-overlay ring-1 ring-border"
          style={{ left: hover.x, top: hover.y }}
        >
          {renderTooltip(hover.fsa)}
        </div>
      )}
    </div>
  );
}
