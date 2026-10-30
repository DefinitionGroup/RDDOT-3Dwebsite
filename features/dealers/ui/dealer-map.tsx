"use client";

import "maplibre-gl/dist/maplibre-gl.css";
import "./dealer-map.css";
import type { Map as MapLibreMap, Marker } from "maplibre-gl";
import { useReducedMotion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import type { GeoPoint } from "@/features/dealers/dealer-distance";
import { dealerMapStyle, MAPLIBRE_WORKER_URL, type TileJson } from "@/features/dealers/ui/map-style";
import { useLocale, useMessages } from "@/lib/messages/locale-context";

export type MapDealer = GeoPoint & { id: string; name: string };

/**
 * The Dealer Directory on a map: one red dot per dealer, a white ring for the
 * customer's postcode. A pointer convenience beside the list, which stays the
 * accessible way to choose; the dots repeat it and are hidden from assistive
 * technology. Tiles, glyphs and the worker all come from this site (ADR 0014);
 * without a tile archive the map says so and the list carries on.
 */
export default function DealerMap({
  dealers,
  onSelect,
  origin,
  selectedId
}: {
  dealers: MapDealer[];
  onSelect: (dealerId: string) => void;
  origin: GeoPoint | null;
  selectedId: string | null;
}) {
  const locale = useLocale();
  const t = useMessages().dealers;
  const prefersReducedMotion = useReducedMotion();
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const markersRef = useRef(new Map<string, { marker: Marker; element: HTMLElement }>());
  const onSelectRef = useRef(onSelect);
  const [state, setState] = useState<"loading" | "ready" | "unavailable">("loading");

  useEffect(() => {
    onSelectRef.current = onSelect;
  }, [onSelect]);

  // The map itself: once, with the archive's TileJSON.
  useEffect(() => {
    let cancelled = false;
    const markers = markersRef.current;

    async function start() {
      const response = await fetch("/api/map/tiles").catch(() => null);
      // 204: this deployment has no tile archive.
      if (response?.status !== 200) {
        if (!cancelled) setState("unavailable");
        return;
      }
      const tileJson = (await response.json()) as TileJson;
      const maplibre = await import("maplibre-gl");
      if (cancelled || !containerRef.current) return;

      // Without WebGL there is no map, as without tiles: the list carries on.
      const probe = document.createElement("canvas");
      if (!probe.getContext("webgl2") && !probe.getContext("webgl")) {
        setState("unavailable");
        return;
      }

      maplibre.setWorkerUrl(MAPLIBRE_WORKER_URL);
      const map = new maplibre.Map({
        container: containerRef.current,
        style: dealerMapStyle(tileJson, locale, t.mapAttribution),
        bounds: [
          [5.6, 47.2],
          [15.2, 55.1]
        ],
        fitBoundsOptions: { padding: 24 },
        // The archive covers Germany; the world's low-zoom labels, in scripts
        // the self-hosted glyphs do not carry, stay out of view.
        maxBounds: tileJson.bounds,
        minZoom: 5,
        maxZoom: 14,
        attributionControl: false,
        dragRotate: false,
        pitchWithRotate: false,
        touchPitch: false
      });
      map.addControl(new maplibre.NavigationControl({ showCompass: false }), "top-right");
      // Spelled out on a wide map; folded behind its (i) on a narrow one once the map moves.
      map.addControl(new maplibre.AttributionControl(), "bottom-right");
      map.on("load", () => {
        if (!cancelled) setState("ready");
      });
      map.on("error", () => {
        if (!cancelled && !map.loaded()) setState("unavailable");
      });
      mapRef.current = map;
    }

    void start();
    return () => {
      cancelled = true;
      for (const { marker } of markers.values()) marker.remove();
      markers.clear();
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, [locale, t.mapAttribution]);

  // One dot per dealer, and the customer's ring.
  useEffect(() => {
    const map = mapRef.current;
    if (state !== "ready" || !map) return;
    let disposed = false;
    const created: Marker[] = [];

    void import("maplibre-gl").then(({ Marker: MarkerClass }) => {
      if (disposed) return;
      if (origin) {
        const ring = document.createElement("span");
        ring.setAttribute("aria-hidden", "true");
        ring.className = "block size-4 rounded-full border-2 border-ink bg-canvas/40";
        created.push(new MarkerClass({ element: ring }).setLngLat([origin.longitude, origin.latitude]).addTo(map));
      }
      for (const dealer of dealers) {
        const dot = document.createElement("span");
        dot.setAttribute("aria-hidden", "true");
        dot.title = dealer.name;
        dot.className =
          "block size-3.5 cursor-pointer rounded-full border-2 border-canvas bg-signature transition-transform duration-state ease-signature hover:scale-125";
        dot.addEventListener("click", (event) => {
          event.stopPropagation();
          onSelectRef.current(dealer.id);
        });
        const marker = new MarkerClass({ element: dot }).setLngLat([dealer.longitude, dealer.latitude]).addTo(map);
        markersRef.current.set(dealer.id, { marker, element: dot });
        created.push(marker);
      }

      // Frame the customer and the nearest dealers, or the whole directory.
      const framed = origin ? [origin, ...dealers.slice(0, 3)] : dealers;
      if (framed.length > 0) {
        const longitudes = framed.map((point) => point.longitude);
        const latitudes = framed.map((point) => point.latitude);
        map.fitBounds(
          [
            [Math.min(...longitudes), Math.min(...latitudes)],
            [Math.max(...longitudes), Math.max(...latitudes)]
          ],
          { padding: 48, maxZoom: 10, duration: 0 }
        );
      }
    });

    const markers = markersRef.current;
    return () => {
      disposed = true;
      for (const marker of created) marker.remove();
      markers.clear();
    };
  }, [dealers, origin, state]);

  // The chosen dealer stands out and comes into view.
  useEffect(() => {
    const map = mapRef.current;
    for (const [id, { element }] of markersRef.current) {
      element.classList.toggle("ring-2", id === selectedId);
      element.classList.toggle("ring-ink", id === selectedId);
      element.classList.toggle("scale-125", id === selectedId);
    }
    const selected = dealers.find((dealer) => dealer.id === selectedId);
    if (map && state === "ready" && selected) {
      map.easeTo({
        center: [selected.longitude, selected.latitude],
        zoom: Math.max(map.getZoom(), 9),
        duration: prefersReducedMotion ? 0 : 600
      });
    }
  }, [dealers, prefersReducedMotion, selectedId, state]);

  return (
    <div className="dealer-map relative h-full w-full bg-soot">
      {/* MapLibre makes its container `position: relative`, so it takes its size from the box. */}
      <div aria-label={t.map} className="h-full w-full" ref={containerRef} role="region" />
      {state === "unavailable" && (
        <p className="absolute inset-0 m-0 flex items-center justify-center p-6 text-center text-caption text-graphite">
          {t.mapUnavailable}
        </p>
      )}
    </div>
  );
}
