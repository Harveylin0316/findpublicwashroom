const EARTH_RADIUS_KM = 6371

export function haversineKm(a, b) {
  const toRad = (x) => (x * Math.PI) / 180
  const dLat = toRad(b.lat - a.lat)
  const dLng = toRad(b.lng - a.lng)
  const lat1 = toRad(a.lat)
  const lat2 = toRad(b.lat)

  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(h))
}

export function bboxAround({ lat, lng }, radiusKm = 2) {
  const latDelta = radiusKm / 111
  const lngDelta = radiusKm / (111 * Math.cos((lat * Math.PI) / 180))
  return {
    minLat: lat - latDelta,
    maxLat: lat + latDelta,
    minLng: lng - lngDelta,
    maxLng: lng + lngDelta,
  }
}

export function formatDistance(km) {
  if (km < 1) return `${Math.round(km * 1000)} 公尺`
  return `${km.toFixed(1)} 公里`
}

// 直線距離 km → 估走路分鐘數
// 假設 5 km/h 步行，× 1.3 路徑修正係數
export function walkMinutes(km) {
  return Math.max(1, Math.round(km * 15.6))
}
