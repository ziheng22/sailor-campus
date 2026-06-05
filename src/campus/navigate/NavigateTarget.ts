/** 导航目标 */
export interface NavigateTarget {
  name: string
  x: number
  z: number
  /** 地面高度（默认为 0，操场等特殊地点可能不同） */
  groundY?: number
}

/** 从 buildings + landmarks 构建可搜索列表 */
import { buildings, landmarks } from "../data/campusData"

export interface SearchItem {
  label: string
  subtitle: string
  target: NavigateTarget
}

export function getSearchItems(): SearchItem[] {
  const items: SearchItem[] = []

  for (const b of buildings) {
    items.push({
      label: b.name,
      subtitle: b.tags?.join(" · ") ?? "建筑",
      target: { name: b.name, x: b.x, z: b.z },
    })
  }

  for (const l of landmarks) {
    items.push({
      label: l.name,
      subtitle: l.type ?? "地标",
      target: { name: l.name, x: l.x, z: l.z },
    })
  }

  // 去重（按名称）
  const seen = new Set<string>()
  return items.filter((item) => {
    if (seen.has(item.label)) return false
    seen.add(item.label)
    return true
  })
}

export function searchTargets(query: string): SearchItem[] {
  const q = query.trim().toLowerCase()
  if (!q) return []
  const items = getSearchItems()
  return items.filter(
    (item) =>
      item.label.toLowerCase().includes(q) ||
      item.subtitle.toLowerCase().includes(q),
  ).slice(0, 6)
}
