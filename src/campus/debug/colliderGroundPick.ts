import * as THREE from "three"
import type { Camera } from "three"

export function pickGroundXZ(
  clientX: number,
  clientY: number,
  canvas: HTMLCanvasElement,
  camera: Camera,
  raycaster: THREE.Raycaster,
  groundY: number,
): { x: number; z: number } | null {
  const rect = canvas.getBoundingClientRect()
  const ndcX = ((clientX - rect.left) / rect.width) * 2 - 1
  const ndcY = -((clientY - rect.top) / rect.height) * 2 + 1
  raycaster.setFromCamera(new THREE.Vector2(ndcX, ndcY), camera)
  const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -groundY)
  const hit = new THREE.Vector3()
  return raycaster.ray.intersectPlane(plane, hit) ? { x: hit.x, z: hit.z } : null
}
