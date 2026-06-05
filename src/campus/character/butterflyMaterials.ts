import * as THREE from "three"

/** 大蓝闪蝶配色 */
export const MORPHO_COLORS = {
  wingBlue: "#1a5cff",
  wingBlueLight: "#4d9fff",
  wingEdge: "#0a0a12",
  bodyDark: "#1a2030",
} as const

function cloneMaterial(mat: THREE.Material): THREE.Material {
  if ("clone" in mat && typeof mat.clone === "function") return mat.clone()
  return mat
}

/**
 * 增强蝴蝶 GLB 材质：鲜亮蓝渐变、深色翅缘、轻微金属光泽
 */
export function applyMorphoButterflyMaterials(root: THREE.Object3D): void {
  root.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) return

    const src = child.material
    const mats = Array.isArray(src) ? src : [src]

    const next = mats.map((m) => {
      const base = cloneMaterial(m)
      const physical = new THREE.MeshPhysicalMaterial({
        color: new THREE.Color(MORPHO_COLORS.wingBlue),
        emissive: new THREE.Color("#0c2888"),
        emissiveIntensity: 0.16,
        metalness: 0.6,
        roughness: 0.26,
        clearcoat: 0.92,
        clearcoatRoughness: 0.1,
        sheen: 0.4,
        sheenRoughness: 0.35,
        sheenColor: new THREE.Color(MORPHO_COLORS.wingBlueLight),
        side: THREE.DoubleSide,
        transparent: base.transparent ?? false,
        opacity: base.opacity ?? 1,
      })

      if (base instanceof THREE.MeshStandardMaterial || base instanceof THREE.MeshPhysicalMaterial) {
        if (base.map) {
          physical.map = base.map
          physical.map.colorSpace = THREE.SRGBColorSpace
          physical.color.set(MORPHO_COLORS.wingBlueLight)
        }
        if (base.normalMap) physical.normalMap = base.normalMap
        if (base.roughnessMap) physical.roughnessMap = base.roughnessMap
        if (base.metalnessMap) physical.metalnessMap = base.metalnessMap
        if (base.alphaMap) {
          physical.alphaMap = base.alphaMap
          physical.transparent = true
        }
      }

      return physical
    })

    child.material = next.length === 1 ? next[0] : next
    child.castShadow = true
    child.receiveShadow = true
  })
}
