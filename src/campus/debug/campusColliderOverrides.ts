import * as THREE from "three"
import type { AABB } from "../utils/collision"
import type { CampusColliderEntry, ColliderSourceKind } from "./campusColliderTypes"
import type { CampusCollisionData } from "../scene/campusColliders"
import {
  aabbToPolygon,
  polygonToAabb,
  rectPolygonAt,
  type PolygonPoint,
} from "../utils/colliderPolygon"
import { BUNDLED_COLLIDER_OVERRIDES } from "./campusColliderOverridesData"

const STORAGE_KEY = "campusColliderOverrides"

export type ColliderPatch =
  | { disabled: true }
  | { aabb: AABB; name?: string }
  | { polygon: PolygonPoint[]; name?: string }

export interface ColliderOverrideAdded {
  id: string
  name: string
  layer: "obstacle" | "lake"
  sourceKind: ColliderSourceKind
  aabb: AABB
  polygon: PolygonPoint[]
}

export interface ColliderOverrides {
  version: 1
  patches: Record<string, ColliderPatch>
  added: ColliderOverrideAdded[]
}

export const EMPTY_COLLIDER_OVERRIDES: ColliderOverrides = {
  version: 1,
  patches: {},
  added: [],
}

function entryFromShape(
  id: string,
  name: string,
  layer: "obstacle" | "lake",
  sourceKind: ColliderSourceKind,
  polygon: PolygonPoint[],
  base?: Partial<CampusColliderEntry>,
): CampusColliderEntry {
  const aabb = polygonToAabb(polygon)
  const w = aabb.maxX - aabb.minX
  const d = aabb.maxZ - aabb.minZ
  return {
    id,
    name,
    sourceKind,
    layer,
    aabb,
    polygon,
    center: { x: (aabb.minX + aabb.maxX) / 2, z: (aabb.minZ + aabb.maxZ) / 2 },
    width: w,
    depth: d,
    area: w * d,
    flags: base?.flags ?? [],
    meshUuid: base?.meshUuid,
    meshVisible: base?.meshVisible,
    meshHiddenFlags: base?.meshHiddenFlags,
  }
}

function migrateAdded(raw: Partial<ColliderOverrideAdded>): ColliderOverrideAdded {
  const aabb = raw.aabb!
  const polygon =
    raw.polygon && raw.polygon.length >= 3 ? raw.polygon : aabbToPolygon(aabb)
  return {
    id: raw.id!,
    name: raw.name!,
    layer: raw.layer ?? "obstacle",
    sourceKind: raw.sourceKind ?? "mesh",
    aabb: polygonToAabb(polygon),
    polygon,
  }
}

function normalizeOverrides(overrides: ColliderOverrides): ColliderOverrides {
  return {
    version: 1,
    patches: overrides.patches ?? {},
    added: (overrides.added ?? []).map((a) => migrateAdded(a)),
  }
}

function mergeOverrides(base: ColliderOverrides, overlay: ColliderOverrides): ColliderOverrides {
  const baseAddedIds = new Set(base.added.map((a) => a.id))
  return {
    version: 1,
    patches: { ...base.patches, ...overlay.patches },
    added: [...base.added, ...overlay.added.filter((a) => !baseAddedIds.has(a.id))],
  }
}

export function loadColliderOverrides(): ColliderOverrides {
  const bundled = normalizeOverrides(BUNDLED_COLLIDER_OVERRIDES)
  if (typeof window === "undefined") return bundled
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return bundled
    const parsed = JSON.parse(raw) as ColliderOverrides
    if (parsed.version !== 1) return bundled
    const local = normalizeOverrides(parsed)
    return mergeOverrides(bundled, local)
  } catch {
    return bundled
  }
}

async function saveToDevApi(key: string, data: ColliderOverrides): Promise<boolean> {
  try {
    const res = await fetch("/__dev__/campus-save", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key, data }),
    })
    return res.ok
  } catch {
    return false
  }
}

export function saveColliderOverrides(overrides: ColliderOverrides): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(overrides))
  } catch {
    /* ignore */
  }
  // 开发时同时写回源码 raw.json 文件，换设备/清缓存不丢失
  saveToDevApi(STORAGE_KEY, overrides)
}

export function applyColliderOverrides(
  data: CampusCollisionData,
  overrides: ColliderOverrides,
): CampusCollisionData {
  const obstacles: AABB[] = []
  const polygonObstacles: PolygonPoint[][] = []
  const lakeObstacles: AABB[] = []
  const lakePolygonObstacles: PolygonPoint[][] = []
  const entries: CampusColliderEntry[] = []

  for (const entry of data.entries ?? []) {
    const patch = overrides.patches[entry.id]
    if (patch && "disabled" in patch) continue

    const name = patch && "name" in patch && patch.name ? patch.name : entry.name

    if (patch && "polygon" in patch) {
      const polygon = patch.polygon.map((p) => ({ ...p }))
      const next = entryFromShape(entry.id, name, entry.layer, entry.sourceKind, polygon, entry)
      if (entry.layer === "lake") lakePolygonObstacles.push(polygon)
      else polygonObstacles.push(polygon)
      entries.push(next)
      continue
    }

    const aabb = patch && "aabb" in patch ? patch.aabb : entry.aabb
    const displayPolygon = aabbToPolygon(aabb)
    const next = entryFromShape(entry.id, name, entry.layer, entry.sourceKind, displayPolygon, entry)
    if (entry.layer === "lake") lakeObstacles.push(aabb)
    else obstacles.push(aabb)
    entries.push({ ...next, polygon: undefined })
  }

  for (const add of overrides.added) {
    const polygon = add.polygon.map((p) => ({ ...p }))
    const e = entryFromShape(add.id, add.name, add.layer, add.sourceKind, polygon)
    if (add.layer === "lake") lakePolygonObstacles.push(polygon)
    else polygonObstacles.push(polygon)
    entries.push(e)
  }

  return {
    ...data,
    obstacles,
    polygonObstacles,
    lakeObstacles,
    lakePolygonObstacles,
    entries,
  }
}

export function createDefaultAabbAt(x: number, z: number, halfSize = 2): AABB {
  return polygonToAabb(rectPolygonAt(x, z, halfSize))
}

export function isCustomColliderId(id: string): boolean {
  return id.startsWith("custom-")
}

export function addCustomCollider(
  overrides: ColliderOverrides,
  x: number,
  z: number,
  opts?: { name?: string; halfSize?: number; layer?: "obstacle" | "lake" },
): { overrides: ColliderOverrides; id: string } {
  const id = `custom-${Date.now()}`
  const polygon = rectPolygonAt(x, z, opts?.halfSize ?? 3)
  const next: ColliderOverrides = {
    version: 1,
    patches: { ...overrides.patches },
    added: [
      ...overrides.added,
      {
        id,
        name: opts?.name ?? `新建-${overrides.added.length + 1}`,
        layer: opts?.layer ?? "obstacle",
        sourceKind: "mesh",
        aabb: polygonToAabb(polygon),
        polygon,
      },
    ],
  }
  return { overrides: next, id }
}

export function patchColliderPolygon(
  overrides: ColliderOverrides,
  id: string,
  polygon: PolygonPoint[],
  baseName?: string,
): ColliderOverrides {
  const aabb = polygonToAabb(polygon)
  const isCustom = isCustomColliderId(id)
  if (isCustom) {
    return {
      version: 1,
      patches: { ...overrides.patches },
      added: overrides.added.map((a) => (a.id === id ? { ...a, polygon, aabb } : a)),
    }
  }
  return {
    version: 1,
    patches: {
      ...overrides.patches,
      [id]: { polygon, name: baseName },
    },
    added: [...overrides.added],
  }
}

export function removeColliderFromOverrides(
  overrides: ColliderOverrides,
  id: string,
): ColliderOverrides {
  if (isCustomColliderId(id)) {
    return {
      version: 1,
      patches: { ...overrides.patches },
      added: overrides.added.filter((a) => a.id !== id),
    }
  }
  return {
    version: 1,
    patches: { ...overrides.patches, [id]: { disabled: true } },
    added: [...overrides.added],
  }
}

export function exportOverridesAsJson(overrides: ColliderOverrides): string {
  return JSON.stringify(overrides, null, 2)
}

export function clearColliderOverrides(): ColliderOverrides {
  const empty = { version: 1 as const, patches: {}, added: [] }
  saveColliderOverrides(empty)
  return empty
}

/** @deprecated 仅兼容旧代码 */
export function aabbFromObject3D(obj: THREE.Object3D): AABB {
  const box = new THREE.Box3().setFromObject(obj)
  return {
    minX: box.min.x,
    maxX: box.max.x,
    minZ: box.min.z,
    maxZ: box.max.z,
  }
}

/** @deprecated 仅兼容旧代码 */
export function syncObjectToAabb(
  obj: THREE.Object3D,
  aabb: AABB,
  groundY: number,
  visualHeight: number,
): void {
  const w = aabb.maxX - aabb.minX
  const d = aabb.maxZ - aabb.minZ
  const cx = (aabb.minX + aabb.maxX) / 2
  const cz = (aabb.minZ + aabb.maxZ) / 2
  obj.position.set(cx, groundY + visualHeight / 2, cz)
  obj.scale.set(w, visualHeight, d)
  obj.updateMatrixWorld(true)
}
