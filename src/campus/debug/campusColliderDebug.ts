import * as THREE from "three"
import { classifyMesh, isColliderMesh } from "../scene/campusMaterials"
import type {
  AirWallFlag,
  AirWallReport,
  CampusColliderEntry,
  ColliderFixSuggestion,
} from "./campusColliderTypes"

const INFLATION_RATIO_THRESHOLD = 1.35
const OVERSIZED_DIM_RATIO = 2.5
const OPEN_AREA_MIN = 900

function aabbArea(aabb: { minX: number; maxX: number; minZ: number; maxZ: number }): number {
  return Math.max(0, aabb.maxX - aabb.minX) * Math.max(0, aabb.maxZ - aabb.minZ)
}

function meshRawFootprintArea(mesh: THREE.Mesh): number | undefined {
  mesh.updateWorldMatrix(true, false)
  const box = new THREE.Box3().setFromObject(mesh)
  const size = box.getSize(new THREE.Vector3())
  if (size.x * size.z < 1e-6) return undefined
  return size.x * size.z
}

function isRoadOrPlazaMesh(name: string): boolean {
  const kind = classifyMesh(name)
  if (kind === "ground" || kind === "track" || (kind === "court-tennis" || kind === "court-volleyball") || kind === "court-basketball") {
    return true
  }
  return /路|广场|地面|跑道|草坪/.test(name)
}

function suggestFix(entry: CampusColliderEntry, flags: AirWallFlag[]): ColliderFixSuggestion | undefined {
  if (entry.layer === "lake") {
    return {
      action: "no-op-intentional",
      detail: "湖面阻挡为预期行为；桥上由 walkSurface 跳过 lakeObstacles",
      rapierEquivalent: "sensor=true 或 collisionGroups 排除玩家",
    }
  }
  if (flags.includes("hidden-aggregate") || flags.includes("orphan-hidden-mesh")) {
    return {
      action: "skip-in-collectGlbColliders",
      detail: `在 collectGlbColliders 中跳过隐藏 mesh「${entry.name}」`,
      rapierEquivalent: "移除 RigidBody / 不创建 Collider",
    }
  }
  if (flags.includes("road-plaza-block")) {
    return {
      action: "add-to-exclude-set",
      detail: `将「${entry.name}」加入 classifyMesh 排除或 hideRoadMeshes`,
      rapierEquivalent: "collisionGroups=0",
    }
  }
  if (flags.includes("collider-inflated") || flags.includes("oversized-vs-mesh")) {
    return {
      action: "reduce-min-wall-thickness",
      detail: "检查 expandThinAABB / MIN_WALL_WORLD_THICKNESS 是否过大",
      rapierEquivalent: "缩小 CuboidCollider halfExtents",
    }
  }
  if (flags.includes("open-area-block") && entry.sourceKind === "commercial-split") {
    return {
      action: "split-plaza-hole",
      detail: "扩大 PLAZA_HOLE 或 splitObstaclesAroundHole 范围",
      rapierEquivalent: "sensor=true 或删除该 Collider",
    }
  }
  if (flags.length > 0) {
    return {
      action: "skip-in-collectGlbColliders",
      detail: `在 campusColliders.ts 排除「${entry.name}」对应 mesh`,
      rapierEquivalent: "移除 Collider 或 sensor=true",
    }
  }
  return undefined
}

function analyzeEntry(entry: CampusColliderEntry, mesh?: THREE.Mesh | null): CampusColliderEntry {
  const flags: AirWallFlag[] = []

  if (mesh) {
    if (!mesh.visible) flags.push("invisible-mesh")
    if (mesh.userData.campusAggregateHidden) flags.push("hidden-aggregate")
    if (mesh.userData.campusRoadHidden) flags.push("hidden-road")
    if (!mesh.geometry) flags.push("no-geometry")
    if (!mesh.material) flags.push("no-material")
    if (isRoadOrPlazaMesh(mesh.name)) flags.push("road-plaza-block")

    const rawArea = meshRawFootprintArea(mesh)
    if (rawArea && rawArea > 0) {
      entry.meshFootprintArea = rawArea
      entry.inflationRatio = entry.area / rawArea
      if (entry.inflationRatio > INFLATION_RATIO_THRESHOLD) flags.push("collider-inflated")
      const meshBox = new THREE.Box3().setFromObject(mesh)
      const ms = meshBox.getSize(new THREE.Vector3())
      const collW = entry.width
      const collD = entry.depth
      if (ms.x > 0.01 && collW / ms.x > OVERSIZED_DIM_RATIO) flags.push("oversized-vs-mesh")
      if (ms.z > 0.01 && collD / ms.z > OVERSIZED_DIM_RATIO) flags.push("oversized-vs-mesh")
    }
  } else if (entry.sourceKind === "mesh") {
    flags.push("no-geometry")
  }

  if (entry.area >= OPEN_AREA_MIN && entry.sourceKind !== "lake" && mesh?.visible) {
    flags.push("open-area-block")
  }

  const isAirWall =
    flags.length > 0 &&
    !(entry.layer === "lake" && flags.every((f) => f === "collider-inflated"))

  const fix = isAirWall ? suggestFix(entry, flags) : undefined

  return { ...entry, flags, fix }
}

/** 扫描 GLB 中隐藏但仍可能被误加碰撞的 mesh */
export function scanOrphanHiddenColliderMeshes(glbRoot: THREE.Object3D): CampusColliderEntry[] {
  const orphans: CampusColliderEntry[] = []
  let i = 0
  glbRoot.traverse((child) => {
    if (!(child instanceof THREE.Mesh) || !child.name) return
    if (!isColliderMesh(child.name)) return
    const hidden =
      !child.visible ||
      child.userData.campusAggregateHidden ||
      child.userData.campusRoadHidden
    if (!hidden) return

    child.updateWorldMatrix(true, false)
    const box = new THREE.Box3().setFromObject(child)
    const size = box.getSize(new THREE.Vector3())
    if (size.y < 0.01 || size.x * size.z < 0.5) return

    const aabb = {
      minX: box.min.x,
      maxX: box.max.x,
      minZ: box.min.z,
      maxZ: box.max.z,
    }
    const w = aabb.maxX - aabb.minX
    const d = aabb.maxZ - aabb.minZ
    orphans.push({
      id: `orphan-${i++}`,
      name: child.name,
      sourceKind: "mesh",
      layer: "obstacle",
      aabb,
      center: { x: (aabb.minX + aabb.maxX) / 2, z: (aabb.minZ + aabb.maxZ) / 2 },
      width: w,
      depth: d,
      area: w * d,
      meshUuid: child.uuid,
      meshVisible: child.visible,
      meshHiddenFlags: [
        !child.visible ? "visible=false" : "",
        child.userData.campusAggregateHidden ? "campusAggregateHidden" : "",
        child.userData.campusRoadHidden ? "campusRoadHidden" : "",
      ].filter(Boolean),
      flags: ["orphan-hidden-mesh"],
      fix: {
        action: "skip-in-collectGlbColliders",
        detail: `隐藏 mesh「${child.name}」不应生成碰撞；确认 traverse 已跳过`,
        rapierEquivalent: "移除 RigidBody",
      },
    })
  })
  return orphans
}

export function buildAirWallReport(
  entries: CampusColliderEntry[],
  glbRoot: THREE.Object3D,
  meshByUuid: Map<string, THREE.Mesh>,
): AirWallReport {
  const analyzed = entries.map((e) =>
    analyzeEntry(e, e.meshUuid ? meshByUuid.get(e.meshUuid) : undefined),
  )
  const orphanHiddenMeshes = scanOrphanHiddenColliderMeshes(glbRoot)
  const airWalls = analyzed.filter(
    (e) =>
      e.flags.length > 0 &&
      !(
        e.layer === "lake" &&
        e.flags.every((f) => f === "collider-inflated" || f === "oversized-vs-mesh")
      ),
  )

  const lines = [
    `[Campus Collider Debug] 物理后端: 自定义 AABB（未使用 @react-three/rapier）`,
    `碰撞体总数: ${analyzed.length}，疑似空气墙: ${airWalls.length}，隐藏 orphan mesh: ${orphanHiddenMeshes.length}`,
  ]

  for (const e of [...airWalls, ...orphanHiddenMeshes]) {
    lines.push(
      `  • ${e.name} [${e.sourceKind}] ${e.width.toFixed(1)}×${e.depth.toFixed(1)} @ (${e.center.x.toFixed(1)}, ${e.center.z.toFixed(1)}) flags=${e.flags.join(",")}`,
    )
    if (e.fix) lines.push(`    修复: ${e.fix.action} — ${e.fix.detail}`)
  }

  const report: AirWallReport = {
    totalColliders: analyzed.length,
    airWallCount: airWalls.length + orphanHiddenMeshes.length,
    entries: analyzed,
    airWalls,
    orphanHiddenMeshes,
    physicsBackend: "custom-aabb",
    rapierDetected: false,
    consoleSummary: lines.join("\n"),
  }

  return report
}

export function logAirWallReport(report: AirWallReport): void {
  console.group("[Campus] 碰撞体 / 空气墙检测报告")
  console.log(report.consoleSummary)
  console.table(
    report.entries.map((e) => ({
      name: e.name,
      kind: e.sourceKind,
      layer: e.layer,
      w: +e.width.toFixed(2),
      d: +e.depth.toFixed(2),
      cx: +e.center.x.toFixed(1),
      cz: +e.center.z.toFixed(1),
      flags: e.flags.join("|") || "-",
      fix: e.fix?.action ?? "-",
    })),
  )
  if (report.orphanHiddenMeshes.length > 0) {
    console.warn("隐藏但仍可能被误碰撞的 mesh:", report.orphanHiddenMeshes)
  }
  if (report.airWalls.length > 0) {
    console.warn(
      "疑似空气墙（不可见/过大/道路阻挡）:",
      report.airWalls.map((e) => ({
        name: e.name,
        flags: e.flags,
        fix: e.fix,
      })),
    )
  }
  console.groupEnd()
}
