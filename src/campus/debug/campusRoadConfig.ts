import type { RoadDef, RoadOverrides } from "./campusRoadTypes"
import type { PolygonPoint } from "../utils/colliderPolygon"
import { mirrorPolygonZ } from "../utils/colliderPolygon"
import { buildDefaultRoadDefs } from "./campusRoadDefaults"
import bundledRoads from "./campusRoadOverrides.raw.json"

const STORAGE_KEY = "campusRoadOverrides"

function migrateRoadOverridesV2ToV3(data: RoadOverrides): RoadOverrides {
  return {
    version: 3,
    removedIds: data.removedIds ?? [],
    roads: data.roads.map((r) => ({
      ...r,
      polygon: mirrorPolygonZ(r.polygon),
    })),
  }
}

function bundledDefault(): RoadOverrides {
  if (!bundledRoads || !Array.isArray(bundledRoads.roads)) {
    return { version: 3 as const, roads: [], removedIds: [] }
  }
  if (bundledRoads.version === 3) {
    return {
      ...(bundledRoads as RoadOverrides),
      removedIds: (bundledRoads as RoadOverrides).removedIds ?? [],
    }
  }
  if (bundledRoads.version === 2) {
    return migrateRoadOverridesV2ToV3(bundledRoads as RoadOverrides)
  }
  return { version: 3 as const, roads: [], removedIds: [] }
}

function codeDefaultRoads(): RoadDef[] {
  return buildDefaultRoadDefs()
}

export function mergeRoads(
  userRoads: RoadDef[],
  defaults: RoadDef[],
  removedIds: string[] = [],
): RoadDef[] {
  const userIds = new Set(userRoads.map((r) => r.id))
  const removed = new Set(removedIds)
  return [
    ...userRoads,
    ...defaults.filter((r) => !userIds.has(r.id) && !removed.has(r.id)),
  ]
}

function resolveRoadOverrides(overrides: RoadOverrides): RoadOverrides {
  const removedIds = overrides.removedIds ?? []
  const bundled = bundledDefault()
  const allDefaults = mergeRoads(bundled.roads, codeDefaultRoads(), removedIds)
  return {
    version: 3,
    removedIds,
    roads: mergeRoads(overrides.roads, allDefaults, removedIds),
  }
}

function bundledFingerprint(): string {
  const bundled = bundledDefault()
  return `${bundled.roads.length}:${bundled.removedIds?.length ?? 0}:${bundled.roads.map(r => r.id).sort().join(",")}`
}

export function loadRoadOverrides(): RoadOverrides {
  const bundled = bundledDefault()
  const base = resolveRoadOverrides({
    version: 3,
    roads: bundled.roads,
    removedIds: bundled.removedIds,
  })
  if (typeof window === "undefined") return base
  const fp = bundledFingerprint()
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return base
    const parsed = JSON.parse(raw) as RoadOverrides & { _fp?: string }
    // 如果代码中的道路文件已更新，自动跳过 localStorage 缓存
    if (parsed._fp !== fp) {
      window.localStorage.removeItem(STORAGE_KEY)
      return base
    }
    const migrated =
      parsed.version === 2 ? migrateRoadOverridesV2ToV3(parsed) : parsed.version === 3 ? parsed : null
    if (!migrated) return base
    const resolved = resolveRoadOverrides(migrated)
    if (parsed.version === 2) saveRoadOverrides(resolved)
    return resolved
  } catch {
    return base
  }
}

// ---- dev API: write back to raw.json source files ----

async function saveToDevApi(data: RoadOverrides): Promise<boolean> {
  try {
    const res = await fetch("/__dev__/campus-save", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key: STORAGE_KEY, data }),
    })
    return res.ok
  } catch {
    return false
  }
}

export function saveRoadOverrides(overrides: RoadOverrides): void {
  const payload: RoadOverrides & { _fp?: string } = {
    ...resolveRoadOverrides(overrides),
    version: 3,
    _fp: bundledFingerprint(),
  }
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
  } catch {
    /* ignore */
  }
  saveToDevApi(payload)
}

export function patchRoadPolygon(
  overrides: RoadOverrides,
  id: string,
  polygon: PolygonPoint[],
): RoadOverrides {
  return {
    ...overrides,
    version: 3,
    roads: overrides.roads.map((r) =>
      r.id === id ? { ...r, polygon: polygon.map((p) => ({ ...p })) } : r,
    ),
  }
}

export function addRoad(
  overrides: RoadOverrides,
  polygon: PolygonPoint[],
  name?: string,
): { overrides: RoadOverrides; id: string } {
  const id = `road-${Date.now()}`
  const def: RoadDef = {
    id,
    name: name ?? `道路-${overrides.roads.length + 1}`,
    polygon: polygon.map((p) => ({ ...p })),
  }
  const removedIds = (overrides.removedIds ?? []).filter((rid) => rid !== id)
  return {
    overrides: { version: 3, removedIds, roads: [...overrides.roads, def] },
    id,
  }
}

export function removeRoad(
  overrides: RoadOverrides,
  id: string,
): RoadOverrides {
  const removedIds = [...new Set([...(overrides.removedIds ?? []), id])]
  return {
    version: 3,
    removedIds,
    roads: overrides.roads.filter((r) => r.id !== id),
  }
}
