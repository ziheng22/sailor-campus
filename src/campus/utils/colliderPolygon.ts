import * as THREE from "three"
import type { AABB } from "./collision"

export interface PolygonPoint {
  x: number
  z: number
}

export interface Polygon2D {
  points: PolygonPoint[]
}

export function aabbToPolygon(aabb: AABB): PolygonPoint[] {
  return [
    { x: aabb.minX, z: aabb.minZ },
    { x: aabb.maxX, z: aabb.minZ },
    { x: aabb.maxX, z: aabb.maxZ },
    { x: aabb.minX, z: aabb.maxZ },
  ]
}

export function polygonToAabb(points: PolygonPoint[]): AABB {
  let minX = Infinity
  let maxX = -Infinity
  let minZ = Infinity
  let maxZ = -Infinity
  for (const p of points) {
    minX = Math.min(minX, p.x)
    maxX = Math.max(maxX, p.x)
    minZ = Math.min(minZ, p.z)
    maxZ = Math.max(maxZ, p.z)
  }
  return { minX, maxX, minZ, maxZ }
}

export function rectPolygonAt(x: number, z: number, halfSize = 3): PolygonPoint[] {
  return [
    { x: x - halfSize, z: z - halfSize },
    { x: x + halfSize, z: z - halfSize },
    { x: x + halfSize, z: z + halfSize },
    { x: x - halfSize, z: z + halfSize },
  ]
}

export function polygonCentroid(points: PolygonPoint[]): { x: number; z: number } {
  let x = 0
  let z = 0
  for (const p of points) {
    x += p.x
    z += p.z
  }
  const n = Math.max(1, points.length)
  return { x: x / n, z: z / n }
}

export function translatePolygon(points: PolygonPoint[], dx: number, dz: number): PolygonPoint[] {
  return points.map((p) => ({ x: p.x + dx, z: p.z + dz }))
}

export function insertVertexOnEdge(
  points: PolygonPoint[],
  edgeIndex: number,
  point: PolygonPoint,
): PolygonPoint[] {
  const next = [...points]
  next.splice(edgeIndex + 1, 0, { ...point })
  return next
}

export function insertVertexAtLongestEdgeMidpoint(points: PolygonPoint[]): PolygonPoint[] {
  if (points.length < 2) return points
  let best = 0
  let bestLen = -1
  for (let i = 0; i < points.length; i++) {
    const a = points[i]
    const b = points[(i + 1) % points.length]
    const len = Math.hypot(b.x - a.x, b.z - a.z)
    if (len > bestLen) {
      bestLen = len
      best = i
    }
  }
  const a = points[best]
  const b = points[(best + 1) % points.length]
  return insertVertexOnEdge(points, best, { x: (a.x + b.x) / 2, z: (a.z + b.z) / 2 })
}

export function removeVertexAt(points: PolygonPoint[], index: number): PolygonPoint[] {
  if (points.length <= 3) return points
  return points.filter((_, i) => i !== index)
}

export function updateVertexAt(
  points: PolygonPoint[],
  index: number,
  x: number,
  z: number,
): PolygonPoint[] {
  return points.map((p, i) => (i === index ? { x, z } : p))
}

/** 点到线段最近点 */
export function closestPointOnSegment(
  px: number,
  pz: number,
  ax: number,
  az: number,
  bx: number,
  bz: number,
): { x: number; z: number; t: number } {
  const abx = bx - ax
  const abz = bz - az
  const len2 = abx * abx + abz * abz
  if (len2 < 1e-12) return { x: ax, z: az, t: 0 }
  let t = ((px - ax) * abx + (pz - az) * abz) / len2
  t = Math.max(0, Math.min(1, t))
  return { x: ax + abx * t, z: az + abz * t, t }
}

/** 点击处最近边（用于边上加点） */
export function findClosestEdge(
  x: number,
  z: number,
  points: PolygonPoint[],
): { edgeIndex: number; dist: number; point: PolygonPoint } | null {
  if (points.length < 2) return null
  let bestEdge = 0
  let bestDist = Infinity
  let bestPoint: PolygonPoint = points[0]
  for (let i = 0; i < points.length; i++) {
    const a = points[i]
    const b = points[(i + 1) % points.length]
    const cp = closestPointOnSegment(x, z, a.x, a.z, b.x, b.z)
    const d = Math.hypot(x - cp.x, z - cp.z)
    if (d < bestDist) {
      bestDist = d
      bestEdge = i
      bestPoint = { x: cp.x, z: cp.z }
    }
  }
  return { edgeIndex: bestEdge, dist: bestDist, point: bestPoint }
}

export function polygonOutlineY(points: PolygonPoint[], groundY: number, lift = 0.1): THREE.Vector3[] {
  return points.map((p) => new THREE.Vector3(p.x, groundY + lift, p.z))
}

/** 旧版编辑器填充面 Z 轴镜像时，角点数据需翻转才能与道路世界坐标对齐 */
export function mirrorPolygonZ(points: PolygonPoint[]): PolygonPoint[] {
  return points.map((p) => ({ x: p.x, z: -p.z }))
}

/**  campus 多边形 (x,z) → Shape XY；配合 GROUND_SHAPE_ROTATION 落到 XZ 地面  */
export function polygonToGroundShape(points: PolygonPoint[]): THREE.Shape {
  const shape = new THREE.Shape()
  if (points.length < 3) return shape
  shape.moveTo(points[0].x, points[0].z)
  for (let i = 1; i < points.length; i++) shape.lineTo(points[i].x, points[i].z)
  shape.closePath()
  return shape
}

/** Shape XY → 世界 XZ（+π/2 绕 X）；数据 (x,z) 即道路/角点共用坐标  */
export const GROUND_SHAPE_ROTATION: [number, number, number] = [Math.PI / 2, 0, 0]

/** Ray-casting 算法：判断点 (x, z) 是否在凸/凹多边形内部 */
export function pointInPolygon(x: number, z: number, polygon: PolygonPoint[]): boolean {
  let inside = false
  const n = polygon.length
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const xi = polygon[i].x
    const zi = polygon[i].z
    const xj = polygon[j].x
    const zj = polygon[j].z
    if ((zi > z) !== (zj > z) && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) {
      inside = !inside
    }
  }
  return inside
}
