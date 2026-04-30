import { useMemo, useState } from 'react'
import { formatDistance, haversineKm, walkMinutes } from './geo'

const MAX_LIST = 10

function navigateUrl(lat, lng) {
  return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=walking`
}

function ToiletRow({ t, dist, selected, onSelect }) {
  const min = walkMinutes(dist)
  return (
    <li
      className={`sheet-row ${selected ? 'selected' : ''}`}
      onClick={() => onSelect(t.id)}
    >
      <div className="sheet-row-main">
        <div className="sheet-row-name">{t.name}</div>
        <div className="sheet-row-meta">
          <span className={`tag-mini grade-${t.grade}`}>{t.grade}</span>
          <span className="dim">·</span>
          <span>{formatDistance(dist)}</span>
          <span className="dim">·</span>
          <span>走路約 {min} 分</span>
          {t.diaper && <span className="tag-mini diaper">尿布檯</span>}
        </div>
      </div>
      <a
        className="sheet-row-go"
        href={navigateUrl(t.lat, t.lng)}
        target="_blank"
        rel="noopener noreferrer"
        onClick={(e) => e.stopPropagation()}
      >
        帶我去 →
      </a>
    </li>
  )
}

export default function BottomSheet({
  toilets,
  userPosition,
  selectedId,
  onSelect,
  status,
}) {
  const [expanded, setExpanded] = useState(false)

  const list = useMemo(() => {
    if (!userPosition) return toilets.slice(0, MAX_LIST)
    return toilets
      .map((t) => ({ ...t, _liveDist: haversineKm(userPosition, t) }))
      .sort((a, b) => a._liveDist - b._liveDist)
      .slice(0, MAX_LIST)
  }, [toilets, userPosition])

  const nearest = list[0]

  const distOf = (t) => t._liveDist ?? t._dist ?? 0

  if (status === 'locating') {
    return (
      <div className={`sheet collapsed`}>
        <div className="sheet-handle" />
        <div className="sheet-empty">找你在哪⋯</div>
      </div>
    )
  }

  if (status === 'loading') {
    return (
      <div className={`sheet collapsed`}>
        <div className="sheet-handle" />
        <div className="sheet-empty">翻地圖中⋯</div>
      </div>
    )
  }

  if (status === 'error') {
    return (
      <div className={`sheet collapsed`}>
        <div className="sheet-handle" />
        <div className="sheet-empty err">這次沒抓到資料。下拉重新整理或稍後再試。</div>
      </div>
    )
  }

  if (!list.length) {
    return (
      <div className={`sheet collapsed`}>
        <div className="sheet-handle" />
        <div className="sheet-empty">這附近沒收錄到，把範圍拉大試試？</div>
      </div>
    )
  }

  return (
    <div className={`sheet ${expanded ? 'expanded' : 'collapsed'}`}>
      <button
        className="sheet-handle-btn"
        onClick={() => setExpanded((e) => !e)}
        aria-label={expanded ? '收起清單' : '展開清單'}
      >
        <div className="sheet-handle" />
      </button>

      {!expanded && (
        <div className="sheet-collapsed-row">
          <div className="sheet-row-main" onClick={() => setExpanded(true)}>
            <div className="sheet-collapsed-label">最近一間</div>
            <div className="sheet-row-name">{nearest.name}</div>
            <div className="sheet-row-meta">
              <span>{formatDistance(distOf(nearest))}</span>
              <span className="dim">·</span>
              <span>走路約 {walkMinutes(distOf(nearest))} 分</span>
            </div>
          </div>
          <a
            className="sheet-row-go primary"
            href={navigateUrl(nearest.lat, nearest.lng)}
            target="_blank"
            rel="noopener noreferrer"
          >
            帶我去 →
          </a>
        </div>
      )}

      {expanded && (
        <ul className="sheet-list">
          {list.map((t) => (
            <ToiletRow
              key={t.id}
              t={t}
              dist={distOf(t)}
              selected={t.id === selectedId}
              onSelect={onSelect}
            />
          ))}
        </ul>
      )}
    </div>
  )
}
