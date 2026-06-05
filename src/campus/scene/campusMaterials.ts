import * as THREE from "three"
import basketballTextureUrl from "../assets/basketball-court.jpg?url"
import tennisTextureUrl from "../assets/tennis-court.jpg?url"
import volleyballTextureUrl from "../assets/volleyball-court.jpg?url"
import trackTextureUrl from "../assets/track-field-new.jpg?url"

const textureLoader = new THREE.TextureLoader()

// ---- texture aspect ratio tracking ----

const texMeta: Record<string, { aspect: number; ready: boolean }> = {
  basketball: { aspect: 1.6, ready: false },
  tennis: { aspect: 1.3, ready: false },
  volleyball: { aspect: 1.3, ready: false },
  track: { aspect: 2.0, ready: false },
}

function loadFieldTexture(url: string, key: string): THREE.Texture {
  const tex = textureLoader.load(url, (loaded) => {
    const src = loaded.source?.data
    if (src && typeof src === "object" && "width" in src && "height" in src) {
      const img = src as { width: number; height: number }
      if (img.width > 0 && img.height > 0) {
        texMeta[key].aspect = img.width / img.height
        texMeta[key].ready = true
      }
    }
  })
  tex.wrapS = THREE.ClampToEdgeWrapping
  tex.wrapT = THREE.ClampToEdgeWrapping
  tex.colorSpace = THREE.SRGBColorSpace
  tex.generateMipmaps = true
  tex.anisotropy = 16
  return tex
}

const basketballTex = loadFieldTexture(basketballTextureUrl, "basketball")
const tennisTex = loadFieldTexture(tennisTextureUrl, "tennis")
const volleyballTex = loadFieldTexture(volleyballTextureUrl, "volleyball")
const trackTex = loadFieldTexture(trackTextureUrl, "track")
trackTex.center = new THREE.Vector2(0.5, 0.5)
trackTex.rotation = 0

// ---- court UV remapping (basketball) ----

const _pendingRemaps: { mesh: THREE.Mesh; texKey: string }[] = []

function remapCourtUVs(mesh: THREE.Mesh, texKey: string) {
  const meta = texMeta[texKey]
  const aspect = meta?.aspect ?? 1.6
  const geom = mesh.geometry
  if (!geom.attributes.position) return

  geom.computeBoundingBox()
  const bbox = geom.boundingBox!
  const minX = bbox.min.x
  const maxX = bbox.max.x
  const minZ = bbox.min.z
  const maxZ = bbox.max.z
  const sizeX = maxX - minX
  const sizeZ = maxZ - minZ
  if (sizeX < 0.001 || sizeZ < 0.001) return

  const courtAspect = sizeX / sizeZ

  const longAxisIsZ = sizeZ > sizeX
  const effectiveCourtAspect = longAxisIsZ ? sizeZ / sizeX : courtAspect

  let uScale: number, vScale: number
  if (effectiveCourtAspect >= aspect) {
    uScale = effectiveCourtAspect / aspect
    vScale = 1
  } else {
    uScale = 1
    vScale = aspect / effectiveCourtAspect
  }

  const pos = geom.attributes.position
  const uvArray = new Float32Array(pos.count * 2)

  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i)
    const z = pos.getZ(i)

    let u = (x - minX) / sizeX
    let v = (z - minZ) / sizeZ

    if (longAxisIsZ) {
      [u, v] = [v, u]
    }

    u *= uScale
    v *= vScale

    uvArray[i * 2] = u
    uvArray[i * 2 + 1] = 1 - v
  }

  geom.setAttribute("uv", new THREE.BufferAttribute(uvArray, 2))
  geom.attributes.uv.needsUpdate = true
  geom.computeBoundingBox()
  geom.computeVertexNormals()
}

function scheduleCourtUVRemap(mesh: THREE.Mesh, texKey: string) {
  remapCourtUVs(mesh, texKey)
  if (!texMeta[texKey]?.ready) {
    _pendingRemaps.push({ mesh, texKey })
  }
}

// ---- track UV remapping ----

const _pendingTrackRemaps: THREE.Mesh[] = []

function remapTrackUVs(mesh: THREE.Mesh) {
  const meta = texMeta["track"]
  const aspect = meta?.aspect ?? 2.0
  const geom = mesh.geometry
  if (!geom.attributes.position) return

  geom.computeBoundingBox()
  const bbox = geom.boundingBox!
  const minX = bbox.min.x
  const maxX = bbox.max.x
  const minZ = bbox.min.z
  const maxZ = bbox.max.z
  const sizeX = maxX - minX
  const sizeZ = maxZ - minZ
  if (sizeX < 0.001 || sizeZ < 0.001) return

  const meshAspect = sizeX / sizeZ

  let uScale: number, vScale: number
  if (meshAspect >= aspect) {
    uScale = meshAspect / aspect
    vScale = 1
  } else {
    uScale = 1
    vScale = aspect / meshAspect
  }

  const pos = geom.attributes.position
  const uvArray = new Float32Array(pos.count * 2)

  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i)
    const z = pos.getZ(i)

    const u = ((x - minX) / sizeX - 0.5) * uScale + 0.5
    const v = ((z - minZ) / sizeZ - 0.5) * vScale + 0.5

    uvArray[i * 2] = u
    uvArray[i * 2 + 1] = 1 - v
  }

  geom.setAttribute("uv", new THREE.BufferAttribute(uvArray, 2))
  geom.attributes.uv.needsUpdate = true
  geom.computeBoundingBox()
  geom.computeVertexNormals()
}

function scheduleTrackUVRemap(mesh: THREE.Mesh) {
  remapTrackUVs(mesh)
  if (!texMeta["track"]?.ready) {
    _pendingTrackRemaps.push(mesh)
  }
}

// ---- flush pending remaps ----

function flushPendingRemaps() {
  for (let i = _pendingRemaps.length - 1; i >= 0; i--) {
    const { mesh, texKey } = _pendingRemaps[i]
    if (texMeta[texKey]?.ready) {
      remapCourtUVs(mesh, texKey)
      _pendingRemaps.splice(i, 1)
    }
  }
  for (let i = _pendingTrackRemaps.length - 1; i >= 0; i--) {
    const mesh = _pendingTrackRemaps[i]
    if (texMeta["track"]?.ready) {
      remapTrackUVs(mesh)
      _pendingTrackRemaps.splice(i, 1)
    }
  }
}

if (typeof window !== "undefined") {
  window.setTimeout(() => {
    flushPendingRemaps()
    if (_pendingRemaps.length > 0 || _pendingTrackRemaps.length > 0) {
      window.setTimeout(flushPendingRemaps, 500)
    }
  }, 200)
}

// ---- procedural building textures ----

function createWallTexture(): THREE.CanvasTexture {
  const size = 512
  const canvas = document.createElement("canvas")
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext("2d")!

  // 底色：米白色
  ctx.fillStyle = "#f7f1e4"
  ctx.fillRect(0, 0, size, size)

  // 细微噪点模拟墙面质感
  const imageData = ctx.getImageData(0, 0, size, size)
  for (let i = 0; i < imageData.data.length; i += 4) {
    const noise = (Math.random() - 0.5) * 12
    imageData.data[i] += noise
    imageData.data[i + 1] += noise
    imageData.data[i + 2] += noise
  }
  ctx.putImageData(imageData, 0, 0)

  // 横向砖缝
  ctx.strokeStyle = "rgba(0,0,0,0.03)"
  ctx.lineWidth = 1
  const brickH = size / 16
  for (let row = 0; row < 16; row++) {
    const y = row * brickH
    ctx.beginPath()
    ctx.moveTo(0, y)
    ctx.lineTo(size, y)
    ctx.stroke()
    // 竖缝（错缝）
    const offset = row % 2 === 0 ? 0 : brickH * 2.5
    for (let col = 0; col < 16; col++) {
      const x = col * brickH * 2.5 + offset
      ctx.beginPath()
      ctx.moveTo(x, y)
      ctx.lineTo(x, y + brickH)
      ctx.stroke()
    }
  }

  const tex = new THREE.CanvasTexture(canvas)
  tex.wrapS = THREE.RepeatWrapping
  tex.wrapT = THREE.RepeatWrapping
  tex.colorSpace = THREE.SRGBColorSpace
  tex.generateMipmaps = true
  tex.anisotropy = 8
  return tex
}

function createRoofTexture(): THREE.CanvasTexture {
  const size = 512
  const canvas = document.createElement("canvas")
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext("2d")!

  // 底色：红褐色
  ctx.fillStyle = "#b84632"
  ctx.fillRect(0, 0, size, size)

  // 瓦片纹理
  const tileRows = 8
  const tileH = size / tileRows
  const tileW = size / 6

  for (let row = 0; row < tileRows; row++) {
    const y = row * tileH
    const offset = row % 2 === 0 ? 0 : tileW / 2

    for (let col = -1; col < 7; col++) {
      const x = col * tileW + offset
      const shade = 0.85 + Math.random() * 0.15
      const r = Math.floor(0xb8 * shade)
      const g = Math.floor(0x46 * shade)
      const b = Math.floor(0x32 * shade)

      ctx.fillStyle = `rgb(${r},${g},${b})`
      ctx.fillRect(x + 1, y + 1, tileW - 2, tileH - 2)

      // 瓦片高光边
      ctx.strokeStyle = `rgba(255,200,180,0.15)`
      ctx.lineWidth = 1
      ctx.strokeRect(x + 1, y + 1, tileW - 2, tileH - 2)
    }

    // 行间阴影
    ctx.strokeStyle = "rgba(0,0,0,0.2)"
    ctx.lineWidth = 1.5
    ctx.beginPath()
    ctx.moveTo(0, y)
    ctx.lineTo(size, y)
    ctx.stroke()
  }

  const tex = new THREE.CanvasTexture(canvas)
  tex.wrapS = THREE.RepeatWrapping
  tex.wrapT = THREE.RepeatWrapping
  tex.colorSpace = THREE.SRGBColorSpace
  tex.generateMipmaps = true
  tex.anisotropy = 8
  return tex
}

function createWindowTexture(): THREE.CanvasTexture {
  const size = 256
  const canvas = document.createElement("canvas")
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext("2d")!

  // 底色：深蓝玻璃
  ctx.fillStyle = "#4a7fa8"
  ctx.fillRect(0, 0, size, size)

  // 玻璃渐变
  const grad = ctx.createLinearGradient(0, 0, size, size)
  grad.addColorStop(0, "rgba(130,190,230,0.5)")
  grad.addColorStop(0.5, "rgba(60,120,170,0.3)")
  grad.addColorStop(1, "rgba(40,80,130,0.4)")
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, size, size)

  // 窗框：白色十字
  ctx.strokeStyle = "#e8e0d5"
  ctx.lineWidth = size / 20
  ctx.strokeRect(2, 2, size - 4, size - 4)

  ctx.beginPath()
  ctx.moveTo(size / 2, 0)
  ctx.lineTo(size / 2, size)
  ctx.stroke()
  ctx.beginPath()
  ctx.moveTo(0, size / 2)
  ctx.lineTo(size, size / 2)
  ctx.stroke()

  const tex = new THREE.CanvasTexture(canvas)
  tex.wrapS = THREE.RepeatWrapping
  tex.wrapT = THREE.RepeatWrapping
  tex.colorSpace = THREE.SRGBColorSpace
  tex.generateMipmaps = true
  tex.anisotropy = 8
  return tex
}

// Lazy-init textures
let _wallTex: THREE.CanvasTexture | null = null
let _wallWinTex: THREE.CanvasTexture | null = null
let _roofTex: THREE.CanvasTexture | null = null
let _windowTex: THREE.CanvasTexture | null = null

function getWallTexture(): THREE.CanvasTexture {
  if (!_wallTex) _wallTex = createWallTexture()
  return _wallTex
}
function getWallWithWindowsTexture(): THREE.CanvasTexture {
  if (!_wallWinTex) _wallWinTex = createWallWithWindowsTexture()
  return _wallWinTex
}
function getRoofTexture(): THREE.CanvasTexture {
  if (!_roofTex) _roofTex = createRoofTexture()
  return _roofTex
}
function getWindowTexture(): THREE.CanvasTexture {
  if (!_windowTex) _windowTex = createWindowTexture()
  return _windowTex
}

// ---- combined wall + window texture ----

function createWallWithWindowsTexture(): THREE.CanvasTexture {
  const size = 512
  const canvas = document.createElement("canvas")
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext("2d")!

  ctx.fillStyle = "#f7f1e4"
  ctx.fillRect(0, 0, size, size)

  const imageData = ctx.getImageData(0, 0, size, size)
  for (let i = 0; i < imageData.data.length; i += 4) {
    const noise = (Math.random() - 0.5) * 12
    imageData.data[i] += noise
    imageData.data[i + 1] += noise
    imageData.data[i + 2] += noise
  }
  ctx.putImageData(imageData, 0, 0)

  ctx.strokeStyle = "rgba(0,0,0,0.03)"
  ctx.lineWidth = 1
  const brickH = size / 20
  for (let row = 0; row < 20; row++) {
    const y = row * brickH
    ctx.beginPath()
    ctx.moveTo(0, y)
    ctx.lineTo(size, y)
    ctx.stroke()
    const offset = row % 2 === 0 ? 0 : brickH * 2.5
    for (let col = 0; col < 20; col++) {
      const x = col * brickH * 2.5 + offset
      ctx.beginPath()
      ctx.moveTo(x, y)
      ctx.lineTo(x, y + brickH)
      ctx.stroke()
    }
  }

  const bandCount = 5
  const bandH = size / (bandCount * 3.5)
  for (let i = 0; i < bandCount; i++) {
    const bandY = (i + 0.5) * (size / bandCount) - bandH / 2
    ctx.fillStyle = "rgba(70, 130, 175, 0.45)"
    ctx.fillRect(0, bandY, size, bandH)
    const g = ctx.createLinearGradient(0, bandY, 0, bandY + bandH)
    g.addColorStop(0, "rgba(160, 210, 240, 0.3)")
    g.addColorStop(0.5, "rgba(50, 100, 150, 0.15)")
    g.addColorStop(1, "rgba(30, 60, 100, 0.25)")
    ctx.fillStyle = g
    ctx.fillRect(0, bandY, size, bandH)
    ctx.strokeStyle = "rgba(220, 215, 205, 0.55)"
    ctx.lineWidth = 1.5
    const cols = 10
    for (let j = 0; j <= cols; j++) {
      const fx = (j / cols) * size
      ctx.beginPath()
      ctx.moveTo(fx, bandY)
      ctx.lineTo(fx, bandY + bandH)
      ctx.stroke()
    }
    ctx.beginPath()
    ctx.moveTo(0, bandY)
    ctx.lineTo(size, bandY)
    ctx.stroke()
    ctx.beginPath()
    ctx.moveTo(0, bandY + bandH)
    ctx.lineTo(size, bandY + bandH)
    ctx.stroke()
  }

  const tex = new THREE.CanvasTexture(canvas)
  tex.wrapS = THREE.RepeatWrapping
  tex.wrapT = THREE.RepeatWrapping
  tex.colorSpace = THREE.SRGBColorSpace
  tex.generateMipmaps = true
  tex.anisotropy = 8
  return tex
}

// ---- split building geometry by face centroid height into roof + wall groups ----

function splitBuildingGeometry(geometry: THREE.BufferGeometry): boolean {
  const positions = geometry.attributes.position
  if (!positions) return false

  // 计算几何体 Y 范围
  let minY = Infinity
  let maxY = -Infinity
  for (let i = 0; i < positions.count; i++) {
    const y = positions.getY(i)
    if (y < minY) minY = y
    if (y > maxY) maxY = y
  }
  const height = maxY - minY
  if (height < 0.01) return false

  // 顶部 15% 高度 → 屋顶
  const roofThresholdY = maxY - height * 0.15

  const indexAttr = geometry.index
  const faceCount = indexAttr ? indexAttr.count / 3 : positions.count / 3

  const roofIndices: number[] = []
  const wallIndices: number[] = []

  const p0 = new THREE.Vector3()
  const p1 = new THREE.Vector3()
  const p2 = new THREE.Vector3()

  const getVertexIndex = (faceIdx: number, corner: number): number => {
    if (indexAttr) {
      const arr = indexAttr.array as Uint16Array | Uint32Array
      return arr[faceIdx * 3 + corner]
    }
    return faceIdx * 3 + corner
  }

  for (let i = 0; i < faceCount; i++) {
    const i0 = getVertexIndex(i, 0)
    const i1 = getVertexIndex(i, 1)
    const i2 = getVertexIndex(i, 2)

    p0.fromBufferAttribute(positions, i0)
    p1.fromBufferAttribute(positions, i1)
    p2.fromBufferAttribute(positions, i2)

    // 三角形质心 Y
    const centroidY = (p0.y + p1.y + p2.y) / 3

    if (centroidY >= roofThresholdY) {
      roofIndices.push(i0, i1, i2)
    } else {
      wallIndices.push(i0, i1, i2)
    }
  }

  if (roofIndices.length === 0 || wallIndices.length === 0) return false

  const totalIndices = roofIndices.length + wallIndices.length
  if (roofIndices.length / totalIndices < 0.02) return false

  const need32 = (indexAttr?.array instanceof Uint32Array) || totalIndices > 65535
  const newIndexArray: Uint16Array | Uint32Array = need32
    ? new Uint32Array(totalIndices)
    : new Uint16Array(totalIndices)

  newIndexArray.set(roofIndices, 0)
  newIndexArray.set(wallIndices, roofIndices.length)

  geometry.setIndex(new THREE.BufferAttribute(newIndexArray, 1))
  geometry.clearGroups()
  geometry.addGroup(0, roofIndices.length, 0)
  geometry.addGroup(roofIndices.length, wallIndices.length, 1)

  return true
}

// ---- building part detection from original GLB material color ----

type BuildingPart = "wall" | "roof" | "window" | "other"

function detectBuildingPart(mesh: THREE.Mesh): BuildingPart {
  const mat = mesh.material
  if (!mat || Array.isArray(mat)) return "other"

  const stdMat = mat as THREE.MeshStandardMaterial
  const color = stdMat.color

  if (!color) return "other"

  const r = color.r
  const g = color.g
  const b = color.b

  // 红色系 → 屋顶 (r dominates, r > 0.5, g < r * 0.7, b < r * 0.5)
  if (r > 0.55 && g < r * 0.75 && b < r * 0.6) return "roof"

  // 蓝色系 → 窗户 (b dominates)
  if (b > 0.5 && b > r * 1.2 && b > g * 1.1) return "window"

  // 白色/米色 → 墙面 (all high, r and g dominant, b not too low)
  if (r > 0.7 && g > 0.6 && b > 0.4 && r > b * 1.1) return "wall"

  return "other"
}

// ---- colors & classification ----

export const CAMPUS_COLORS = {
  orangeRoof: "#c74c3c",
  darkGreyRoof: "#5a5a5a",
  darkBrownRoof: "#6b4c3b",
  whiteWall: "#f5f0e8",
  creamWall: "#faf3e6",
  greyWall: "#d5d0c8",
  red: "#c0392b",
  window: "#b8d4e8",
  floorLine: "#e8d5c4",
  entry: "#ffcc00",
  grass: "#7a9a4b",
  lake: "#7bb8d0",
  lakeBed: "#c8c0b0",
  roadExternal: "#6b6b6b",
  roadMain: "#7d7b78",
  roadBranch: "#8a8884",
  plaza: "#d5d0c8",
  trackRed: "#c1443c",
  trackGreen: "#7cb342",
  basketball: "#e8a87c",
  stand: "#c8c4bc",
  bridge: "#d5d0c8",
  sculptureRed: "#c0392b",
  sculptureGold: "#ffd700",
  auditoriumWall: "#c4956a",
  gymWall: "#e8e8e8",
} as const

export type CampusMaterialKind =
  | "building-teaching"
  | "building-dorm"
  | "building-auditorium"
  | "building-gym"
  | "building-office"
  | "building-library"
  | "building-hospital"
  | "building-corridor"
  | "ground"
  | "lake"
  | "bridge"
  | "sculpture"
  | "track"
  | "court-basketball"
  | "court-tennis"
  | "court-volleyball"
  | "stand"
  | "default-building"

export function classifyMesh(name: string): CampusMaterialKind {
  const n = name.toLowerCase()

  if (name === "地面" || n === "plane") return "ground"
  if (name.startsWith("湖")) return "lake"
  if (name === "桥") return "bridge"
  if (name.includes("红色花蕊")) return "sculpture"
  if (name === "看台") return "stand"
  if (name === "操场") return "track"
  if (name === "球场") return "court-basketball"
  if (name === "网球场") return "court-tennis"
  if (name === "排球场") return "court-volleyball"

  if (name === "大礼堂") return "building-auditorium"
  if (name === "体育馆") return "building-gym"
  if (name === "连廊") return "building-corridor"
  if (name === "宿舍" || /^宿舍\d+$/.test(name) || /^18号(寝室楼|宿舍楼)$/.test(name)) return "building-dorm"
  if (/^办公室\d+$/.test(name)) return "building-office"
  if (
    name === "办公楼" || name === "办公室" || name === "行政楼" ||
    name === "创业园" || name === "广播站" || name === "邮政"
  ) return "building-office"
  if (name === "图书馆") return "building-library"
  if (name === "校医院") return "building-hospital"

  if (
    /[wsae]楼/.test(name) || name === "报告厅" ||
    name === "餐厅" || name === "校内驿站" || name === "商业街" || name === "商店" || name === "澡堂"
  ) return "building-teaching"

  return "default-building"
}

export function isColliderMesh(name: string): boolean {
  if (!name || name === "Scene" || name === "Root") return false
  const kind = classifyMesh(name)
  return (
    kind !== "ground" &&
    kind !== "lake" &&
    kind !== "track" &&
    kind !== "court-basketball" &&
    kind !== "court-tennis" &&
    kind !== "court-volleyball" &&
    kind !== "bridge" &&
    kind !== "sculpture"
  )
}

export function createCampusMaterial(
  kind: CampusMaterialKind,
  options?: { hovered?: boolean; buildingPart?: BuildingPart },
): THREE.Material | THREE.Material[] {
  const hovered = options?.hovered ?? false
  const c = CAMPUS_COLORS

  const isBuilding =
    kind !== "ground" &&
    kind !== "lake" &&
    kind !== "bridge" &&
    kind !== "sculpture" &&
    kind !== "track" &&
    kind !== "court-basketball" &&
    kind !== "court-tennis" &&
    kind !== "court-volleyball" &&
    kind !== "stand"

  if (isBuilding) {
    const roofMat = new THREE.MeshStandardMaterial({ map: getRoofTexture(), roughness: 0.85, metalness: 0.05 })
    roofMat.side = THREE.DoubleSide
    if (hovered) { roofMat.emissive = new THREE.Color("#ffffee"); roofMat.emissiveIntensity = 0.3 }

    const wallMat = new THREE.MeshStandardMaterial({ map: getWallWithWindowsTexture(), roughness: 0.9, metalness: 0 })
    wallMat.side = THREE.DoubleSide
    if (hovered) { wallMat.emissive = new THREE.Color("#ffffee"); wallMat.emissiveIntensity = 0.3 }

    return [roofMat, wallMat]
  }

  const mat = (() => {
    switch (kind) {
      case "ground":
        return new THREE.MeshToonMaterial({ color: c.grass })
      case "lake":
        return new THREE.MeshToonMaterial({
          color: c.lake,
          transparent: true,
          opacity: 0.88,
          depthWrite: false,
          polygonOffset: true,
          polygonOffsetFactor: -2,
          polygonOffsetUnits: -2,
        })
      case "bridge":
        return new THREE.MeshToonMaterial({ color: hovered ? "#ffffee" : c.bridge })
      case "sculpture":
        return new THREE.MeshToonMaterial({
          color: hovered ? c.sculptureGold : c.sculptureRed,
        })
      case "track":
        return new THREE.MeshStandardMaterial({ map: trackTex, roughness: 0.85 })
      case "court-basketball":
        return new THREE.MeshStandardMaterial({ map: basketballTex, roughness: 0.8 })
      case "court-tennis":
        return new THREE.MeshStandardMaterial({ map: tennisTex, roughness: 0.8 })
      case "court-volleyball":
        return new THREE.MeshStandardMaterial({ map: volleyballTex, roughness: 0.8 })
      case "stand":
        return new THREE.MeshToonMaterial({ color: c.stand })
      default:
        return new THREE.MeshToonMaterial({ color: c.whiteWall })
    }
  })()

  mat.side = THREE.DoubleSide
  return mat
}

/** GLB 中湖面/球场等为 y 厚度 0 的平面，需抬高并避免与地面 z-fighting */
export function configureGlbMesh(mesh: THREE.Mesh, name: string, forceNoSplit = false) {
  const kind = classifyMesh(name)

  const buildingPart = detectBuildingPart(mesh)
  mesh.userData.buildingPart = buildingPart

  const mat = createCampusMaterial(kind, { buildingPart })

  const isArray = Array.isArray(mat)

  if (isArray) {
    if (forceNoSplit) {
      mesh.material = mat[1]
    } else {
      const clonedGeom = mesh.geometry.clone()
      const split = splitBuildingGeometry(clonedGeom)
      if (split) {
        mesh.geometry = clonedGeom
        mesh.material = mat
        mesh.userData.buildingSplit = true
      } else {
        clonedGeom.dispose()
        mesh.material = mat[1]
      }
    }
  } else {
    mesh.material = mat
  }

  mesh.castShadow = kind !== "ground" && kind !== "lake"
  mesh.receiveShadow = kind !== "lake"

  switch (kind) {
    case "ground":
      mesh.renderOrder = 0
      break
    case "lake":
      mesh.renderOrder = 20
      break
    case "track":
      mesh.renderOrder = 15
      mesh.position.y += 0.01
      scheduleTrackUVRemap(mesh)
      break
    case "court-basketball":
      mesh.renderOrder = 14
      mesh.position.y += 0.01
      scheduleCourtUVRemap(mesh, "basketball")
      break
    case "court-tennis":
    case "court-volleyball":
      mesh.renderOrder = 14
      mesh.position.y += 0.01
      break
    case "bridge":
    case "sculpture":
      mesh.renderOrder = 12
      break
    default:
      mesh.renderOrder = 8
      break
  }

  mesh.userData.campusKind = kind
  mesh.userData.meshName = name
}

/** 给 mesh 应用材质，兼容 buildingSplit 多材质场景 */
export function applyBuildingMaterial(
  mesh: THREE.Mesh,
  kind: CampusMaterialKind,
  options?: { hovered?: boolean; buildingPart?: BuildingPart },
): void {
  const mat = createCampusMaterial(kind, options)
  if (Array.isArray(mat)) {
    mesh.material = mesh.userData.buildingSplit ? mat : mat[1]
  } else {
    mesh.material = mat
  }
}
