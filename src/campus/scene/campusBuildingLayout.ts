import * as THREE from "three"
import { configureGlbMesh } from "./campusMaterials"

const WSE_MESH_NAMES = ["w楼", "s楼", "e楼"] as const
/** 餐厅 mesh 世界 X 分割线：西侧小块 = 校内驿站，东侧大块 = 食堂 */
export const CANTEEN_STATION_SPLIT_X = -74

function meshFootprintCenter(root: THREE.Object3D, mesh: THREE.Mesh): THREE.Vector3 {
  root.updateWorldMatrix(true, true)
  return new THREE.Box3().setFromObject(mesh).getCenter(new THREE.Vector3())
}

/** E 楼 X 关于 S 中心镜像 W，Z 与 W 对齐（教学中轴一字排开） */
export function alignEBuildingMirrorAboutS(root: THREE.Object3D): void {
  const w = root.getObjectByName(WSE_MESH_NAMES[0]) as THREE.Mesh | null
  const s = root.getObjectByName(WSE_MESH_NAMES[1]) as THREE.Mesh | null
  const e = root.getObjectByName(WSE_MESH_NAMES[2]) as THREE.Mesh | null
  if (!w || !s || !e) return

  const wCenter = meshFootprintCenter(root, w)
  const sCenter = meshFootprintCenter(root, s)
  const eCenter = meshFootprintCenter(root, e)

  const targetX = 2 * sCenter.x - wCenter.x
  const targetZ = wCenter.z

  e.position.x += targetX - eCenter.x
  e.position.z += targetZ - eCenter.z
}

function geometryFromTriangles(
  source: THREE.BufferGeometry,
  triVertIndices: number[],
): THREE.BufferGeometry {
  const srcPos = source.attributes.position
  const srcNorm = source.attributes.normal
  const positions: number[] = []
  const normals: number[] = []
  for (const vi of triVertIndices) {
    positions.push(srcPos.getX(vi), srcPos.getY(vi), srcPos.getZ(vi))
    if (srcNorm) normals.push(srcNorm.getX(vi), srcNorm.getY(vi), srcNorm.getZ(vi))
  }
  const geom = new THREE.BufferGeometry()
  geom.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3))
  if (normals.length > 0) {
    geom.setAttribute("normal", new THREE.Float32BufferAttribute(normals, 3))
  }
  return geom
}

function buildSplitGeometries(
  mesh: THREE.Mesh,
  splitWorldX: number,
): { station: THREE.BufferGeometry; canteen: THREE.BufferGeometry } | null {
  const geom = mesh.geometry
  const pos = geom.attributes.position
  if (!pos || pos.count < 3) return null

  mesh.updateWorldMatrix(true, true)
  const world = new THREE.Vector3()
  const stationTris: number[] = []
  const canteenTris: number[] = []

  const pushTriangle = (i0: number, i1: number, i2: number) => {
    let cx = 0
    for (const i of [i0, i1, i2]) {
      world.fromBufferAttribute(pos, i).applyMatrix4(mesh.matrixWorld)
      cx += world.x
    }
    const bucket = cx / 3 < splitWorldX ? stationTris : canteenTris
    bucket.push(i0, i1, i2)
  }

  if (geom.index) {
    const idx = geom.index
    for (let i = 0; i < idx.count; i += 3) {
      pushTriangle(idx.getX(i), idx.getX(i + 1), idx.getX(i + 2))
    }
  } else {
    for (let i = 0; i < pos.count; i += 3) {
      pushTriangle(i, i + 1, i + 2)
    }
  }

  if (stationTris.length === 0 || canteenTris.length === 0) return null
  return {
    station: geometryFromTriangles(geom, stationTris),
    canteen: geometryFromTriangles(geom, canteenTris),
  }
}

function cloneMeshPart(source: THREE.Mesh, name: string, geometry: THREE.BufferGeometry): THREE.Mesh {
  const mat = source.material
  const part = new THREE.Mesh(
    geometry,
    Array.isArray(mat) ? mat.map((m) => m.clone()) : mat.clone(),
  )
  part.name = name
  part.position.copy(source.position)
  part.rotation.copy(source.rotation)
  part.scale.copy(source.scale)
  configureGlbMesh(part, name)
  return part
}

/** 原「餐厅」L 形 mesh 拆成西侧校内驿站 + 东侧英才食堂 */
export function splitCanteenAndStation(root: THREE.Object3D): void {
  if (root.userData.campusCanteenStationSplit) return

  const source = root.getObjectByName("餐厅") as THREE.Mesh | null
  if (!source?.geometry || !source.parent) return

  const parts = buildSplitGeometries(source, CANTEEN_STATION_SPLIT_X)
  if (!parts) return

  const parent = source.parent
  parent.add(cloneMeshPart(source, "校内驿站", parts.station))
  parent.add(cloneMeshPart(source, "餐厅", parts.canteen))
  source.removeFromParent()
  source.geometry.dispose()
  root.userData.campusCanteenStationSplit = true
}
