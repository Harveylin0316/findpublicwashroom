const API_BASE = 'https://data.moenv.gov.tw/api/v2/fac_p_07'
const API_KEY = import.meta.env.VITE_MOENV_API_KEY

if (!API_KEY) {
  console.error('Missing VITE_MOENV_API_KEY. Register at https://data.moenv.gov.tw/ and set it in your env.')
}

const stripTypeSuffix = (name) => {
  if (!name) return name
  return (
    name
      .replace(/\d+F(\d+)?/g, '')
      .replace(/[一二三四五六七八九十]+樓/g, '')
      .replace(/\d+樓/g, '')
      .replace(/(男廁所?|女廁所?|無障礙廁所?|親子廁所?|混合廁所?|性別友善廁所?|未設定)$/u, '')
      .trim() || name
  )
}

export async function fetchToiletsInBbox({ minLat, maxLat, minLng, maxLng, limit = 1000 }) {
  const filters = [
    `latitude,GR,${minLat}`,
    `latitude,LE,${maxLat}`,
    `longitude,GR,${minLng}`,
    `longitude,LE,${maxLng}`,
  ].join('|')

  const url = `${API_BASE}?api_key=${API_KEY}&filters=${encodeURIComponent(filters)}&limit=${limit}&format=JSON`

  const res = await fetch(url)
  if (!res.ok) throw new Error(`API ${res.status}`)
  const raw = await res.json()

  const grouped = new Map()
  for (const r of raw) {
    if (!r.latitude || !r.longitude) continue
    const lat = parseFloat(r.latitude)
    const lng = parseFloat(r.longitude)
    if (Number.isNaN(lat) || Number.isNaN(lng)) continue

    const key = `${lat.toFixed(4)},${lng.toFixed(4)}|${r.address || ''}`
    const existing = grouped.get(key)

    if (existing) {
      if (r.type && !existing.types.includes(r.type)) existing.types.push(r.type)
      if (r.diaper === '1' || parseInt(r.diaper, 10) > 0) existing.diaper = true
    } else {
      grouped.set(key, {
        id: key,
        name: stripTypeSuffix(r.name),
        address: r.address,
        lat,
        lng,
        grade: r.grade,
        category: r.type2,
        manager: r.exec,
        types: r.type ? [r.type] : [],
        diaper: r.diaper === '1' || parseInt(r.diaper, 10) > 0,
      })
    }
  }

  return Array.from(grouped.values())
}
