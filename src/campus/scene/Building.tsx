import { useRef, useState } from "react"
import * as THREE from "three"
import { BuildingData } from "../data/campusData"

interface BuildingProps {
  data: BuildingData
  onClick?: (data: BuildingData) => void
}

const ROOF_OVERSHOOT = 0.3

export function Building({ data, onClick }: BuildingProps) {
  const [hovered, setHovered] = useState(false)
  const ref = useRef<THREE.Group>(null)

  const floorHeight = data.height / data.floors
  const bodyHeight = data.height - 1
  const roofHeight = 1.2

  return (
    <group
      ref={ref}
      position={[data.x, 0, data.z]}
      onClick={(e) => { e.stopPropagation(); onClick?.(data) }}
      onPointerOver={() => setHovered(true)}
      onPointerOut={() => setHovered(false)}
    >
      <mesh
        position={[0, bodyHeight / 2, 0]}
        castShadow
      >
        <boxGeometry args={[data.width, bodyHeight, data.depth]} />
        <meshToonMaterial color={hovered ? "#ffffee" : data.wallColor} />
      </mesh>

      {Array.from({ length: data.floors }, (_, i) => (
        <mesh key={`floor-${i}`} position={[0, (i + 1) * floorHeight, data.depth / 2 + 0.01]}>
          <boxGeometry args={[data.width + 0.02, 0.06, 0.04]} />
          <meshToonMaterial color="#e8d5c4" />
        </mesh>
      ))}

      {Array.from({ length: data.floors }, (_, floor) =>
        Array.from({ length: Math.floor(data.width / 2.5) }, (_, w) => (
          <mesh
            key={`win-${floor}-${w}`}
            position={[
              -data.width / 2 + 1.5 + w * 2.5,
              floor * floorHeight + floorHeight / 2 + 0.4,
              data.depth / 2 + 0.02,
            ]}
          >
            <boxGeometry args={[1.2, 1.2, 0.02]} />
            <meshToonMaterial color={hovered ? "#ffffcc" : "#b8d4e8"} />
          </mesh>
        ))
      )}

      <mesh position={[0, bodyHeight + roofHeight / 2, 0]} castShadow>
        <boxGeometry args={[data.width + ROOF_OVERSHOOT * 2, roofHeight, data.depth + ROOF_OVERSHOOT * 2]} />
        <meshToonMaterial color={hovered ? "#ff8866" : data.roofColor} />
      </mesh>

      <mesh position={[0, bodyHeight + roofHeight + 0.3, 0]}>
        <boxGeometry args={[data.width + ROOF_OVERSHOOT * 2, 0.6, 1.2]} />
        <meshToonMaterial color={data.roofColor} />
      </mesh>

      <mesh position={[0, data.height + 2, data.depth / 2 + 0.5]}>
        <planeGeometry args={[data.width * 0.6, 1]} />
        <meshBasicMaterial color="white" transparent opacity={0} />
      </mesh>

      {data.enterable && (
        <mesh position={[0, 0.15, data.depth / 2 + 0.3]}>
          <boxGeometry args={[2, 0.3, 0.3]} />
          <meshToonMaterial color="#ffcc00" />
        </mesh>
      )}
    </group>
  )
}
