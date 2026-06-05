import * as THREE from "three"
import { type AABB } from "../utils/collision"
import { classifyMesh } from "./campusMaterials"
import type { CampusColliderEntry, ColliderSourceKind } from "../debug/campusColliderTypes"
import type { PolygonPoint } from "../utils/colliderPolygon"

/** 墙段在 XZ 上过薄时，碰撞体最小世界厚度 */
const MIN_WALL_WORLD_THICKNESS = 0.55

/** 餐饮区：商业街、商店 */
const COMMERCIAL_FOOD_ZONE_MESHES = new Set(["商业街", "商店"])

/** 食堂 + 校内驿站（拆分前后统一按原「餐厅」整块碰撞） */
const RESTAURANT_COLLISION_MESHES = new Set(["餐厅", "校内驿站"])

/** 与 GLB 导出一致：每栋拆分建筑 6 个墙段 mesh */
const PARTS_PER_SPLIT_BUILDING = 6

/** 桥两侧护栏占桥宽比例（每侧），防止角色走入湖中 */
const BRIDGE_RAIL_FRACTION = 0.25

/** 湖面开孔比桥面略大，避免贴桥时仍判为入湖 */
const BRIDGE_LAKE_CLEARANCE = 1.25

/** 湖面阻挡厚度（mesh 为平面，y=0） */
const LAKE_BLOCK_PADDING = 1.2

/** 楼间庭院 + 操场入口（仅挖空地，外墙由 split 后残块保留） */
const PLAZA_HOLE_X_MARGIN = 2
/** 朝操场一侧（+Z）多留一点通道 */
const PLAZA_HOLE_Z_PLAYGROUND_EXT = 4
/** 庭院向北挖孔深度（世界单位） */
const PLAZA_HOLE_Z_NORTH_DEPTH = 22
/** 餐厅东侧可通行边界（与场景扫描一致） */
const PLAZA_HOLE_EAST_CLEAR_X = -56

export interface CampusWalkSurface {
  minX: number
  maxX: number
  minZ: number
  maxZ: number
  /** 无 mesh 采样时的回退高度 */
  surfaceY: number
  /** 从桥面 mesh 向下射线采样行走高度（不改碰撞体） */
  meshUuid?: string
}

const _bridgeRayOrigin = new THREE.Vector3()
const _bridgeRayDir = new THREE.Vector3(0, -1, 0)
const _bridgeRaycaster = new THREE.Raycaster()

/** 在 (x,z) 处从上方射线检测 mesh 顶面，用于拱桥等起伏桥面 */
export function sampleMeshSurfaceYAtXZ(mesh: THREE.Object3D, x: number, z: number): number | null {
  mesh.updateWorldMatrix(true, true)
  const box = new THREE.Box3().setFromObject(mesh)
  _bridgeRayOrigin.set(x, box.max.y + 30, z)
  _bridgeRaycaster.set(_bridgeRayOrigin, _bridgeRayDir)
  const hits = _bridgeRaycaster.intersectObject(mesh, true)
  if (hits.length === 0) return null
  return hits[0].point.y
}

export interface CampusCollisionData {
  /** 建筑、桥栏等障碍（矩形） */
  obstacles: AABB[]
  /** 多边形障碍（编辑/自定义） */
  polygonObstacles: PolygonPoint[][]
  /** 湖面多边形障碍 */
  lakePolygonObstacles: PolygonPoint[][]
  /** 湖面障碍（桥上行走时不参与碰撞） */
  lakeObstacles: AABB[]
  walkSurfaces: CampusWalkSurface[]
  /** 开发调试：带元数据的碰撞条目 */
  entries?: CampusColliderEntry[]
  /** mesh uuid → mesh，供空气墙分析 */
  meshByUuid?: Map<string, THREE.Mesh>
}

export function isAggregateClusterMesh(name: string): boolean {
  return name === "宿舍" || name === "办公室"
}

export function isDormPartMesh(name: string): boolean {
  return /^宿舍\d+$/.test(name)
}

export function isOfficePartMesh(name: string): boolean {
  return /^办公室\d+$/.test(name)
}

export function isCommercialFoodZoneMesh(name: string): boolean {
  return COMMERCIAL_FOOD_ZONE_MESHES.has(name)
}

export function isRestaurantCollisionMesh(name: string): boolean {
  return RESTAURANT_COLLISION_MESHES.has(name)
}

export function isLakeMesh(name: string): boolean {
  return name === "湖1" || name === "湖2"
}

export function hasNumberedDormParts(root: THREE.Object3D): boolean {
  let found = false
  root.traverse((child) => {
    if (found) return
    if (child instanceof THREE.Mesh && isDormPartMesh(child.name)) found = true
  })
  return found
}

export function hasNumberedOfficeParts(root: THREE.Object3D): boolean {
  let found = false
  root.traverse((child) => {
    if (found) return
    if (child instanceof THREE.Mesh && isOfficePartMesh(child.name)) found = true
  })
  return found
}

/** 隐藏聚合 mesh，保留拆分后的独立墙段（不改 transform） */
export function hideAggregateClusterMeshes(root: THREE.Object3D): void {
  const numberedDorms = hasNumberedDormParts(root)
  const numberedOffices = hasNumberedOfficeParts(root)
  root.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) return
    if (numberedDorms && child.name === "宿舍") {
      child.visible = false
      child.userData.campusAggregateHidden = true
    }
    if (numberedOffices && child.name === "办公室") {
      child.visible = false
      child.userData.campusAggregateHidden = true
    }
  })
}

function expandThinAABB(box: THREE.Box3, minThickness: number): AABB {
  const size = new THREE.Vector3()
  box.getSize(size)
  const center = new THREE.Vector3()
  box.getCenter(center)

  let minX = box.min.x
  let maxX = box.max.x
  let minZ = box.min.z
  let maxZ = box.max.z

  if (size.x < minThickness) {
    const half = minThickness / 2
    minX = center.x - half
    maxX = center.x + half
  }
  if (size.z < minThickness) {
    const half = minThickness / 2
    minZ = center.z - half
    maxZ = center.z + half
  }

  return { minX, maxX, minZ, maxZ }
}

let colliderEntryCounter = 0

function entryFromAabb(
  aabb: AABB,
  name: string,
  sourceKind: ColliderSourceKind,
  layer: "obstacle" | "lake",
  mesh?: THREE.Mesh | null,
): CampusColliderEntry {
  const w = aabb.maxX - aabb.minX
  const d = aabb.maxZ - aabb.minZ
  const hiddenFlags: string[] = []
  if (mesh) {
    if (!mesh.visible) hiddenFlags.push("visible=false")
    if (mesh.userData.campusAggregateHidden) hiddenFlags.push("campusAggregateHidden")
    if (mesh.userData.campusRoadHidden) hiddenFlags.push("campusRoadHidden")
  }
  return {
    id: `col-${colliderEntryCounter++}`,
    name,
    sourceKind,
    layer,
    aabb,
    center: { x: (aabb.minX + aabb.maxX) / 2, z: (aabb.minZ + aabb.maxZ) / 2 },
    width: w,
    depth: d,
    area: w * d,
    meshUuid: mesh?.uuid,
    meshVisible: mesh?.visible,
    meshHiddenFlags: hiddenFlags.length ? hiddenFlags : undefined,
    flags: [],
  }
}

function pushObstacle(
  obstacles: AABB[],
  entries: CampusColliderEntry[],
  aabb: AABB,
  name: string,
  sourceKind: ColliderSourceKind,
  mesh?: THREE.Mesh | null,
): void {
  obstacles.push(aabb)
  entries.push(entryFromAabb(aabb, name, sourceKind, "obstacle", mesh))
}

function pushLake(
  lakeObstacles: AABB[],
  entries: CampusColliderEntry[],
  aabb: AABB,
  name: string,
  sourceKind: ColliderSourceKind,
  mesh?: THREE.Mesh | null,
): void {
  lakeObstacles.push(aabb)
  entries.push(entryFromAabb(aabb, name, sourceKind, "lake", mesh))
}

/** 与 w楼 相同：整栋外包盒 footprint，按 6 段墙合并为一栋 */
function aabbFromMeshesLikeWBuilding(meshes: THREE.Mesh[]): AABB | null {
  if (meshes.length === 0) return null
  const box = new THREE.Box3()
  for (const mesh of meshes) {
    mesh.updateWorldMatrix(true, false)
    box.union(new THREE.Box3().setFromObject(mesh))
  }
  const size = new THREE.Vector3()
  box.getSize(size)
  if (size.y < 0.01 || size.x * size.z < 0.5) return null
  return expandThinAABB(box, MIN_WALL_WORLD_THICKNESS)
}

function collectSplitBuildingFootprints(
  glbRoot: THREE.Object3D,
  partPattern: RegExp,
  prefix: string,
  obstacles: AABB[],
  entries: CampusColliderEntry[],
): void {
  const groups = new Map<number, THREE.Mesh[]>()

  glbRoot.traverse((child) => {
    if (!(child instanceof THREE.Mesh) || child.userData.campusAggregateHidden) return
    const match = child.name.match(partPattern)
    if (!match) return
    const partIndex = Number.parseInt(match[1], 10)
    const buildingId = Math.floor((partIndex - 1) / PARTS_PER_SPLIT_BUILDING)
    const list = groups.get(buildingId) ?? []
    list.push(child)
    groups.set(buildingId, list)
  })

  for (const [buildingId, meshes] of groups.entries()) {
    const aabb = aabbFromMeshesLikeWBuilding(meshes)
    if (aabb) {
      pushObstacle(
        obstacles,
        entries,
        aabb,
        `${prefix}#${buildingId + 1}`,
        "split-building",
      )
    }
  }
}

/**
 * 商业街与餐厅之间的庭院 + 朝操场入口。
 * 在实心 footprint 内挖孔，split 后保留四周墙段，可进庭院且不易穿外墙。
 */
function buildCommercialPlazaHole(union: THREE.Box3, _playgroundMesh: THREE.Object3D | null): AABB {
  const northZ = union.min.z + PLAZA_HOLE_Z_NORTH_DEPTH
  const southZ = union.max.z + PLAZA_HOLE_Z_PLAYGROUND_EXT

  return {
    minX: union.min.x + PLAZA_HOLE_X_MARGIN,
    maxX: PLAZA_HOLE_EAST_CLEAR_X,
    minZ: northZ,
    maxZ: southZ,
  }
}

/** 餐饮区：商店/商业街实心；食堂+驿站合并为原餐厅 footprint 并挖庭院孔 */
function commercialFoodZoneColliders(
  restaurantMeshes: THREE.Mesh[],
  otherMeshes: THREE.Mesh[],
  playgroundMesh: THREE.Object3D | null,
  obstacles: AABB[],
  entries: CampusColliderEntry[],
): void {
  const union = new THREE.Box3()
  for (const mesh of [...restaurantMeshes, ...otherMeshes]) {
    mesh.updateWorldMatrix(true, false)
    union.union(new THREE.Box3().setFromObject(mesh))
  }
  const plazaHole = buildCommercialPlazaHole(union, playgroundMesh)
  const refMesh = restaurantMeshes[0] ?? null

  const restaurantAabb = aabbFromMeshesLikeWBuilding(restaurantMeshes)
  if (restaurantAabb) {
    const pieces = splitObstaclesAroundHole([restaurantAabb], plazaHole)
    pieces.forEach((piece, i) => {
      pushObstacle(
        obstacles,
        entries,
        piece,
        `餐厅-plaza-wall-${i + 1}`,
        "commercial-split",
        refMesh,
      )
    })
  }

  for (const mesh of otherMeshes) {
    const aabb = aabbFromMeshesLikeWBuilding([mesh])
    if (aabb) pushObstacle(obstacles, entries, aabb, mesh.name, "commercial", mesh)
  }
}

function meshFootprintCollider(mesh: THREE.Mesh): AABB | null {
  mesh.updateWorldMatrix(true, false)
  const box = new THREE.Box3().setFromObject(mesh)
  const size = new THREE.Vector3()
  box.getSize(size)
  if (size.y < 0.01 || size.x * size.z < 1e-6) return null
  return expandThinAABB(box, MIN_WALL_WORLD_THICKNESS)
}

/** 湖面为 y=0 平面，不能用 meshFootprintCollider 的 y 高度判断 */
function lakeFootprintCollider(mesh: THREE.Mesh): AABB | null {
  mesh.updateWorldMatrix(true, false)
  const box = new THREE.Box3().setFromObject(mesh)
  const size = new THREE.Vector3()
  box.getSize(size)
  if (size.x * size.z < 0.5) return null
  return expandThinAABB(box, LAKE_BLOCK_PADDING)
}

function inflateAABB(aabb: AABB, padding: number): AABB {
  return {
    minX: aabb.minX - padding,
    maxX: aabb.maxX + padding,
    minZ: aabb.minZ - padding,
    maxZ: aabb.maxZ + padding,
  }
}

function aabbOverlap(a: AABB, b: AABB): boolean {
  return a.minX < b.maxX && a.maxX > b.minX && a.minZ < b.maxZ && a.maxZ > b.minZ
}

function aabbArea(a: AABB): number {
  return Math.max(0, a.maxX - a.minX) * Math.max(0, a.maxZ - a.minZ)
}

/** 将单个 AABB 挖去 hole 重叠部分，保留四周实体（防穿模） */
function splitAabbAroundHole(region: AABB, hole: AABB): AABB[] {
  if (!aabbOverlap(region, hole)) return [region]

  const pieces: AABB[] = []
  const { minX, maxX, minZ, maxZ } = region
  const midMinX = Math.max(minX, hole.minX)
  const midMaxX = Math.min(maxX, hole.maxX)

  if (hole.minX > minX + 0.35) {
    pieces.push({ minX, maxX: hole.minX, minZ, maxZ })
  }
  if (hole.maxX < maxX - 0.35) {
    pieces.push({ minX: hole.maxX, maxX, minZ, maxZ })
  }
  if (hole.minZ > minZ + 0.35) {
    pieces.push({ minX: midMinX, maxX: midMaxX, minZ, maxZ: hole.minZ })
  }
  if (hole.maxZ < maxZ - 0.35) {
    pieces.push({ minX: midMinX, maxX: midMaxX, minZ: hole.maxZ, maxZ })
  }

  return pieces.filter((r) => aabbArea(r) > 0.8)
}

function splitObstaclesAroundHole(obstacles: AABB[], hole: AABB): AABB[] {
  const result: AABB[] = []
  for (const obs of obstacles) {
    result.push(...splitAabbAroundHole(obs, hole))
  }
  return result
}

/** 从湖泊障碍中挖去桥面通道，仅保留湖体区域阻挡 */
function lakeObstaclesAvoidingBridges(lakeBox: AABB, bridgeDecks: AABB[]): AABB[] {
  let regions: AABB[] = [lakeBox]
  for (const deck of bridgeDecks) {
    regions = splitObstaclesAroundHole(regions, inflateAABB(deck, BRIDGE_LAKE_CLEARANCE))
  }
  return regions.filter((r) => aabbArea(r) > 0.8)
}

/** 桥面可行走区 + 两侧护栏（东西两侧，南北为出入口不被阻） */
function buildBridgeCollision(mesh: THREE.Mesh): { walkDeck: CampusWalkSurface; rails: AABB[] } {
  mesh.updateWorldMatrix(true, false)
  const box = new THREE.Box3().setFromObject(mesh)
  const size = new THREE.Vector3()
  box.getSize(size)

  // 护栏放在短边方向（东西两侧），长边方向（南北）留作出入口
  const railAlongX = size.x < size.z
  const railSize = railAlongX
    ? Math.max(size.x * BRIDGE_RAIL_FRACTION, MIN_WALL_WORLD_THICKNESS)
    : Math.max(size.z * BRIDGE_RAIL_FRACTION, MIN_WALL_WORLD_THICKNESS)

  let walkDeck: CampusWalkSurface
  let rails: AABB[]

  const deckFallbackY = box.max.y

  if (railAlongX) {
    // 桥南北走向：护栏放在东西两侧，南北为出入口
    walkDeck = {
      minX: box.min.x + railSize,
      maxX: box.max.x - railSize,
      minZ: box.min.z,
      maxZ: box.max.z,
      surfaceY: deckFallbackY,
      // 拱桥有拱洞空隙，射线可能穿洞漏到湖面，不使用 meshUuid 做精准采样
    }
    rails = [
      // 西边护栏
      { minX: box.min.x, maxX: box.min.x + railSize, minZ: box.min.z, maxZ: box.max.z },
      // 东边护栏
      { minX: box.max.x - railSize, maxX: box.max.x, minZ: box.min.z, maxZ: box.max.z },
    ]
  } else {
    // 桥东西走向：护栏放在南北两侧，东西为出入口
    walkDeck = {
      minX: box.min.x,
      maxX: box.max.x,
      minZ: box.min.z + railSize,
      maxZ: box.max.z - railSize,
      surfaceY: deckFallbackY,
      // 拱桥有拱洞空隙，射线可能穿洞漏到湖面，不使用 meshUuid 做精准采样
    }
    rails = [
      // 南边护栏
      { minX: box.min.x, maxX: box.max.x, minZ: box.min.z, maxZ: box.min.z + railSize },
      // 北边护栏
      { minX: box.min.x, maxX: box.max.x, minZ: box.max.z - railSize, maxZ: box.max.z },
    ]
  }

  return { walkDeck, rails }
}

function isPointOnWalkSurface(
  x: number,
  z: number,
  surface: CampusWalkSurface,
  meshByUuid?: Map<string, THREE.Mesh>,
): boolean {
  if (x < surface.minX || x > surface.maxX || z < surface.minZ || z > surface.maxZ) {
    return false
  }
  if (surface.meshUuid && meshByUuid) {
    const mesh = meshByUuid.get(surface.meshUuid)
    if (mesh) return sampleMeshSurfaceYAtXZ(mesh, x, z) != null
  }
  return true
}

export function isOnWalkSurface(
  x: number,
  z: number,
  walkSurfaces: CampusWalkSurface[],
  meshByUuid?: Map<string, THREE.Mesh>,
): boolean {
  return walkSurfaces.some((surface) => isPointOnWalkSurface(x, z, surface, meshByUuid))
}

export function collectGlbColliders(
  glbRoot: THREE.Object3D,
  groundSurfaceY: number,
): CampusCollisionData {
  colliderEntryCounter = 0
  const obstacles: AABB[] = []
  const lakeObstacles: AABB[] = []
  const walkSurfaces: CampusWalkSurface[] = []
  const entries: CampusColliderEntry[] = []
  const meshByUuid = new Map<string, THREE.Mesh>()
  const bridgeDecks: AABB[] = []
  const restaurantMeshes: THREE.Mesh[] = []
  const commercialFoodMeshes: THREE.Mesh[] = []

  const numberedDorms = hasNumberedDormParts(glbRoot)
  const numberedOffices = hasNumberedOfficeParts(glbRoot)

  glbRoot.updateWorldMatrix(true, true)

  glbRoot.traverse((child) => {
    if (child instanceof THREE.Mesh && child.name) {
      meshByUuid.set(child.uuid, child)
    }
  })

  const bridgeMesh = glbRoot.getObjectByName("桥") as THREE.Mesh | null
  if (bridgeMesh) {
    const { walkDeck, rails } = buildBridgeCollision(bridgeMesh)
    walkSurfaces.push(walkDeck)
    bridgeDecks.push({
      minX: walkDeck.minX,
      maxX: walkDeck.maxX,
      minZ: walkDeck.minZ,
      maxZ: walkDeck.maxZ,
    })
    rails.forEach((rail, i) => {
      pushObstacle(obstacles, entries, rail, `桥-rail-${i + 1}`, "bridge-rail", bridgeMesh)
    })
  }

  if (numberedDorms) {
    collectSplitBuildingFootprints(glbRoot, /^宿舍(\d+)$/, "宿舍", obstacles, entries)
  }
  if (numberedOffices) {
    collectSplitBuildingFootprints(glbRoot, /^办公室(\d+)$/, "办公室", obstacles, entries)
  }

  glbRoot.traverse((child) => {
    if (!(child instanceof THREE.Mesh) || !child.name) return
    if (child.userData.campusAggregateHidden || child.userData.campusRoadHidden) return

    const name = child.name
    if (name === "桥") return

    if (isRestaurantCollisionMesh(name)) {
      restaurantMeshes.push(child)
      return
    }

    if (isCommercialFoodZoneMesh(name)) {
      commercialFoodMeshes.push(child)
      return
    }

    if (numberedDorms && isDormPartMesh(name)) return
    if (numberedOffices && isOfficePartMesh(name)) return

    if (isLakeMesh(name)) {
      const footprint = lakeFootprintCollider(child)
      if (footprint) {
        lakeObstaclesAvoidingBridges(footprint, bridgeDecks).forEach((piece, i) => {
          pushLake(lakeObstacles, entries, piece, `${name}-${i + 1}`, "lake-split", child)
        })
      }
      return
    }

    if (numberedDorms && name === "宿舍") return
    if (numberedOffices && name === "办公室") return

    const kind = classifyMesh(name)
    if (
      kind === "ground" ||
      kind === "track" ||
      kind === "court-basketball" ||
      kind === "court-tennis" ||
      kind === "court-volleyball" ||
      kind === "bridge" ||
      kind === "sculpture"
    ) {
      return
    }

    const aabb = meshFootprintCollider(child)
    if (aabb) pushObstacle(obstacles, entries, aabb, name, "mesh", child)
  })

  if (restaurantMeshes.length > 0 || commercialFoodMeshes.length > 0) {
    const playgroundMesh = glbRoot.getObjectByName("操场") ?? null
    commercialFoodZoneColliders(
      restaurantMeshes,
      commercialFoodMeshes,
      playgroundMesh,
      obstacles,
      entries,
    )
  }

  return { obstacles, polygonObstacles: [], lakePolygonObstacles: [], lakeObstacles, walkSurfaces, entries, meshByUuid }
}

export function resolveWalkSurfaceY(
  x: number,
  z: number,
  defaultY: number,
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

/** 桥上且脚下有桥面几何时，不检测湖面 */
export function buildActiveObstacles(
  x: number,
  z: number,
  obstacles: AABB[],
  lakeObstacles: AABB[],
  walkSurfaces: CampusWalkSurface[],
  meshByUuid?: Map<string, THREE.Mesh>,
): AABB[] {
  if (isOnWalkSurface(x, z, walkSurfaces, meshByUuid)) {
    return obstacles
  }
  return obstacles.concat(lakeObstacles)
}

export function buildActivePolygonObstacles(
  x: number,
  z: number,
  polygonObstacles: PolygonPoint[][],
  lakePolygonObstacles: PolygonPoint[][],
  walkSurfaces: CampusWalkSurface[],
  meshByUuid?: Map<string, THREE.Mesh>,
): PolygonPoint[][] {
  if (isOnWalkSurface(x, z, walkSurfaces, meshByUuid)) {
    return polygonObstacles
  }
  return polygonObstacles.concat(lakePolygonObstacles)
}
