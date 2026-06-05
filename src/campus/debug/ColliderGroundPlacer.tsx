import { useThree, type ThreeEvent } from "@react-three/fiber"
import { pickGroundXZ } from "./colliderGroundPick"

interface ColliderGroundPlacerProps {
  active: boolean
  groundY: number
  onPlace: (x: number, z: number) => void
}

/** 编辑模式下点击空地放置新碰撞框 */
export function ColliderGroundPlacer({ active, groundY, onPlace }: ColliderGroundPlacerProps) {
  const { camera, gl, raycaster } = useThree()

  if (!active) return null

  const handlePointerDown = (e: ThreeEvent<PointerEvent>) => {
    if (e.button !== 0) return
    e.stopPropagation()
    const xz = pickGroundXZ(e.clientX, e.clientY, gl.domElement, camera, raycaster, groundY)
    if (xz) onPlace(xz.x, xz.z)
  }

  return (
    <mesh
      name="collider-ground-placer"
      rotation={[-Math.PI / 2, 0, 0]}
      position={[60, groundY + 0.02, 50]}
      onPointerDown={handlePointerDown}
      renderOrder={-1}
    >
      <planeGeometry args={[400, 400]} />
      <meshBasicMaterial transparent opacity={0} depthWrite={false} />
    </mesh>
  )
}
