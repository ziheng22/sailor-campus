import * as THREE from "three"
import { isLakeMesh } from "./campusColliders"

/** 湖面略高于地面，避免与地面 z-fighting，肉眼几乎看不出 */
export const LAKE_SURFACE_LIFT = 0.005

const _parentScale = new THREE.Vector3()

function lakeSurfaceWorldY(box: THREE.Box3): number {
  const size = new THREE.Vector3()
  box.getSize(size)
  if (size.y < 0.08) return (box.min.y + box.max.y) * 0.5
  return box.max.y
}

/**
 * 将湖1/湖2 水面抬到与地面同高（仅改 mesh 视觉位置，碰撞多边形/覆盖数据不变）。
 * 应在 collectGlbColliders 之前调用，湖面 XZ 范围不变。
 */
export function alignLakeMeshesToGround(glbRoot: THREE.Object3D, groundSurfaceY: number): void {
  glbRoot.updateMatrixWorld(true)
  const targetY = groundSurfaceY + LAKE_SURFACE_LIFT

  glbRoot.traverse((child) => {
    if (!(child instanceof THREE.Mesh) || !isLakeMesh(child.name)) return
    if (child.userData.campusLakeAligned) return

    const box = new THREE.Box3().setFromObject(child)
    const deltaWorld = targetY - lakeSurfaceWorldY(box)
    if (Math.abs(deltaWorld) < 1e-5) {
      child.userData.campusLakeAligned = true
      return
    }

    const parentScaleY = child.parent?.getWorldScale(_parentScale).y ?? 1
    child.position.y += deltaWorld / (parentScaleY || 1)
    child.updateWorldMatrix(true, false)
    child.userData.campusLakeAligned = true
  })
}

export function getCampusGroundSurfaceY(glbRoot: THREE.Object3D): number {
  glbRoot.updateMatrixWorld(true)
  let ground: THREE.Mesh | null = null
  glbRoot.traverse((child) => {
    if (child instanceof THREE.Mesh && (child.name === "地面" || child.name === "Plane")) {
      ground = child
    }
  })
  if (ground) {
    return new THREE.Box3().setFromObject(ground).max.y
  }
  return 0.22
}
