import { useEffect, useState } from 'react'
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import iconUrl from 'leaflet/dist/images/marker-icon.png'
import iconRetinaUrl from 'leaflet/dist/images/marker-icon-2x.png'
import shadowUrl from 'leaflet/dist/images/marker-shadow.png'
import { formatDistance, haversineKm } from './geo'

L.Icon.Default.mergeOptions({ iconUrl, iconRetinaUrl, shadowUrl })

const userIcon = L.divIcon({
  className: 'user-icon',
  html: '<div class="user-dot"></div>',
  iconSize: [18, 18],
  iconAnchor: [9, 9],
})

const toiletIcon = L.divIcon({
  className: 'toilet-icon',
  html: '<div class="toilet-pin">🚻</div>',
  iconSize: [32, 32],
  iconAnchor: [16, 32],
  popupAnchor: [0, -28],
})

function navigateUrl(lat, lng) {
  return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=walking`
}

function MoveTracker({ onMove }) {
  useMapEvents({
    moveend: (e) => {
      const c = e.target.getCenter()
      onMove({ lat: c.lat, lng: c.lng })
    },
  })
  return null
}

function InitialView({ position }) {
  const map = useMap()
  const [done, setDone] = useState(false)
  useEffect(() => {
    if (!done && position) {
      map.setView([position.lat, position.lng], 16)
      setDone(true)
    }
  }, [position, map, done])
  return null
}

export default function Map({
  userPosition,
  searchCenter,
  toilets,
  radiusKm,
  mapRef,
  onMapMove,
}) {
  const center = userPosition || searchCenter || { lat: 25.0339, lng: 121.5645 }

  return (
    <MapContainer
      ref={mapRef}
      center={[center.lat, center.lng]}
      zoom={16}
      className="map"
      scrollWheelZoom
      zoomControl={false}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      <InitialView position={userPosition} />
      <MoveTracker onMove={onMapMove} />

      {searchCenter && radiusKm && (
        <Circle
          center={[searchCenter.lat, searchCenter.lng]}
          radius={radiusKm * 1000}
          pathOptions={{ color: '#3b82f6', weight: 1, fillOpacity: 0.04 }}
        />
      )}

      {userPosition && (
        <Marker position={[userPosition.lat, userPosition.lng]} icon={userIcon}>
          <Popup>你在這裡</Popup>
        </Marker>
      )}

      {toilets.map((t) => {
        const dist = userPosition ? haversineKm(userPosition, t) : null
        return (
          <Marker key={t.id} position={[t.lat, t.lng]} icon={toiletIcon}>
            <Popup>
              <div className="popup">
                <h3>{t.name}</h3>
                <p className="addr">{t.address}</p>
                <div className="tags">
                  <span className={`tag grade-${t.grade}`}>{t.grade}</span>
                  <span className="tag">{t.category}</span>
                  {t.types.map((tp) => (
                    <span key={tp} className="tag">{tp}</span>
                  ))}
                  {t.diaper && <span className="tag diaper">尿布檯</span>}
                </div>
                {dist !== null && (
                  <p className="dist">距離 {formatDistance(dist)}</p>
                )}
                <a
                  className="nav-btn"
                  href={navigateUrl(t.lat, t.lng)}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  導航到這裡 →
                </a>
              </div>
            </Popup>
          </Marker>
        )
      })}
    </MapContainer>
  )
}
