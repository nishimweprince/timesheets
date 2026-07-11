import * as React from "react"
import { Circle, MapContainer, Marker, TileLayer } from "react-leaflet"
import L from "leaflet"
import "leaflet/dist/leaflet.css"

import { cn } from "@/lib/utils"

// Vite does not resolve Leaflet's default icon URLs correctly; use CDN markers.
const markerIcon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
})

export interface LocationMapProps {
  latitude: number
  longitude: number
  accuracyMeters?: number | null
  className?: string
  zoom?: number
}

/**
 * Small OpenStreetMap embed with a marker (and optional accuracy circle).
 * scrollWheelZoom is disabled so page scroll is not captured.
 */
export function LocationMap({
  latitude,
  longitude,
  accuracyMeters,
  className,
  zoom = 15,
}: LocationMapProps) {
  const center = React.useMemo(
    () => [latitude, longitude] as [number, number],
    [latitude, longitude],
  )

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return (
      <div
        className={cn(
          "flex h-40 items-center justify-center border border-dashed border-border text-[13px] text-muted-foreground",
          className,
        )}
      >
        Invalid coordinates
      </div>
    )
  }

  return (
    <div className={cn("h-40 w-full overflow-hidden border border-border", className)}>
      <MapContainer
        center={center}
        zoom={zoom}
        scrollWheelZoom={false}
        dragging
        className="h-full w-full"
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Marker position={center} icon={markerIcon} />
        {accuracyMeters != null && accuracyMeters > 0 ? (
          <Circle
            center={center}
            radius={accuracyMeters}
            pathOptions={{
              color: "hsl(var(--primary))",
              fillColor: "hsl(var(--primary))",
              fillOpacity: 0.12,
              weight: 1,
            }}
          />
        ) : null}
      </MapContainer>
    </div>
  )
}

export default LocationMap
