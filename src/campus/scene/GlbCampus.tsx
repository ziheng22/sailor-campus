import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef } from "react"
import { useGLTF } from "@react-three/drei"
import { useThree, type ThreeEvent } from "@react-three/fiber"
import * as THREE from "three"
import campusSceneGlb from "../assets/campus-scene.glb?url"
import flowerSculptureGlb from "../assets/flower-sculpture.glb?url"
import { type BuildingData } from "../data/campusData"
import { buildingDataFromGlbMesh, resolveGlbMeshMeta } from "../data/glbBuildingMeta"
import { loadNameOverrides } from "../debug/campusNameDebugConfig"
import { type CampusCollisionData } from "./campusColliders"
import {
  classifyMesh,
  configureGlbMesh,
  createCampusMaterial,
  applyBuildingMaterial,
} from "./campusMaterials"
import { collectGlbColliders, hideRoadMeshes, resetBuildingHeightScale, scaleGlbBuildings } from "./glbBuildingScale"
import { hideAggregateClusterMeshes } from "./campusColliders"
import { alignEBuildingMirrorAboutS, splitCanteenAndStation } from "./campusBuildingLayout"
import { alignLakeMeshesToGround, getCampusGroundSurfaceY } from "./campusGround"
import { CAMPUS_GLB_SCALE } from "./campusGlbScale"
import type { AABB } from "../utils/collision"

export { CAMPUS_GLB_SCALE }

interface GlbCampusProps {
  onBuildingClick: (data: BuildingData) => void
  onCollidersReady: (data: CampusCollisionData, glbRoot: THREE.Group) => void
  targetBuildingHeight?: number | null
  onGroundSurfaceYReady?: (y: number) => void
}

function applyOriginalMaterials(root: THREE.Object3D) {
  alignEBuildingMirrorAboutS(root)
  hideRoadMeshes(root)
  hideAggregateClusterMeshes(root)

  // 第一遍：收集建筑网格的包围盒（世界空间）
  root.updateWorldMatrix(true, true)
  interface BldInfo { mesh: THREE.Mesh; name: string; bbox: THREE.Box3 }
  const buildings: BldInfo[] = []

  root.traverse((child) => {
    if (!(child instanceof THREE.Mesh) || !child.name) return
    if (child.userData.campusRoadHidden) return
    const kind = classifyMesh(child.name)
    if (kind === "ground" || kind === "lake" || kind === "bridge" ||
        kind === "sculpture" || kind === "track" || kind === "court-basketball" ||
        kind === "court-tennis" || kind === "court-volleyball" || kind === "stand") return
    child.updateWorldMatrix(true, false)
    buildings.push({
      mesh: child,
      name: child.name,
      bbox: new THREE.Box3().setFromObject(child),
    })
  })

  // 找出 XZ 重叠的建筑对，标记较低者为 noSplit
  const noSplitNames = new Set<string>()
  for (let i = 0; i < buildings.length; i++) {
    for (let j = i + 1; j < buildings.length; j++) {
      const a = buildings[i]
      const b = buildings[j]
      const ox = a.bbox.min.x < b.bbox.max.x && a.bbox.max.x > b.bbox.min.x
      const oz = a.bbox.min.z < b.bbox.max.z && a.bbox.max.z > b.bbox.min.z
      if (!ox || !oz) continue
      // 重叠：较低的屋顶不拆分
      if (a.bbox.max.y < b.bbox.max.y) {
        noSplitNames.add(a.name)
      } else if (b.bbox.max.y < a.bbox.max.y) {
        noSplitNames.add(b.name)
      }
    }
  }

  // 第二遍：配置材质，重叠较低者不拆分屋顶
  root.traverse((child) => {
    if (!(child instanceof THREE.Mesh) || !child.name) return
    if (child.userData.campusRoadHidden) return
    configureGlbMesh(child, child.name, noSplitNames.has(child.name))
  })
}

// ---- 建筑交互碰撞体 ----

interface BuildingColliderData {
  isBuildingCollider: true
  buildingId: string
  lookupName: string
  partMeshes: THREE.Mesh[]
  unionBox: THREE.Box3
}

function createBuildingColliders(
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
function disableSplitMeshRaycasts(group: THREE.Group) {
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

// ---- flower sculpture replacement ----

interface FlowerReplaceResult {
  flowerObstacle: AABB
}

function findOldFlower(root: THREE.Object3D): THREE.Mesh | null {
  let result: THREE.Mesh | null = null
  root.traverse((child) => {
    if (child instanceof THREE.Mesh && child.name.includes("红色花蕊")) result = child
  })
  return result
}

function replaceFlowerSculpture(
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

  // 获取世界空间数据
  const oldWorldBox = new THREE.Box3().setFromObject(oldFlower)
  const oldHeightWorld = oldWorldBox.max.y - oldWorldBox.min.y

  const oldWorldPos = new THREE.Vector3()
  oldFlower.getWorldPosition(oldWorldPos)

  const oldWorldQuat = new THREE.Quaternion()
  oldFlower.getWorldQuaternion(oldWorldQuat)

  console.log("[flower] old world height:", oldHeightWorld)

  // 从场景树中彻底移除原模型（比 visible=false 更可靠，HMR 不会恢复）
  oldFlower.removeFromParent()

  // 创建干净的根 Group，scale = (1,1,1)，直接挂载到 scene
  const flowerRoot = new THREE.Group()
  flowerRoot.name = "flowerSculptureRoot"
  flowerRoot.scale.set(1, 1, 1)
  flowerRoot.position.set(oldWorldPos.x, groundY, oldWorldPos.z)
  flowerRoot.rotation.setFromQuaternion(oldWorldQuat)

  // 克隆新模型并测量本地高度
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
  console.log("[flower] new local height:", newHeightLocal)

  // 等比缩放
  const uniformScale = oldHeightWorld / newHeightLocal
  const safeScale = Math.min(Math.max(uniformScale, 0.01), 20)
  console.log("[flower] scale:", safeScale)

  flowerClone.scale.setScalar(safeScale)

  // 贴地：添加到 root 后计算包围盒，底部对齐 root 原点
  flowerRoot.add(flowerClone)
  flowerRoot.updateWorldMatrix(true, false)

  const placedBox = new THREE.Box3().setFromObject(flowerClone)
  flowerClone.position.y -= placedBox.min.y

  // 添加到 scene
  r3fScene.add(flowerRoot)
  r3fScene.updateMatrixWorld(true)

  // 收集花蕊 mesh 引用 + 计算世界包围盒
  const flowerMeshes: THREE.Mesh[] = []
  const finalWorldBox = new THREE.Box3()
  flowerClone.traverse((child) => {
    if (child instanceof THREE.Mesh && child.userData.campusFlowerMesh) {
      flowerMeshes.push(child)
      finalWorldBox.union(new THREE.Box3().setFromObject(child))
    }
  })

  // 创建透明碰撞盒作为 flowerRoot 子节点
  const colliderSize = new THREE.Vector3()
  finalWorldBox.getSize(colliderSize)
  const colliderCenter = new THREE.Vector3()
  finalWorldBox.getCenter(colliderCenter)

  // 碰撞盒在 root 本地空间的 position（root 在 scene 层级，scale=1）
  const rootWorldPos = new THREE.Vector3()
  flowerRoot.getWorldPosition(rootWorldPos)
  const colliderLocalCenter = colliderCenter.clone().sub(rootWorldPos)

  const colliderGeom = new THREE.BoxGeometry(colliderSize.x, colliderSize.y, colliderSize.z)
  const colliderMat = new THREE.MeshBasicMaterial({
    transparent: true,
    opacity: 0,
    depthWrite: false,
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

  // 存储 root 引用以便清理
  flowerRoot.userData.campusFlowerRoot = true

  const flowerObstacle: AABB = {
    minX: finalWorldBox.min.x,
    maxX: finalWorldBox.max.x,
    minZ: finalWorldBox.min.z,
    maxZ: finalWorldBox.max.z,
  }

  console.log("[flower] replacement complete, obstacle:", flowerObstacle)
  return { flowerObstacle }
}

// ---- 主组件 ----

export const GlbCampus = forwardRef<THREE.Group, GlbCampusProps>(function GlbCampus(
  { onBuildingClick, onCollidersReady, targetBuildingHeight, onGroundSurfaceYReady },
  ref,
) {
  const { scene: campusSceneGlbData } = useGLTF(campusSceneGlb)
  const { scene: flowerScene } = useGLTF(flowerSculptureGlb)
  const { scene: r3fScene, camera, gl } = useThree()
  const groupRef = useRef<THREE.Group>(null)
  const hoveredRef = useRef<string | null>(null)
  const heightScaledRef = useRef(false)
  const collidersCreatedRef = useRef(false)
  const flowerReplacedRef = useRef(false)

  useImperativeHandle(ref, () => groupRef.current as THREE.Group)

  const campusScene = useMemo(() => {
    const cloned = campusSceneGlbData.clone(true)
    applyOriginalMaterials(cloned)
    return cloned
  }, [campusSceneGlbData])

  useEffect(() => {
    heightScaledRef.current = false
    resetBuildingHeightScale(groupRef.current ?? campusScene)
  }, [campusScene])

  const scale = useMemo(() => {
    let ground: THREE.Object3D | null = null
    campusSceneGlbData.traverse((o) => {
      if (o.name === "地面" || o.name === "Plane") ground = o
    })
    if (ground) {
      const box = new THREE.Box3().setFromObject(ground)
      const size = new THREE.Vector3()
      box.getSize(size)
      if (size.x > 0 && size.z > 0) {
        return { x: 220 / size.x, y: 220 / size.x, z: 200 / size.z }
      }
    }
    return { x: CAMPUS_GLB_SCALE.x, y: CAMPUS_GLB_SCALE.y, z: CAMPUS_GLB_SCALE.z }
  }, [campusSceneGlbData])

  useEffect(() => {
    const group = groupRef.current
    if (!group) return

    if (targetBuildingHeight != null && targetBuildingHeight > 0 && !heightScaledRef.current) {
      scaleGlbBuildings(group, targetBuildingHeight)
      heightScaledRef.current = true
    }

    group.updateWorldMatrix(true, false)
    const groundY = getCampusGroundSurfaceY(group)
    alignLakeMeshesToGround(group, groundY)

    splitCanteenAndStation(group)

    // 替换红色花蕊（仅一次），挂载到 scene 层级避免继承非等比 scale
    let flowerObstacle: AABB | null = null

    if (!flowerReplacedRef.current && flowerScene) {
      const result = replaceFlowerSculpture(group, flowerScene, r3fScene, groundY)
      if (result) {
        flowerReplacedRef.current = true
        flowerObstacle = result.flowerObstacle
        // 从 GLB 源数据中彻底移除旧花蕊，从此所有克隆（包括 HMR 重克隆）都不会有它
        const srcOld = findOldFlower(campusSceneGlbData)
        if (srcOld) srcOld.removeFromParent()
      }
    }

    const colliderData = collectGlbColliders(group, groundY)
    if (flowerObstacle) {
      colliderData.obstacles.push(flowerObstacle)
    }

    onCollidersReady(colliderData, group)
    onGroundSurfaceYReady?.(groundY)

    // 创建宿舍/办公室交互碰撞体（仅一次）
    if (!collidersCreatedRef.current) {
      collidersCreatedRef.current = true
      disableSplitMeshRaycasts(group)
      createBuildingColliders(group, scale, groundY)
    }

    // 注意：flower 的清理放在独立的 unmount-only effect 中，避免 deps 变化时误删
  }, [campusScene, onCollidersReady, targetBuildingHeight, scale, flowerScene, r3fScene, onGroundSurfaceYReady])

  // 组件卸载时移除 flowerRoot (独立 effect，空 deps 确保仅在真正卸载时执行)
  useEffect(() => {
    return () => {
      if (flowerReplacedRef.current) {
        const root = r3fScene.getObjectByName("flowerSculptureRoot")
        if (root) r3fScene.remove(root)
      }
    }
  }, [])

  // 花蕊在 r3fScene 而不在 groupRef 内，需要 Canvas 级点击监听补漏
  useEffect(() => {
    const canvas = gl.domElement
    const raycaster = new THREE.Raycaster()
    let pointerDown = { x: 0, y: 0 }
    let pointerId = -1

    const onDown = (e: PointerEvent) => {
      pointerDown = { x: e.clientX, y: e.clientY }
      pointerId = e.pointerId
    }

    const onUp = (e: PointerEvent) => {
      if (e.pointerId !== pointerId) return
      const dx = e.clientX - pointerDown.x
      const dy = e.clientY - pointerDown.y
      if (Math.hypot(dx, dy) > 4) return // 拖拽不触发

      const rect = canvas.getBoundingClientRect()
      const mouse = new THREE.Vector2(
        ((e.clientX - rect.left) / rect.width) * 2 - 1,
        -((e.clientY - rect.top) / rect.height) * 2 + 1,
      )
      raycaster.setFromCamera(mouse, camera)
      const root = r3fScene.getObjectByName("flowerSculptureRoot")
      if (!root) return
      const hits = raycaster.intersectObjects(root.children, true)
      if (hits.length === 0) return

      const hit = hits[0].object
      let f: THREE.Object3D | null = hit
      while (f) {
        if (f.userData?.campusFlowerMesh || f.userData?.isBuildingCollider) break
        f = f.parent
      }
      if (!f) return

      // 查找碰撞体数据
      let colliderData: BuildingColliderData | null = null
      if (f.userData?.isBuildingCollider) {
        colliderData = f.userData as BuildingColliderData
      } else {
        let r: THREE.Object3D | null = f
        while (r && !r.userData?.campusFlowerRoot) r = r.parent
        if (r) {
          r.traverse((c) => {
            if (c.userData?.isBuildingCollider) colliderData = c.userData as BuildingColliderData
          })
        }
      }
      if (!colliderData) return

      const center = new THREE.Vector3()
      const size = new THREE.Vector3()
      colliderData.unionBox.getCenter(center)
      colliderData.unionBox.getSize(size)
      onBuildingClick(buildingDataFromGlbMesh(colliderData.lookupName, center, size, loadNameOverrides()))
    }

    canvas.addEventListener("pointerdown", onDown)
    canvas.addEventListener("pointerup", onUp)
    return () => {
      canvas.removeEventListener("pointerdown", onDown)
      canvas.removeEventListener("pointerup", onUp)
    }
  }, [gl, camera, r3fScene, onBuildingClick])

  // ---- 交互处理 ----

  const resolveHitTarget = (hit: THREE.Object3D): {
    kind: "collider" | "glbMesh" | "none"
    colliderData?: BuildingColliderData
    mesh?: THREE.Mesh
  } => {
    // 花蕊模型：向上查找 flowerRoot → 取其碰撞体数据，使点击可弹窗
    {
      let f: THREE.Object3D | null = hit
      while (f) {
        if (f.userData?.campusFlowerMesh) {
          let root: THREE.Object3D | null = f
          while (root && !root.userData?.campusFlowerRoot) root = root.parent
          if (root) {
            let collider = null as THREE.Object3D | null
            root.traverse((child: THREE.Object3D) => {
              if (child.userData?.isBuildingCollider) collider = child
            })
            if (collider) {
              return { kind: "collider", colliderData: (collider as THREE.Object3D).userData as BuildingColliderData }
            }
          }
          return { kind: "none" }
        }
        f = f.parent
      }
    }
    if (hit.userData?.isBuildingCollider) {
      return { kind: "collider", colliderData: hit.userData as BuildingColliderData }
    }
    let p: THREE.Object3D | null = hit.parent
    while (p) {
      if (p.userData?.isBuildingCollider) {
        return { kind: "collider", colliderData: p.userData as BuildingColliderData }
      }
      p = p.parent
    }
    if (hit instanceof THREE.Mesh && resolveGlbMeshMeta(hit.name)) {
      return { kind: "glbMesh", mesh: hit }
    }
    let p2: THREE.Object3D | null = hit.parent
    while (p2) {
      if (p2 instanceof THREE.Mesh && resolveGlbMeshMeta(p2.name)) {
        return { kind: "glbMesh", mesh: p2 }
      }
      p2 = p2.parent
    }
    return { kind: "none" }
  }

  const highlightMeshes = (meshes: THREE.Mesh[], hovered: boolean) => {
    for (const mesh of meshes) {
      if (!mesh.name) continue
      const kind = classifyMesh(mesh.name)
      const buildingPart = mesh.userData.buildingPart
      applyBuildingMaterial(mesh, kind, hovered ? { hovered: true, buildingPart } : { buildingPart })
    }
  }

  const handlePointerOver = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation()
    const hit = e.object as THREE.Object3D
    if (!hit.visible) return
    if (hit.name === "地面") return

    const result = resolveHitTarget(hit)
    if (result.kind === "collider" && result.colliderData) {
      const d = result.colliderData
      hoveredRef.current = d.buildingId
      highlightMeshes(d.partMeshes, true)
      document.body.style.cursor = "pointer"
      return
    }
    if (result.kind === "glbMesh" && result.mesh) {
      const mesh = result.mesh
      hoveredRef.current = mesh.name
      const kind = classifyMesh(mesh.name)
      const buildingPart = mesh.userData.buildingPart
      applyBuildingMaterial(mesh, kind, { hovered: true, buildingPart })
      document.body.style.cursor = "pointer"
    }
  }

  const handlePointerOut = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation()
    const hit = e.object as THREE.Object3D

    const result = resolveHitTarget(hit)
    if (result.kind === "collider" && result.colliderData) {
      const d = result.colliderData
      if (hoveredRef.current !== d.buildingId) return
      hoveredRef.current = null
      highlightMeshes(d.partMeshes, false)
      document.body.style.cursor = "default"
      return
    }
    if (result.kind === "glbMesh" && result.mesh) {
      const mesh = result.mesh
      if (hoveredRef.current !== mesh.name) return
      hoveredRef.current = null
      const kind = classifyMesh(mesh.name)
      const buildingPart = mesh.userData.buildingPart
      applyBuildingMaterial(mesh, kind, { buildingPart })
      document.body.style.cursor = "default"
      return
    }
    if (hoveredRef.current) {
      const group = groupRef.current
      if (group) {
        group.traverse((child) => {
          if (child.userData?.isBuildingCollider && child.userData.buildingId === hoveredRef.current) {
            highlightMeshes(child.userData.partMeshes, false)
          }
        })
        group.traverse((child) => {
          if (child instanceof THREE.Mesh && child.name === hoveredRef.current) {
            const kind = classifyMesh(child.name)
            const buildingPart = child.userData.buildingPart
            applyBuildingMaterial(child, kind, { buildingPart })
          }
        })
      }
      hoveredRef.current = null
      document.body.style.cursor = "default"
    }
  }

  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation()
    const hit = e.object as THREE.Object3D
    if (!hit.visible) return
    if (hit.name === "地面") return

    const result = resolveHitTarget(hit)

    if (result.kind === "collider" && result.colliderData) {
      const d = result.colliderData
      const center = new THREE.Vector3()
      const size = new THREE.Vector3()
      d.unionBox.getCenter(center)
      d.unionBox.getSize(size)
      onBuildingClick(buildingDataFromGlbMesh(d.lookupName, center, size, loadNameOverrides()))
      return
    }

    if (result.kind === "glbMesh" && result.mesh) {
      const mesh = result.mesh
      const box = new THREE.Box3().setFromObject(mesh)
      const center = new THREE.Vector3()
      const size = new THREE.Vector3()
      box.getCenter(center)
      box.getSize(size)
      onBuildingClick(buildingDataFromGlbMesh(mesh.name, center, size, loadNameOverrides()))
    }
  }

  return (
    <group
      ref={groupRef}
      name="campus-glb-root"
      userData={{ isCampusGlb: true }}
      scale={[scale.x, scale.y, scale.z]}
      onClick={handleClick}
      onPointerOver={handlePointerOver}
      onPointerOut={handlePointerOut}
    >
      <primitive object={campusScene} />
    </group>
  )
})

useGLTF.preload(campusSceneGlb)
useGLTF.preload(flowerSculptureGlb)
