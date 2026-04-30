// Map a toilet record's types/diaper into compact display icons.
export function features(t) {
  const has = (typ) => t.types.includes(typ)
  const out = []
  if (has('男廁所') || has('混合廁所')) out.push({ icon: '男', label: '男廁' })
  if (has('女廁所') || has('混合廁所')) out.push({ icon: '女', label: '女廁' })
  if (has('無障礙廁所')) out.push({ icon: '障', label: '無障礙' })
  if (has('親子廁所') || t.diaper) out.push({ icon: '嬰', label: '親子/尿布檯' })
  if (has('性別友善廁所')) out.push({ icon: '友', label: '性別友善' })
  return out
}

export const isBadGrade = (grade) => grade === '不合格'
