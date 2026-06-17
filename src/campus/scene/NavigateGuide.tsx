import { useRef, useMemo } from "react"
import { useFrame } from "@react-three/fiber"
import * as THREE from "three"
import type { NavigateTarget } from "../navigate/NavigateTarget"

interface Props {
  target: NavigateTarget | null
  playerRef: React.RefObject<THREE.Group | null>
  groundY?: number
}

export function NavigateGuide({ target, playerRef, groundY = 0.2 }: Props) {
  const beaconRef = useRef<THREE.Group>(null)
  const ringRef = useRef<THREE.Mesh>(null)
  const arrowRef = useRef<THREE.Group>(null)

  const targetPos = useMemo(() => {
    if (!target) return null
    return new THREE.Vector3(target.x, groundY + 0.05, target.z)
  }, [target, groundY])

  useFrame(() => {
    if (!beaconRef.current || !targetPos) return

    // 光柱脉冲
    const t = Date.now() * 0.001
    const pulse = 1 + Math.sin(t * 3) * 0.15
    beaconRef.current.scale.setScalar(pulse)

    // 光环旋转
    if (ringRef.current) {
      ringRef.current.rotation.y += 0.02
    }

    // 箭头指向玩家（arrow 为圆锥，默认 +Z，atan2(dx,dz) 使 +Z 指向玩家方向）
    if (arrowRef.current && playerRef.current) {
      const playerPos = playerRef.current.position
      const dx = playerPos.x - targetPos.x
      const dz = playerPos.z - targetPos.z
      arrowRef.current.rotation.y = Math.atan2(dx, dz)
    }
  })

  if (!targetPos) return null

  return (
    <group name="navigate-guide">
      {/* 光柱 — 底部抬起 2 单位 */}
      <group ref={beaconRef} position={[targetPos.x, targetPos.y + 2, targetPos.z]}>
        {/* 主体光柱（从地面起 12 单位高） */}
        <mesh position={[0, 6, 0]}>
          <cylinderGeometry args={[0.3, 0.5, 12, 16]} />
          <meshBasicMaterial
            color="#ffcc00"
            transparent
            opacity={0.7}
            depthWrite={false}
          />
        </mesh>
        {/* 顶部光球 */}
        <mesh position={[0, 13, 0]}>
          <sphereGeometry args={[1.0, 16, 16]} />
          <meshBasicMaterial
            color="#ffe066"
            transparent
            opacity={0.9}
            depthWrite={false}
          />
        </mesh>
        {/* 底部光点 — 紧贴地面 */}
        <mesh position={[0, 0.05, 0]}>
          <ringGeometry args={[0.5, 0.8, 32]} />
          <meshBasicMaterial
            color="#ffcc00"
            transparent
            opacity={0.6}
            side={THREE.DoubleSide}
            depthWrite={false}
          />
        </mesh>
      </group>

      {/* 地面光环 */}
      <mesh
        ref={ringRef}
        position={[targetPos.x, targetPos.y + 0.1, targetPos.z]}
        rotation={[-Math.PI / 2, 0, 0]}
      >
        <ringGeometry args={[1.0, 1.3, 48]} />
        <meshBasicMaterial
          color="#ffcc00"
          transparent
          opacity={0.5}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>

      {/* 地面方向箭头（指向目标） */}
      <group ref={arrowRef} position={[targetPos.x, targetPos.y + 0.12, targetPos.z]}>
        <mesh position={[0, 0, 1.3]} rotation={[-Math.PI / 2, 0, 0]}>
          <coneGeometry args={[0.4, 0.8, 8]} />
          <meshBasicMaterial
            color="#ff8844"
            transparent
            opacity={0.7}
            depthWrite={false}
          />
        </mesh>
      </group>

      {/* 粒子光环（悬浮） */}
      <PointsRing position={[targetPos.x, targetPos.y + 5, targetPos.z]} />
    </group>
  )
}

/** 悬浮旋转粒子环 */
function PointsRing({ position }: { position: [number, number, number] }) {
  const ref = useRef<THREE.Points>(null)

  const geom = useMemo(() => {
    const g = new THREE.BufferGeometry()
    const count = 40
    const positions = new Float32Array(count * 3)
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2
      const r = 1.2
      positions[i * 3] = Math.cos(angle) * r
      positions[i * 3 + 1] = Math.sin(angle) * r * 0.3
      positions[i * 3 + 2] = 0
    }
    g.setAttribute("position", new THREE.BufferAttribute(positions, 3))
    return g
  }, [])

  useFrame(() => {
    if (!ref.current) return
    ref.current.rotation.y += 0.015
    ref.current.rotation.x = Math.sin(Date.now() * 0.002) * 0.3
  })

  return (
    <points ref={ref} position={position}>
      <primitive object={geom} />
      <pointsMaterial
        color="#ffdd55"
        size={0.12}
        transparent
        opacity={0.7}
        depthWrite={false}
      />
    </points>
  )
}
