import { useEffect, useState } from 'react'
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import iconUrl from 'leaflet/dist/images/marker-icon.png'
import iconRetinaUrl from 'leaflet/dist/images/marker-icon-2x.png'
import shadowUrl from 'leaflet/dist/images/marker-shadow.png'
import { formatDistance, haversineKm, walkMinutes } from './geo'
import { features, isBadGrade } from './features'

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

const selectedToiletIcon = L.divIcon({
  className: 'toilet-icon selected',
  html: '<div class="toilet-pin">🚻</div>',
  iconSize: [40, 40],
  iconAnchor: [20, 40],
  popupAnchor: [0, -36],
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

function FlyToSelected({ toilet }) {
  const map = useMap()
  useEffect(() => {
    if (toilet) {
      map.flyTo([toilet.lat, toilet.lng], Math.max(map.getZoom(), 17), {
        duration: 0.6,
      })
    }
  }, [toilet, map])
  return null
}

export default function Map({
  userPosition,
  userAccuracy,
  searchCenter,
  toilets,
  selectedId,
  radiusKm,
  mapRef,
  onMapMove,
}) {
  const center = userPosition || searchCenter || { lat: 25.0339, lng: 121.5645 }
  const selectedToilet = toilets.find((t) => t.id === selectedId)

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
        attribution='&copy; <a href="https://www.maptiler.com/copyright/">MapTiler</a> &copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
        url={`https://api.maptiler.com/maps/streets-v2/{z}/{x}/{y}{r}.png?key=${import.meta.env.VITE_MAPTILER_KEY}`}
        maxZoom={20}
        detectRetina={true}
      />

      <InitialView position={userPosition} />
      <FlyToSelected toilet={selectedToilet} />
      <MoveTracker onMove={onMapMove} />

      {searchCenter && radiusKm && (
        <Circle
          center={[searchCenter.lat, searchCenter.lng]}
          radius={radiusKm * 1000}
          pathOptions={{ color: '#3b82f6', weight: 1, fillOpacity: 0.04 }}
        />
      )}

      {userPosition && userAccuracy && userAccuracy > 30 && (
        <Circle
          center={[userPosition.lat, userPosition.lng]}
          radius={userAccuracy}
          pathOptions={{
            color: '#3b82f6',
            weight: 1,
            fillOpacity: 0.1,
            dashArray: '4 4',
          }}
        />
      )}

      {userPosition && (
        <Marker position={[userPosition.lat, userPosition.lng]} icon={userIcon}>
          <Popup>
            你在這裡
            {userAccuracy !== null && (
              <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>
                定位誤差約 ±{Math.round(userAccuracy)}m
              </div>
            )}
          </Popup>
        </Marker>
      )}

      {toilets.map((t) => {
        const dist = userPosition ? haversineKm(userPosition, t) : null
        const isSelected = t.id === selectedId
        return (
          <Marker
            key={t.id}
            position={[t.lat, t.lng]}
            icon={isSelected ? selectedToiletIcon : toiletIcon}
            zIndexOffset={isSelected ? 1000 : 0}
          >
            <Popup>
              <div className="popup">
                <h3>{t.name}</h3>
                <p className="addr">{t.address}</p>
                <div className="feat-icons">
                  {features(t).map((f) => (
                    <span key={f.icon} className="feat-icon" title={f.label}>
                      {f.icon}
                    </span>
                  ))}
                  {isBadGrade(t.grade) && (
                    <span className="feat-icon warn" title="不合格">⚠</span>
                  )}
                </div>
                {dist !== null && (
                  <p className="dist">{formatDistance(dist)} · {walkMinutes(dist)} 分</p>
                )}
                <a
                  className="nav-btn"
                  href={navigateUrl(t.lat, t.lng)}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  帶我去 →
                </a>
              </div>
            </Popup>
          </Marker>
        )
      })}
    </MapContainer>
  )
}
