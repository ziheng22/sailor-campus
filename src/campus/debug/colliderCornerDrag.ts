import * as THREE from "three"
import type { AABB } from "../utils/collision"

export type ColliderCornerKey = "sw" | "se" | "nw" | "ne"

export const COLLIDER_CORNER_KEYS: ColliderCornerKey[] = ["sw", "se", "nw", "ne"]

const MIN_EDGE = 0.45

export function cornerWorldPosition(
  key: ColliderCornerKey,
  aabb: AABB,
  groundY: number,
  lift = 0.35,
): [number, number, number] {
  const y = groundY + lift
  switch (key) {
    case "sw":
      return [aabb.minX, y, aabb.minZ]
    case "se":
      return [aabb.maxX, y, aabb.minZ]
    case "nw":
      return [aabb.minX, y, aabb.maxZ]
    case "ne":
      return [aabb.maxX, y, aabb.maxZ]
  }
}

export function applyCornerDrag(
  key: ColliderCornerKey,
  aabb: AABB,
  x: number,
  z: number,
  minEdge = MIN_EDGE,
): AABB {
  const next: AABB = { ...aabb }
  switch (key) {
    case "sw":
      next.minX = Math.min(x, aabb.maxX - minEdge)
      next.minZ = Math.min(z, aabb.maxZ - minEdge)
      break
    case "se":
      next.maxX = Math.max(x, aabb.minX + minEdge)
      next.minZ = Math.min(z, aabb.maxZ - minEdge)
      break
    case "nw":
      next.minX = Math.min(x, aabb.maxX - minEdge)
      next.maxZ = Math.max(z, aabb.minZ + minEdge)
      break
    case "ne":
      next.maxX = Math.max(x, aabb.minX + minEdge)
      next.maxZ = Math.max(z, aabb.minZ + minEdge)
      break
  }
  return next
}

export function aabbOutlinePoints(aabb: AABB, groundY: number, lift = 0.08): THREE.Vector3[] {
  const y = groundY + lift
  return [
    new THREE.Vector3(aabb.minX, y, aabb.minZ),
    new THREE.Vector3(aabb.maxX, y, aabb.minZ),
    new THREE.Vector3(aabb.maxX, y, aabb.maxZ),
    new THREE.Vector3(aabb.minX, y, aabb.maxZ),
  ]
}
