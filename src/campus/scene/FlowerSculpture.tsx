/**
 * 红色花蕊雕塑替换逻辑
 *
 * 从 GlbCampus.tsx 拆分，避免单文件过大。
 * 用新 GLB 模型替换 GLB 场景中的旧花蕊，并创建碰撞体和 AABB 障碍。
 */
import * as THREE from "three"
import { type AABB } from "../utils/collision"

export interface FlowerReplaceResult {
  flowerObstacle: AABB
}

export function findOldFlower(root: THREE.Object3D): THREE.Mesh | null {
  let result: THREE.Mesh | null = null
  root.traverse((child) => {
    if (child instanceof THREE.Mesh && child.name.includes("红色花蕊")) result = child
  })
  return result
}

export function replaceFlowerSculpture(
  group: THREE.Group,
  flowerScene: THREE.Group,
  r3fScene: THREE.Scene,
  groundY: number,
): FlowerReplaceResult | null {
  const campusScene = group.children[0]
  if (!campusScene) return null

  const oldFlower = findOldFlower(campusScene)
  if (!oldFlower) return null

  group.updateWorldMatrix(true, false)

  const oldWorldBox = new THREE.Box3().setFromObject(oldFlower)
  const oldHeightWorld = oldWorldBox.max.y - oldWorldBox.min.y

  const oldWorldPos = new THREE.Vector3()
  oldFlower.getWorldPosition(oldWorldPos)

  const oldWorldQuat = new THREE.Quaternion()
  oldFlower.getWorldQuaternion(oldWorldQuat)

  oldFlower.removeFromParent()

  const flowerRoot = new THREE.Group()
  flowerRoot.name = "flowerSculptureRoot"
  flowerRoot.scale.set(1, 1, 1)
  flowerRoot.position.set(oldWorldPos.x, groundY, oldWorldPos.z)
  flowerRoot.rotation.setFromQuaternion(oldWorldQuat)

  const flowerClone = flowerScene.clone(true)
  const newLocalBox = new THREE.Box3()
  flowerClone.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      child.castShadow = true
      child.receiveShadow = true
      child.userData.campusFlowerMesh = true
      newLocalBox.union(new THREE.Box3().setFromObject(child))
    }
  })
  const newHeightLocal = Math.max(newLocalBox.max.y - newLocalBox.min.y, 0.001)

  const uniformScale = oldHeightWorld / newHeightLocal
  const safeScale = Math.min(Math.max(uniformScale, 0.01), 20)
  flowerClone.scale.setScalar(safeScale)

  flowerRoot.add(flowerClone)
  flowerRoot.updateWorldMatrix(true, false)

  const placedBox = new THREE.Box3().setFromObject(flowerClone)
  flowerClone.position.y -= placedBox.min.y

  r3fScene.add(flowerRoot)
  r3fScene.updateMatrixWorld(true)

  const flowerMeshes: THREE.Mesh[] = []
  const finalWorldBox = new THREE.Box3()
  flowerClone.traverse((child) => {
    if (child instanceof THREE.Mesh && child.userData.campusFlowerMesh) {
      flowerMeshes.push(child)
      finalWorldBox.union(new THREE.Box3().setFromObject(child))
    }
  })

  const colliderSize = new THREE.Vector3()
  finalWorldBox.getSize(colliderSize)
  const colliderCenter = new THREE.Vector3()
  finalWorldBox.getCenter(colliderCenter)

  const rootWorldPos = new THREE.Vector3()
  flowerRoot.getWorldPosition(rootWorldPos)
  const colliderLocalCenter = colliderCenter.clone().sub(rootWorldPos)

  const colliderGeom = new THREE.BoxGeometry(colliderSize.x, colliderSize.y, colliderSize.z)
  const colliderMat = new THREE.MeshBasicMaterial({
    transparent: true, opacity: 0, depthWrite: false,
  })
  const colliderMesh = new THREE.Mesh(colliderGeom, colliderMat)
  colliderMesh.name = "flowerCollider"
  colliderMesh.position.copy(colliderLocalCenter)
  colliderMesh.renderOrder = 999
  colliderMesh.userData = {
    isBuildingCollider: true,
    buildingId: "red-flower",
    lookupName: "红色花蕊",
    partMeshes: flowerMeshes,
    unionBox: finalWorldBox.clone(),
  }
  flowerRoot.add(colliderMesh)
  flowerRoot.userData.campusFlowerRoot = true

  const flowerObstacle: AABB = {
    minX: finalWorldBox.min.x,
    maxX: finalWorldBox.max.x,
    minZ: finalWorldBox.min.z,
    maxZ: finalWorldBox.max.z,
  }

  return { flowerObstacle }
}
