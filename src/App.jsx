import { useEffect, useMemo, useRef, useState } from 'react'
import Map from './Map'
import BottomSheet from './BottomSheet'
import { fetchToiletsInBbox } from './api'
import { bboxAround, haversineKm } from './geo'
import { tap } from './haptic'
import './App.css'

const RADIUS_OPTIONS = [
  { km: 0.5, label: '500m' },
  { km: 2, label: '2km' },
  { km: 5, label: '5km' },
]

const FILTER_DEFS = [
  {
    key: 'male',
    label: '男',
    match: (t) => t.types.includes('男廁所') || t.types.includes('混合廁所'),
  },
  {
    key: 'female',
    label: '女',
    match: (t) => t.types.includes('女廁所') || t.types.includes('混合廁所'),
  },
  { key: 'accessible', label: '無障礙', match: (t) => t.types.includes('無障礙廁所') },
  { key: 'genderFriendly', label: '性別友善', match: (t) => t.types.includes('性別友善廁所') },
  {
    key: 'family',
    label: '親子',
    match: (t) => t.types.includes('親子廁所') || t.diaper,
  },
]

const FALLBACK = { lat: 25.0339, lng: 121.5645 }
const GEO_OPTS = { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 }

export default function App() {
  const [userPosition, setUserPosition] = useState(null)
  const [userAccuracy, setUserAccuracy] = useState(null)
  const [searchCenter, setSearchCenter] = useState(null)
  const [mapCenter, setMapCenter] = useState(null)
  const [radiusKm, setRadiusKm] = useState(2)
  const [filters, setFilters] = useState({})
  const [toilets, setToilets] = useState([])
  const [status, setStatus] = useState('idle')
  const [error, setError] = useState(null)
  const [selectedId, setSelectedId] = useState(null)
  const [isLocating, setIsLocating] = useState(false)
  const mapRef = useRef(null)
  const hasFirstFix = useRef(false)

  useEffect(() => {
    if (!('geolocation' in navigator)) {
      setError('此瀏覽器不支援定位')
      setUserPosition(FALLBACK)
      setSearchCenter(FALLBACK)
      return
    }
    setStatus('locating')

    const onPos = (pos) => {
      const p = { lat: pos.coords.latitude, lng: pos.coords.longitude }
      setUserPosition(p)
      setUserAccuracy(pos.coords.accuracy)
      if (!hasFirstFix.current) {
        hasFirstFix.current = true
        setSearchCenter(p)
      }
    }
    const onErr = (err) => {
      if (!hasFirstFix.current) {
        setError(`無法取得位置：${err.message}`)
        setUserPosition(FALLBACK)
        setSearchCenter(FALLBACK)
      }
    }

    const watchId = navigator.geolocation.watchPosition(onPos, onErr, GEO_OPTS)
    return () => navigator.geolocation.clearWatch(watchId)
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
    tap()
    if (mapRef.current && userPosition) {
      mapRef.current.setView([userPosition.lat, userPosition.lng], 16)
    }
    if ('geolocation' in navigator) {
      setIsLocating(true)
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setUserPosition({ lat: pos.coords.latitude, lng: pos.coords.longitude })
          setUserAccuracy(pos.coords.accuracy)
          setIsLocating(false)
        },
        () => setIsLocating(false),
        { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
      )
    }
  }

  const searchHere = () => {
    if (!mapCenter) return
    tap()
    setSearchCenter(mapCenter)
  }

  const toggleFilter = (key) => {
    tap()
    setFilters((f) => ({ ...f, [key]: !f[key] }))
  }

  const setRadius = (km) => {
    tap()
    setRadiusKm(km)
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
                {userAccuracy !== null && userAccuracy > 100 && (
                  <span className="acc-warn">　定位誤差 ±{Math.round(userAccuracy)}m</span>
                )}
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
                onClick={() => setRadius(r.km)}
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
          userAccuracy={userAccuracy}
          searchCenter={searchCenter}
          toilets={visibleToilets}
          selectedId={selectedId}
          radiusKm={radiusKm}
          mapRef={mapRef}
          onMapMove={setMapCenter}
        />

        {userPosition && (
          <button
            className={`fab fab-locate ${isLocating ? 'locating' : ''}`}
            onClick={locateMe}
            disabled={isLocating}
            aria-label="重新定位並回到我的位置"
            title={isLocating ? '正在抓 GPS…' : '重新定位'}
          >
            {isLocating ? <span className="spin" /> : '📍'}
          </button>
        )}

        <button
          className={`fab-search ${showSearchHere ? 'active' : ''}`}
          onClick={searchHere}
          disabled={!showSearchHere}
        >
          {showSearchHere ? '在這裡找 →' : '拖地圖換位置'}
        </button>

        <BottomSheet
          toilets={visibleToilets}
          userPosition={userPosition}
          selectedId={selectedId}
          onSelect={setSelectedId}
          status={status}
        />
      </main>
    </div>
  )
}
