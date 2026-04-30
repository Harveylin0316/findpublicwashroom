import { useMemo, useState } from 'react'
import { formatDistance, haversineKm, walkMinutes } from './geo'
import { features, isBadGrade } from './features'
import { tap } from './haptic'

const MAX_LIST = 10

function navigateUrl(lat, lng) {
  return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=walking`
}

function FeatIcons({ t }) {
  return (
    <div className="feat-icons">
      {features(t).map((f) => (
        <span key={f.icon} className="feat-icon" title={f.label} aria-label={f.label}>
          {f.icon}
        </span>
      ))}
      {isBadGrade(t.grade) && (
        <span className="feat-icon warn" title="不合格" aria-label="不合格">
          ⚠
        </span>
      )}
    </div>
  )
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
          <span>{formatDistance(dist)} · {min} 分</span>
          <FeatIcons t={t} />
        </div>
      </div>
      <a
        className="sheet-row-go"
        href={navigateUrl(t.lat, t.lng)}
        target="_blank"
        rel="noopener noreferrer"
        onClick={(e) => { e.stopPropagation(); tap() }}
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
  const [hasExpanded, setHasExpanded] = useState(false)

  const toggleExpand = () => {
    tap()
    setExpanded((e) => !e)
    setHasExpanded(true)
  }

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
        className={`sheet-handle-btn ${expanded ? 'expanded' : ''}`}
        onClick={toggleExpand}
        aria-label={expanded ? '收起清單' : '展開清單看更多'}
      >
        <div className="sheet-handle" />
        {!expanded && !hasExpanded && (
          <div className="sheet-hint">上拉看更多 ↑</div>
        )}
      </button>

      {!expanded && (
        <div className="sheet-collapsed-row">
          <div className="sheet-row-main" onClick={toggleExpand}>
            <div className="sheet-collapsed-label">最近一間</div>
            <div className="sheet-row-name">{nearest.name}</div>
            <div className="sheet-row-meta">
              <span>{formatDistance(distOf(nearest))} · {walkMinutes(distOf(nearest))} 分</span>
              <FeatIcons t={nearest} />
            </div>
          </div>
          <a
            className="sheet-row-go primary"
            href={navigateUrl(nearest.lat, nearest.lng)}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => tap()}
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
