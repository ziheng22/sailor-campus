import type { AABB } from "../utils/collision"
import type { PolygonPoint } from "../utils/colliderPolygon"

export type ColliderSourceKind =
  | "mesh"
  | "split-building"
  | "commercial"
  | "commercial-split"
  | "bridge-rail"
  | "lake"
  | "lake-split"

export type AirWallFlag =
  | "invisible-mesh"
  | "hidden-aggregate"
  | "hidden-road"
  | "no-geometry"
  | "no-material"
  | "collider-inflated"
  | "oversized-vs-mesh"
  | "open-area-block"
  | "road-plaza-block"
  | "orphan-hidden-mesh"

export type ColliderFixAction =
  | "skip-in-collectGlbColliders"
  | "add-to-exclude-set"
  | "reduce-min-wall-thickness"
  | "split-plaza-hole"
  | "no-op-intentional"

export interface ColliderFixSuggestion {
  action: ColliderFixAction
  detail: string
  /** 本项目无 Rapier；若迁移可设 collisionGroups=0 或 sensor=true */
  rapierEquivalent?: string
}

export interface CampusColliderEntry {
  id: string
  name: string
  sourceKind: ColliderSourceKind
  layer: "obstacle" | "lake"
  aabb: AABB
  /** 编辑/自定义多边形；有则优先用于碰撞 */
  polygon?: PolygonPoint[]
  center: { x: number; z: number }
  width: number
  depth: number
  area: number
  meshUuid?: string
  meshVisible?: boolean
  meshHiddenFlags?: string[]
  meshFootprintArea?: number
  inflationRatio?: number
  flags: AirWallFlag[]
  fix?: ColliderFixSuggestion
}

export interface AirWallReport {
  totalColliders: number
  airWallCount: number
  entries: CampusColliderEntry[]
  airWalls: CampusColliderEntry[]
  orphanHiddenMeshes: CampusColliderEntry[]
  physicsBackend: "custom-aabb"
  rapierDetected: false
  consoleSummary: string
}
