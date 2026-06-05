import { useMemo } from "react"
import * as THREE from "three"
import type { RoadDef } from "./campusRoadTypes"
import { GROUND_SHAPE_ROTATION, polygonToGroundShape } from "../utils/colliderPolygon"

interface RoadSurfaceLayerProps {
  roads: RoadDef[]
  groundY: number
}

/** 与 Ground.tsx 主路一致的中灰，避免近黑 (#3a3a3a) 贴地发脏 */
const ROAD_SURFACE_COLOR = "#7d7b78"

export function RoadSurfaceLayer({ roads, groundY }: RoadSurfaceLayerProps) {
  const shapes = useMemo(() => {
    return roads.map((def) => ({
      id: def.id,
      shape: polygonToGroundShape(def.polygon),
    }))
  }, [roads])

  return (
    <group name="road-surfaces">
      {shapes.map(({ id, shape }) => (
        <mesh
          key={id}
          rotation={GROUND_SHAPE_ROTATION}
          position={[0, groundY + 0.015, 0]}
          renderOrder={1}
          receiveShadow
        >
          <shapeGeometry args={[shape]} />
          <meshStandardMaterial
            color={ROAD_SURFACE_COLOR}
            roughness={0.85}
            metalness={0.05}
            side={THREE.DoubleSide}
            depthWrite
          />
        </mesh>
      ))}
    </group>
  )
}
