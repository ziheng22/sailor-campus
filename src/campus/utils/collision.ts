import type { PolygonPoint } from "./colliderPolygon"

// AABB collision detection
export interface AABB {
  minX: number; maxX: number
  minZ: number; maxZ: number
}

export function makeAABB(x: number, z: number, hw: number, hd: number): AABB {
  return { minX: x - hw, maxX: x + hw, minZ: z - hd, maxZ: z + hd }
}

export function aabbIntersects(a: AABB, b: AABB): boolean {
  return a.minX < b.maxX && a.maxX > b.minX && a.minZ < b.maxZ && a.maxZ > b.minZ
}

export function pointInAABB(x: number, z: number, box: AABB): boolean {
  return x >= box.minX && x <= box.maxX && z >= box.minZ && z <= box.maxZ
}

export function resolveCollision(
  pos: { x: number; z: number },
  radius: number,
  obstacles: AABB[],
): { x: number; z: number } {
  let { x, z } = pos
  for (let pass = 0; pass < 3; pass++) {
    for (const obs of obstacles) {
      const expanded = {
        minX: obs.minX - radius,
        maxX: obs.maxX + radius,
        minZ: obs.minZ - radius,
        maxZ: obs.maxZ + radius,
      }
      if (
        x >= expanded.minX &&
        x <= expanded.maxX &&
        z >= expanded.minZ &&
        z <= expanded.maxZ
      ) {
        const dxLeft = Math.abs(x - expanded.minX)
        const dxRight = Math.abs(x - expanded.maxX)
        const dzTop = Math.abs(z - expanded.minZ)
        const dzBottom = Math.abs(z - expanded.maxZ)
        const min = Math.min(dxLeft, dxRight, dzTop, dzBottom)
        if (min === dxLeft) x = expanded.minX
        else if (min === dxRight) x = expanded.maxX
        else if (min === dzTop) z = expanded.minZ
        else z = expanded.maxZ
      }
    }
  }
  return { x, z }
}

/** 射线法判断点是否在简单多边形内（XZ 平面） */
export function pointInPolygon(x: number, z: number, points: PolygonPoint[]): boolean {
  if (points.length < 3) return false
  let inside = false
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const xi = points[i].x
    const zi = points[i].z
    const xj = points[j].x
    const zj = points[j].z
    const intersect =
      zi > z !== zj > z && x < ((xj - xi) * (z - zi)) / (zj - zi + 1e-12) + xi
    if (intersect) inside = !inside
  }
  return inside
}

function closestPointOnSegmentXZ(
  px: number,
  pz: number,
  ax: number,
  az: number,
  bx: number,
  bz: number,
): { x: number; z: number } {
  const abx = bx - ax
  const abz = bz - az
  const len2 = abx * abx + abz * abz
  if (len2 < 1e-12) return { x: ax, z: az }
  let t = ((px - ax) * abx + (pz - az) * abz) / len2
  t = Math.max(0, Math.min(1, t))
  return { x: ax + abx * t, z: az + abz * t }
}

function polygonCentroid(points: PolygonPoint[]): { x: number; z: number } {
  let x = 0
  let z = 0
  for (const p of points) {
    x += p.x
    z += p.z
  }
  const n = Math.max(1, points.length)
  return { x: x / n, z: z / n }
}

function edgeOutwardNormal(
  ax: number,
  az: number,
  bx: number,
  bz: number,
  cx: number,
  cz: number,
): { nx: number; nz: number } {
  let nx = -(bz - az)
  let nz = bx - ax
  const mx = (ax + bx) / 2
  const mz = (az + bz) / 2
  if ((cx - mx) * nx + (cz - mz) * nz < 0) {
    nx = -nx
    nz = -nz
  }
  const len = Math.hypot(nx, nz) || 1
  return { nx: nx / len, nz: nz / len }
}

/** 圆（玩家）与多边形障碍分离 */
export function resolveCirclePolygon(
  pos: { x: number; z: number },
  radius: number,
  points: PolygonPoint[],
): { x: number; z: number } {
  if (points.length < 3) return pos
  let { x, z } = pos
  const c = polygonCentroid(points)

  for (let pass = 0; pass < 5; pass++) {
    if (pointInPolygon(x, z, points)) {
      let bestDist = Infinity
      let pushNx = 0
      let pushNz = 1
      for (let i = 0; i < points.length; i++) {
        const a = points[i]
        const b = points[(i + 1) % points.length]
        const cp = closestPointOnSegmentXZ(x, z, a.x, a.z, b.x, b.z)
        const d = Math.hypot(x - cp.x, z - cp.z)
        if (d < bestDist) {
          bestDist = d
          const n = edgeOutwardNormal(a.x, a.z, b.x, b.z, c.x, c.z)
          pushNx = n.nx
          pushNz = n.nz
        }
      }
      const depth = radius + 0.04 - bestDist
      if (depth > 0) {
        x += pushNx * depth
        z += pushNz * depth
      }
    }

    for (let i = 0; i < points.length; i++) {
      const a = points[i]
      const b = points[(i + 1) % points.length]
      const cp = closestPointOnSegmentXZ(x, z, a.x, a.z, b.x, b.z)
      const dx = x - cp.x
      const dz = z - cp.z
      const dist = Math.hypot(dx, dz)
      if (dist < radius && dist > 1e-5) {
        const push = radius - dist
        x += (dx / dist) * push
        z += (dz / dist) * push
      }
    }
  }

  return { x, z }
}

export function resolveCollisionMixed(
  pos: { x: number; z: number },
  radius: number,
  aabbs: AABB[],
  polygons: PolygonPoint[][],
): { x: number; z: number } {
  let resolved = resolveCollision(pos, radius, aabbs)
  for (const poly of polygons) {
    resolved = resolveCirclePolygon(resolved, radius, poly)
  }
  return resolved
}
