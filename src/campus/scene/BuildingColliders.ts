/**
 * 建筑交互碰撞体（宿舍/办公室 → 透明 BoxGeometry 碰撞代理）
 */
import * as THREE from "three"


export interface BuildingColliderData {
  isBuildingCollider: true
  buildingId: string
  lookupName: string
  partMeshes: THREE.Mesh[]
  unionBox: THREE.Box3
}


export function createBuildingColliders(
  group: THREE.Group,
  scale: { x: number; y: number; z: number },
  groundY: number,
): THREE.Mesh[] {
  const colliders: THREE.Mesh[] = []

  function addColliders(pattern: RegExp, prefix: string, partsPerBuilding: number) {
    const groups = new Map<number, THREE.Mesh[]>()

    group.traverse((child) => {
      if (!(child instanceof THREE.Mesh) || child.userData.campusAggregateHidden) return
      const match = child.name.match(pattern)
      if (!match) return
      const partIndex = Number.parseInt(match[1], 10)
      const buildingId = Math.floor((partIndex - 1) / partsPerBuilding)
      const list = groups.get(buildingId) ?? []
      list.push(child)
      groups.set(buildingId, list)
    })

    for (const [buildingId, meshes] of groups.entries()) {
      const worldUnion = new THREE.Box3()
      for (const mesh of meshes) {
        mesh.updateWorldMatrix(true, false)
        worldUnion.union(new THREE.Box3().setFromObject(mesh))
      }

      if (worldUnion.min.y > groundY + 0.1) {
        worldUnion.min.y = groundY
      }

      const worldCenter = new THREE.Vector3()
      const worldSize = new THREE.Vector3()
      worldUnion.getCenter(worldCenter)
      worldUnion.getSize(worldSize)

      const invScale = new THREE.Vector3(1 / scale.x, 1 / scale.y, 1 / scale.z)
      const localCenter = worldCenter.clone().multiply(invScale)
      const localSize = new THREE.Vector3(
        worldSize.x / scale.x,
        worldSize.y / scale.y,
        worldSize.z / scale.z,
      )

      const buildingNum = buildingId + 1
      const colliderId = `${prefix}_${buildingNum}`
      const lookupName = meshes[0].name

      const geom = new THREE.BoxGeometry(localSize.x, localSize.y, localSize.z)
      const mat = new THREE.MeshBasicMaterial({
        transparent: true,
        opacity: 0,
        depthWrite: false,
      })
      const collider = new THREE.Mesh(geom, mat)
      collider.name = colliderId
      collider.position.copy(localCenter)
      collider.renderOrder = 999
      collider.userData = {
        isBuildingCollider: true,
        buildingId: colliderId,
        lookupName,
        partMeshes: meshes,
        unionBox: worldUnion.clone(),
      } satisfies BuildingColliderData

      group.add(collider)
      colliders.push(collider)
    }
  }

  addColliders(/^宿舍(\d+)$/, "dormCollider", 6)
  addColliders(/^办公室(\d+)$/, "officeCollider", 6)

  return colliders
}

/** 禁用宿舍/办公室相关 GLB mesh 的 raycast，交互完全走碰撞体 */
export function disableSplitMeshRaycasts(group: THREE.Group) {
  const dormPartPattern = /^宿舍(\d+)$/
  const officePartPattern = /^办公室(\d+)$/

  group.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) return
    if (dormPartPattern.test(child.name) || officePartPattern.test(child.name)) {
      child.raycast = () => {}
      return
    }
    if (
      child.name === "宿舍" ||
      child.name === "办公室" ||
      child.userData.campusAggregateHidden
    ) {
      child.raycast = () => {}
    }
  })
}
