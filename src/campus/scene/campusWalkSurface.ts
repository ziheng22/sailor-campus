/**
 * 桥面、湖面行走表面与活跃障碍判定
 *
 * 从 campusColliders.ts 拆分，避免单文件过大。
 */
import * as THREE from "three"
import { type AABB } from "../utils/collision"
import type { PolygonPoint } from "../utils/colliderPolygon"
import { type CampusWalkSurface } from "./campusColliders"

// ---- re-exported utilities (used by bridge/walk logic) ----
export { inflateAABB, aabbArea, sampleMeshSurfaceYAtXZ } from "./campusColliders"
import { inflateAABB } from "./campusColliders"
import { aabbArea } from "./campusColliders"
import { sampleMeshSurfaceYAtXZ } from "./campusColliders"
import { splitObstaclesAroundHole } from "./campusColliders"

// ---- constants ----

/** 桥两侧护栏占桥宽比例（每侧），防止角色走入湖中 */
const BRIDGE_RAIL_FRACTION = 0.25
/** 湖面开孔比桥面略大，避免贴桥时仍判为入湖 */
const BRIDGE_LAKE_CLEARANCE = 1.25

// ---- bridge ----

/** 从湖泊障碍中挖去桥面通道，仅保留湖体区域阻挡 */
export function lakeObstaclesAvoidingBridges(lakeBox: AABB, bridgeDecks: AABB[]): AABB[] {
  let regions: AABB[] = [lakeBox]
  for (const deck of bridgeDecks) {
    regions = splitObstaclesAroundHole(regions, inflateAABB(deck, BRIDGE_LAKE_CLEARANCE))
  }
  return regions.filter((r) => aabbArea(r) > 0.8)
}

/** 桥面可行走区 + 两侧护栏 */
export function buildBridgeCollision(
  mesh: THREE.Mesh,
  minWallThickness: number,
): { walkDeck: CampusWalkSurface; rails: AABB[] } {
  mesh.updateWorldMatrix(true, false)
  const box = new THREE.Box3().setFromObject(mesh)
  const size = new THREE.Vector3()
  box.getSize(size)

  const railAlongX = size.x < size.z
  const railSize = railAlongX
    ? Math.max(size.x * BRIDGE_RAIL_FRACTION, minWallThickness)
    : Math.max(size.z * BRIDGE_RAIL_FRACTION, minWallThickness)

  let walkDeck: CampusWalkSurface
  let rails: AABB[]
  const deckFallbackY = box.max.y

  if (railAlongX) {
    walkDeck = {
      minX: box.min.x + railSize, maxX: box.max.x - railSize,
      minZ: box.min.z, maxZ: box.max.z,
      surfaceY: deckFallbackY,
    }
    rails = [
      { minX: box.min.x, maxX: box.min.x + railSize, minZ: box.min.z, maxZ: box.max.z },
      { minX: box.max.x - railSize, maxX: box.max.x, minZ: box.min.z, maxZ: box.max.z },
    ]
  } else {
    walkDeck = {
      minX: box.min.x, maxX: box.max.x,
      minZ: box.min.z + railSize, maxZ: box.max.z - railSize,
      surfaceY: deckFallbackY,
    }
    rails = [
      { minX: box.min.x, maxX: box.max.x, minZ: box.min.z, maxZ: box.min.z + railSize },
      { minX: box.min.x, maxX: box.max.x, minZ: box.max.z - railSize, maxZ: box.max.z },
    ]
  }

  return { walkDeck, rails }
}

// ---- walk surface detection ----

function isPointOnWalkSurface(
  x: number, z: number,
  surface: CampusWalkSurface,
  meshByUuid?: Map<string, THREE.Mesh>,
): boolean {
  if (x < surface.minX || x > surface.maxX || z < surface.minZ || z > surface.maxZ) return false
  if (surface.meshUuid && meshByUuid) {
    const mesh = meshByUuid.get(surface.meshUuid)
    if (mesh) return sampleMeshSurfaceYAtXZ(mesh, x, z) != null
  }
  return true
}

export function isOnWalkSurface(
  x: number, z: number,
  walkSurfaces: CampusWalkSurface[],
  meshByUuid?: Map<string, THREE.Mesh>,
): boolean {
  return walkSurfaces.some((s) => isPointOnWalkSurface(x, z, s, meshByUuid))
}

/** 根据行走表面决定 Y 高度 */
export function resolveWalkSurfaceY(
  x: number, z: number, defaultY: number,
  walkSurfaces: CampusWalkSurface[],
  meshByUuid?: Map<string, THREE.Mesh>,
): number {
  for (const surface of walkSurfaces) {
    if (!isPointOnWalkSurface(x, z, surface, meshByUuid)) continue
    if (surface.meshUuid && meshByUuid) {
      const mesh = meshByUuid.get(surface.meshUuid)
      if (mesh) {
        const sampled = sampleMeshSurfaceYAtXZ(mesh, x, z)
        if (sampled != null) return sampled
        continue
      }
    }
    return surface.surfaceY
  }
  return defaultY
}

// ---- active obstacle builders ----

/** 桥上且脚下有桥面几何时，不检测湖面 */
export function buildActiveObstacles(
  x: number, z: number,
  obstacles: AABB[], lakeObstacles: AABB[],
  walkSurfaces: CampusWalkSurface[],
  meshByUuid?: Map<string, THREE.Mesh>,
): AABB[] {
  if (isOnWalkSurface(x, z, walkSurfaces, meshByUuid)) return obstacles
  return obstacles.concat(lakeObstacles)
}

export function buildActivePolygonObstacles(
  x: number, z: number,
  polygonObstacles: PolygonPoint[][], lakePolygonObstacles: PolygonPoint[][],
  walkSurfaces: CampusWalkSurface[],
  meshByUuid?: Map<string, THREE.Mesh>,
): PolygonPoint[][] {
  if (isOnWalkSurface(x, z, walkSurfaces, meshByUuid)) return polygonObstacles
  return polygonObstacles.concat(lakePolygonObstacles)
}
