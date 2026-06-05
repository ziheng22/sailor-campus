import { roads, plazas, type RoadData, type PlazaData } from "../data/campusData"

interface GroundProps {
  /** GLB 已含地面时关闭草地平面，仅保留道路与广场 */
  roadsOnly?: boolean
  /** 是否渲染广场瓷砖（严格只要道路时可关） */
  includePlazas?: boolean
  /** 路面抬高（世界坐标），避免与 GLB 地面 z-fighting */
  roadElevation?: number
}

export function Ground({
  roadsOnly = false,
  includePlazas = true,
  roadElevation = 0.02,
}: GroundProps) {
  return (
    <group name="campus-roads" userData={{ isCampusRoad: true }}>
      {!roadsOnly && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.05, 0]} receiveShadow>
          <planeGeometry args={[220, 200]} />
          <meshToonMaterial color="#7a9a4b" />
        </mesh>
      )}

      {includePlazas &&
        plazas.map((plaza) => (
          <PlazaTile key={plaza.id} data={plaza} elevation={roadElevation} />
        ))}

      {roads.map((road, i) => (
        <RoadSegment key={`road-${i}`} data={road} elevation={roadElevation} />
      ))}
    </group>
  )
}

function PlazaTile({ data, elevation }: { data: PlazaData; elevation: number }) {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[data.x, elevation, data.z]} receiveShadow>
      <planeGeometry args={[data.width, data.depth]} />
      <meshToonMaterial color={data.tileColor} />
    </mesh>
  )
}

function RoadSegment({ data, elevation }: { data: RoadData; elevation: number }) {
  const dx = data.x2 - data.x1
  const dz = data.z2 - data.z1
  const length = Math.sqrt(dx * dx + dz * dz)
  const angle = Math.atan2(dz, dx)
  const cx = (data.x1 + data.x2) / 2
  const cz = (data.z1 + data.z2) / 2

  const color = data.type === "external" ? "#6b6b6b" : data.type === "main" ? "#7d7b78" : "#8a8884"

  return (
    <mesh
      rotation={[-Math.PI / 2, 0, -angle]}
      position={[cx, elevation, cz]}
      receiveShadow
    >
      <planeGeometry args={[length, data.width]} />
      <meshToonMaterial color={color} />
    </mesh>
  )
}
