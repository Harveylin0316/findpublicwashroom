import { useEffect, useMemo, useRef, useState } from 'react'
import Map from './Map'
import { fetchToiletsInBbox } from './api'
import { bboxAround, haversineKm } from './geo'
import './App.css'

const RADIUS_OPTIONS = [
  { km: 0.5, label: '500m' },
  { km: 2, label: '2km' },
  { km: 5, label: '5km' },
]

const FILTER_DEFS = [
  { key: 'accessible', label: '無障礙', match: (t) => t.types.includes('無障礙廁所') },
  { key: 'genderFriendly', label: '性別友善', match: (t) => t.types.includes('性別友善廁所') },
  { key: 'topGrade', label: '特優級', match: (t) => t.grade === '特優級' },
  { key: 'diaper', label: '尿布檯', match: (t) => t.diaper },
]

const FALLBACK = { lat: 25.0339, lng: 121.5645 }

export default function App() {
  const [userPosition, setUserPosition] = useState(null)
  const [searchCenter, setSearchCenter] = useState(null)
  const [mapCenter, setMapCenter] = useState(null)
  const [radiusKm, setRadiusKm] = useState(2)
  const [filters, setFilters] = useState({})
  const [toilets, setToilets] = useState([])
  const [status, setStatus] = useState('idle')
  const [error, setError] = useState(null)
  const mapRef = useRef(null)

  useEffect(() => {
    if (!('geolocation' in navigator)) {
      setError('此瀏覽器不支援定位')
      setUserPosition(FALLBACK)
      setSearchCenter(FALLBACK)
      return
    }
    setStatus('locating')
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const p = { lat: pos.coords.latitude, lng: pos.coords.longitude }
        setUserPosition(p)
        setSearchCenter(p)
      },
      (err) => {
        setError(`無法取得位置：${err.message}`)
        setUserPosition(FALLBACK)
        setSearchCenter(FALLBACK)
      },
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }, [])

  useEffect(() => {
    if (!searchCenter) return
    setStatus('loading')
    setError(null)

    const bbox = bboxAround(searchCenter, radiusKm)
    fetchToiletsInBbox(bbox)
      .then((data) => {
        const sorted = data
          .map((t) => ({ ...t, _dist: haversineKm(searchCenter, t) }))
          .filter((t) => t._dist <= radiusKm)
          .sort((a, b) => a._dist - b._dist)
        setToilets(sorted)
        setStatus('ready')
      })
      .catch((err) => {
        setError(`資料載入失敗：${err.message}`)
        setStatus('error')
      })
  }, [searchCenter, radiusKm])

  const visibleToilets = useMemo(() => {
    const active = FILTER_DEFS.filter((f) => filters[f.key])
    if (!active.length) return toilets
    return toilets.filter((t) => active.every((f) => f.match(t)))
  }, [toilets, filters])

  const nearestDist = userPosition && visibleToilets[0]
    ? haversineKm(userPosition, visibleToilets[0])
    : null

  const movedFromSearchCenter = mapCenter && searchCenter
    ? haversineKm(mapCenter, searchCenter)
    : 0
  const showSearchHere = movedFromSearchCenter > radiusKm * 0.4

  const locateMe = () => {
    if (!userPosition || !mapRef.current) return
    mapRef.current.setView([userPosition.lat, userPosition.lng], 16)
  }

  const searchHere = () => {
    if (!mapCenter) return
    setSearchCenter(mapCenter)
  }

  const toggleFilter = (key) => {
    setFilters((f) => ({ ...f, [key]: !f[key] }))
  }

  return (
    <div className="app">
      <header className="header">
        <div className="header-top">
          <h1>附近公廁 🚻</h1>
          <div className="status">
            {status === 'locating' && '定位中…'}
            {status === 'loading' && '載入中…'}
            {status === 'ready' && (
              <span>
                <strong>{visibleToilets.length}</strong>
                {visibleToilets.length !== toilets.length && ` / ${toilets.length}`}
                {' '}個
                {nearestDist !== null && ` · 最近 ${(nearestDist * 1000).toFixed(0)}m`}
              </span>
            )}
            {error && <span className="err">{error}</span>}
          </div>
        </div>

        <div className="chips">
          <div className="chip-group" role="radiogroup" aria-label="搜尋半徑">
            {RADIUS_OPTIONS.map((r) => (
              <button
                key={r.km}
                role="radio"
                aria-checked={radiusKm === r.km}
                className={`chip ${radiusKm === r.km ? 'on' : ''}`}
                onClick={() => setRadiusKm(r.km)}
              >
                {r.label}
              </button>
            ))}
          </div>
          <div className="chip-divider" />
          <div className="chip-group">
            {FILTER_DEFS.map((f) => (
              <button
                key={f.key}
                className={`chip ${filters[f.key] ? 'on' : ''}`}
                onClick={() => toggleFilter(f.key)}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className="main">
        <Map
          userPosition={userPosition}
          searchCenter={searchCenter}
          toilets={visibleToilets}
          radiusKm={radiusKm}
          mapRef={mapRef}
          onMapMove={setMapCenter}
        />

        {userPosition && (
          <button
            className="fab fab-locate"
            onClick={locateMe}
            aria-label="回到我的位置"
            title="回到我的位置"
          >
            📍
          </button>
        )}

        {showSearchHere && (
          <button className="fab-search" onClick={searchHere}>
            🔍 搜尋此區域
          </button>
        )}
      </main>
    </div>
  )
}
