import * as THREE from "three"
import { type AABB } from "../utils/collision"
import type { PolygonPoint } from "../utils/colliderPolygon"
import { classifyMesh } from "./campusMaterials"
import {
  hasNumberedDormParts,
  isAggregateClusterMesh,
  isDormPartMesh,
  isOfficePartMesh,
} from "./campusColliders"

export {
  buildActiveObstacles,
  buildActivePolygonObstacles,
  collectGlbColliders,
  resolveWalkSurfaceY,
  type CampusCollisionData,
  type CampusWalkSurface,
} from "./campusColliders"

const MIN_VOLUME_HEIGHT = 0.1
/** 拆分建筑（宿舍/办公室墙段）每组 6 个 mesh：墙 + 顶 + 底 */
const PARTS_PER_SPLIT_BUILDING = 6
/** 世界空间脚底与 GLB 地面上表面的间隙（避免与 avatarConfig 循环依赖） */
const FEET_GROUND_CLEARANCE = 0.035

/** 同名建筑在 GLB 热更新后保留已调好的 scale.y */
const preservedMeshScaleY = new Map<string, number>()

function isDormExtensionMesh(name: string): boolean {
  return name === "18号寝室楼" || name === "18号宿舍楼"
}

export function isRoadMeshName(name: string): boolean {
  if (!name) return false
  const n = name.toLowerCase()
  if (name === "地面" || n === "plane") return false
  if (n.includes("ground") && !n.includes("background")) return false
  if (n.includes("base") && (n.includes("floor") || n.includes("ground"))) return false
  if (name.includes("地面") || name.includes("地板")) return false
  return (
    n === "road" ||
    n.includes("road_") ||
    n.includes("_road") ||
    n.includes("road_mesh") ||
    n.includes("street") ||
    n.includes("path") ||
    name.includes("道路") ||
    name.includes("马路")
  )
}

export function hideRoadMeshes(glbRoot: THREE.Object3D): void {
  glbRoot.traverse((child) => {
    if (!(child instanceof THREE.Mesh) || !child.name) return
    if (!isRoadMeshName(child.name)) return
    child.visible = false
    child.userData.campusRoadHidden = true
  })
}

export interface ExtractedRoadFootprint {
  name: string
  polygon: PolygonPoint[]
}

const ROAD_FOOTPRINT_MIN_AREA = 1.0
const ROAD_FOOTPRINT_MIN_WIDTH = 0.3

/** 从 GLB 根节点提取道路 mesh 的世界空间 XZ 矩形 */
export function extractRoadFootprintsFromGlb(glbRoot: THREE.Object3D): ExtractedRoadFootprint[] {
  glbRoot.updateWorldMatrix(true, true)

  const roadMeshes: { mesh: THREE.Mesh; bbox: THREE.Box3 }[] = []
  glbRoot.traverse((child) => {
    if (!(child instanceof THREE.Mesh) || !child.name) return
    if (!isRoadMeshName(child.name)) return
    child.updateWorldMatrix(true, false)
    const bbox = new THREE.Box3().setFromObject(child)
    const size = new THREE.Vector3()
    bbox.getSize(size)
    if (size.x < ROAD_FOOTPRINT_MIN_WIDTH && size.z < ROAD_FOOTPRINT_MIN_WIDTH) return
    if (size.x * size.z < ROAD_FOOTPRINT_MIN_AREA) return
    roadMeshes.push({ mesh: child, bbox })
  })

  console.log(`[extractRoadFootprints] found ${roadMeshes.length} road meshes in GLB`)

  if (roadMeshes.length === 0) return []

  // Group by simplified name
  const groups = new Map<string, THREE.Box3[]>()
  for (const { mesh, bbox } of roadMeshes) {
    const baseName = mesh.name.replace(/[._\-\d]+$/g, "").trim() || mesh.name
    const list = groups.get(baseName) ?? []
    list.push(bbox)
    groups.set(baseName, list)
  }

  const footprints: ExtractedRoadFootprint[] = []
  for (const [name, boxes] of groups) {
    const union = new THREE.Box3()
    for (const b of boxes) union.union(b)

    footprints.push({
      name,
      polygon: [
        { x: union.min.x, z: union.min.z },
        { x: union.min.x, z: union.max.z },
        { x: union.max.x, z: union.max.z },
        { x: union.max.x, z: union.min.z },
      ],
    })
  }

  return footprints
}

function capturePreservedScaleY(glbRoot: THREE.Object3D): void {
  glbRoot.traverse((child) => {
    if (!(child instanceof THREE.Mesh) || !child.name) return
    if (isSplitBuildingPartMesh(child.name)) return
    if (!child.userData.campusHeightScaled) return
    preservedMeshScaleY.set(child.name, child.scale.y)
  })
}

function isSplitBuildingPartMesh(name: string): boolean {
  return isDormPartMesh(name) || isOfficePartMesh(name)
}

function splitBuildingGroupKey(name: string): string | null {
  const dorm = name.match(/^宿舍(\d+)$/)
  if (dorm) {
    const idx = Number.parseInt(dorm[1], 10)
    return `dorm-${Math.floor((idx - 1) / PARTS_PER_SPLIT_BUILDING)}`
  }
  const office = name.match(/^办公室(\d+)$/)
  if (office) {
    const idx = Number.parseInt(office[1], 10)
    return `office-${Math.floor((idx - 1) / PARTS_PER_SPLIT_BUILDING)}`
  }
  return null
}

function collectSplitBuildingGroups(glbRoot: THREE.Object3D): Map<string, THREE.Mesh[]> {
  const groups = new Map<string, THREE.Mesh[]>()
  glbRoot.traverse((child) => {
    if (!(child instanceof THREE.Mesh) || child.userData.campusAggregateHidden) return
    if (!isSplitBuildingPartMesh(child.name)) return
    const key = splitBuildingGroupKey(child.name)
    if (!key) return
    const list = groups.get(key) ?? []
    list.push(child)
    groups.set(key, list)
  })
  return groups
}

function isVerticalBuildingPart(mesh: THREE.Mesh): boolean {
  mesh.updateWorldMatrix(true, false)
  const size = new THREE.Box3().setFromObject(mesh).getSize(new THREE.Vector3())
  return size.y >= MIN_VOLUME_HEIGHT
}

function shiftMeshWorldY(mesh: THREE.Mesh, worldDeltaY: number): void {
  if (Math.abs(worldDeltaY) < 1e-6) return
  const parentScaleY = mesh.parent ? mesh.parent.getWorldScale(new THREE.Vector3()).y : 1
  mesh.position.y += worldDeltaY / (parentScaleY || 1)
  mesh.updateWorldMatrix(true, false)
}

/** 拆分楼：墙段统一压到 targetWorldHeight，顶/底板贴回顶部/底部 */
function scaleSplitBuildingGroup(parts: THREE.Mesh[], targetWorldHeight: number): void {
  if (parts.length === 0) return
  if (parts.every((p) => p.userData.campusHeightScaled)) return

  parts.forEach((p) => p.updateWorldMatrix(true, false))
  const unitBox = new THREE.Box3()
  for (const part of parts) unitBox.union(new THREE.Box3().setFromObject(part))
  const unitTop = unitBox.max.y
  const unitBottom = unitBox.min.y

  const vertical: THREE.Mesh[] = []
  const horizontal: { mesh: THREE.Mesh; isRoof: boolean }[] = []

  for (const mesh of parts) {
    const box = new THREE.Box3().setFromObject(mesh)
    if (isVerticalBuildingPart(mesh)) {
      vertical.push(mesh)
      continue
    }
    const centerY = (box.min.y + box.max.y) / 2
    const isRoof = centerY >= unitTop - 0.02
    horizontal.push({ mesh, isRoof })
  }

  if (vertical.length === 0) return

  for (const mesh of vertical) {
    scaleObjectToWorldHeightKeepBottom(mesh, targetWorldHeight)
  }

  const wallBox = new THREE.Box3()
  for (const mesh of vertical) wallBox.union(new THREE.Box3().setFromObject(mesh))

  for (const { mesh, isRoof } of horizontal) {
    mesh.updateWorldMatrix(true, false)
    const box = new THREE.Box3().setFromObject(mesh)
    const delta = isRoof ? wallBox.max.y - box.max.y : wallBox.min.y - box.min.y
    shiftMeshWorldY(mesh, delta)
    mesh.userData.campusHeightScaled = true
  }
}

function applyPreservedScaleY(glbRoot: THREE.Object3D): void {
  glbRoot.traverse((child) => {
    if (!(child instanceof THREE.Mesh) || !child.name) return
    if (isSplitBuildingPartMesh(child.name)) return
    const locked = preservedMeshScaleY.get(child.name)
    if (locked == null) return
    child.scale.y = locked
    child.userData.campusHeightScaled = true
  })
  glbRoot.updateWorldMatrix(true, true)
}

function getMeshWorldHeight(mesh: THREE.Mesh): number {
  mesh.updateWorldMatrix(true, false)
  const box = new THREE.Box3().setFromObject(mesh)
  return box.getSize(new THREE.Vector3()).y
}

/** 新宿舍楼与「宿舍」集群保持同一世界高度 */
function alignDormHeightToReference(
  mesh: THREE.Mesh,
  reference: THREE.Mesh | null,
  targetWorldHeight: number,
): void {
  if (mesh.userData.campusHeightScaled) return
  if (reference && reference.userData.campusHeightScaled) {
    const refHeight = getMeshWorldHeight(reference)
    if (refHeight >= MIN_VOLUME_HEIGHT) {
      scaleObjectToWorldHeightKeepBottom(mesh, refHeight)
      return
    }
  }
  scaleObjectToWorldHeightKeepBottom(mesh, targetWorldHeight)
}

/** 桥、红色花蕊不调整高度；聚合宿舍/办公室由独立墙段承担缩放 */
export function shouldScaleBuildingHeight(meshName: string): boolean {
  if (!meshName || meshName === "Scene" || meshName === "Root") return false
  if (isAggregateClusterMesh(meshName)) return false
  const kind = classifyMesh(meshName)
  if (kind === "bridge" || kind === "sculpture") return false
  if (
    kind === "ground" ||
    kind === "lake" ||
    kind === "track" ||
    kind === "court-basketball" ||
    kind === "court-tennis" ||
    kind === "court-volleyball"
  ) {
    return false
  }
  return true
}

/** 世界空间高度缩放，保持底部 Y 不变 */
export function scaleObjectToWorldHeightKeepBottom(
  object: THREE.Object3D,
  targetWorldHeight: number,
): void {
  if (object.userData.campusHeightScaled) return

  object.updateWorldMatrix(true, false)
  const box = new THREE.Box3().setFromObject(object)
  const size = box.getSize(new THREE.Vector3())
  if (size.y < MIN_VOLUME_HEIGHT) return

  const bottomWorldY = box.min.y
  const factor = targetWorldHeight / size.y

  object.scale.y *= factor
  object.updateWorldMatrix(true, false)

  const boxAfter = new THREE.Box3().setFromObject(object)
  const bottomDelta = bottomWorldY - boxAfter.min.y

  if (Math.abs(bottomDelta) > 1e-6) {
    const parentScale = new THREE.Vector3(1, 1, 1)
    if (object.parent) object.parent.getWorldScale(parentScale)
    object.position.y += bottomDelta / (parentScale.y || 1)
  }

  object.userData.campusHeightScaled = true
  object.updateWorldMatrix(true, false)
}

export function scaleGlbBuildings(glbRoot: THREE.Object3D, targetWorldHeight: number): void {
  glbRoot.updateWorldMatrix(true, true)
  applyPreservedScaleY(glbRoot)

  const numberedDorms = hasNumberedDormParts(glbRoot)
  const splitGroups = collectSplitBuildingGroups(glbRoot)
  const dormReference = numberedDorms
    ? (glbRoot.getObjectByName("宿舍001") as THREE.Mesh | null)
    : (glbRoot.getObjectByName("宿舍") as THREE.Mesh | null)
  const dormExtensions: THREE.Mesh[] = []
  const otherMeshes: THREE.Mesh[] = []

  glbRoot.traverse((child) => {
    if (!(child instanceof THREE.Mesh) || !shouldScaleBuildingHeight(child.name)) return
    if (child.userData.campusHeightScaled) return
    if (child.userData.campusAggregateHidden) return
    if (isSplitBuildingPartMesh(child.name)) return
    if (isDormExtensionMesh(child.name)) {
      dormExtensions.push(child)
      return
    }
    otherMeshes.push(child)
  })

  for (const parts of splitGroups.values()) {
    scaleSplitBuildingGroup(parts, targetWorldHeight)
  }

  if (dormReference && !dormReference.userData.campusHeightScaled && !numberedDorms) {
    scaleObjectToWorldHeightKeepBottom(dormReference, targetWorldHeight)
  }
  for (const mesh of otherMeshes) {
    scaleObjectToWorldHeightKeepBottom(mesh, targetWorldHeight)
  }
  for (const mesh of dormExtensions) {
    alignDormHeightToReference(mesh, dormReference, targetWorldHeight)
  }

  capturePreservedScaleY(glbRoot)
  glbRoot.updateWorldMatrix(true, true)
}

export function getHumanHeight(playerRoot: THREE.Object3D): number {
  playerRoot.updateWorldMatrix(true, false)
  const box = new THREE.Box3().setFromObject(playerRoot)
  const size = box.getSize(new THREE.Vector3())
  return size.y > 0.01 ? size.y : 1.8
}

/** 脚底对齐到 GLB 地面上表面（略抬高避免 z-fighting 陷地） */
export function snapFeetToGround(playerRoot: THREE.Object3D, groundY = 0): void {
  playerRoot.updateWorldMatrix(true, false)
  const box = new THREE.Box3().setFromObject(playerRoot)
  playerRoot.position.y += groundY - box.min.y + FEET_GROUND_CLEARANCE
  playerRoot.updateWorldMatrix(true, false)
}

/** 重置高度缩放标记（便于回退后重算） */
export function resetBuildingHeightScale(glbRoot: THREE.Object3D): void {
  glbRoot.traverse((child) => {
    delete child.userData.campusHeightScaled
  })
  preservedMeshScaleY.clear()
}
