import { useEffect, useMemo } from "react"
import { buildings, trackFields, sportAreas, landmarks, type BuildingData, type SportAreaData, type TrackFieldData } from "../data/campusData"
import { Building } from "./Building"
import { makeAABB, type AABB } from "../utils/collision"

interface CampusLayoutProps {
  onBuildingClick: (data: BuildingData) => void
  onCollidersReady: (colliders: AABB[]) => void
}

export function CampusLayout({ onBuildingClick, onCollidersReady }: CampusLayoutProps) {
  const colliders = useMemo(() =>
    buildings.map((b) =>
      makeAABB(b.x, b.z, b.width / 2 + 0.5, b.depth / 2 + 0.5)
    ),
  [])

  useEffect(() => {
    onCollidersReady(colliders)
  }, [colliders, onCollidersReady])

  return (
    <group>
      {buildings.map((building) => (
        <Building
          key={building.id}
          data={building}
          onClick={onBuildingClick}
        />
      ))}

      {trackFields.map((track) => (
        <TrackField key={track.id} data={track} />
      ))}

      {sportAreas.map((area) => (
        <SportArea key={area.id} data={area} />
      ))}

      {landmarks.map((lm) => (
        <Landmark key={lm.id} data={lm} />
      ))}
    </group>
  )
}

function TrackField({ data }: { data: TrackFieldData }) {
  const w = 84
  const d = 46
  return (
    <group position={[data.centerX, 0, data.centerZ]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.03, 0]}>
        <planeGeometry args={[w - 16, d - 16]} />
        <meshToonMaterial color="#7cb342" />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.04, 0]}>
        <ringGeometry args={[Math.min(w, d) / 2 - 9, Math.min(w, d) / 2 - 1, 64]} />
        <meshToonMaterial color="#c1443c" />
      </mesh>
      <mesh position={[-w / 2 + 2, 0.5, 0]}>
        <boxGeometry args={[3, 1, d * 0.3]} />
        <meshToonMaterial color="#c8c4bc" />
      </mesh>
      <mesh position={[-w / 2 + 4, 1.5, 0]}>
        <boxGeometry args={[0.3, 2, d * 0.3]} />
        <meshToonMaterial color="#f0ece4" />
      </mesh>
    </group>
  )
}

function SportArea({ data }: { data: SportAreaData }) {
  const cols = data.layout === "grid" ? Math.ceil(Math.sqrt(data.count)) : data.count
  const rows = data.layout === "grid" ? Math.ceil(data.count / cols) : 1
  const cellW = data.width / cols
  const cellD = data.depth / rows

  return (
    <group position={[data.centerX, 0.02, data.centerZ]}>
      {Array.from({ length: data.count }, (_, i) => {
        const col = i % cols
        const row = Math.floor(i / cols)
        const cx = -data.width / 2 + cellW / 2 + col * cellW
        const cz = -data.depth / 2 + cellD / 2 + row * cellD
        const color = data.type === "basketball" ? "#e8a87c" : "#6aaa6a"
        return (
          <mesh
            key={i}
            rotation={[-Math.PI / 2, 0, 0]}
            position={[cx, 0, cz]}
          >
            <planeGeometry args={[cellW - 0.3, cellD - 0.3]} />
            <meshToonMaterial color={color} />
          </mesh>
        )
      })}
    </group>
  )
}

function Landmark({ data }: { data: { id: string; name: string; x: number; z: number; type: string; description: string } }) {
  return (
    <group position={[data.x, 0, data.z]}>
      {data.type === "sculpture" && (
        <>
          <mesh position={[0, 0.3, 0]}>
            <cylinderGeometry args={[2.5, 2.8, 0.3, 16]} />
            <meshToonMaterial color="#d5d0c8" />
          </mesh>
          <mesh position={[0, 2, 0]}>
            <cylinderGeometry args={[0.3, 0.5, 2.5, 8]} />
            <meshToonMaterial color="#c0392b" />
          </mesh>
          <mesh position={[0, 3.8, 0]}>
            <sphereGeometry args={[0.4, 8, 8]} />
            <meshToonMaterial color="#ffd700" />
          </mesh>
        </>
      )}
      {data.type === "bridge" && (
        <>
          <mesh position={[0, 0.3, 0]}>
            <boxGeometry args={[4, 0.3, 8]} />
            <meshToonMaterial color="#d5d0c8" />
          </mesh>
          <mesh position={[-2, 0.7, 0]}>
            <boxGeometry args={[0.2, 0.8, 7.5]} />
            <meshToonMaterial color="#f5f0e8" />
          </mesh>
          <mesh position={[2, 0.7, 0]}>
            <boxGeometry args={[0.2, 0.8, 7.5]} />
            <meshToonMaterial color="#f5f0e8" />
          </mesh>
        </>
      )}
      {data.type === "arch" && (
        <>
          <mesh position={[0, 1.5, 0]}>
            <boxGeometry args={[10, 3, 1]} />
            <meshToonMaterial color="#9e9a94" />
          </mesh>
          <mesh position={[0, 2.5, 0]}>
            <boxGeometry args={[3, 2, 1.1]} />
            <meshToonMaterial color="#7a7670" />
          </mesh>
          <mesh position={[0, 2.5, 0.52]}>
            <boxGeometry args={[2.5, 1.5, 0.1]} />
            <meshToonMaterial color="#8b1a1a" />
          </mesh>
        </>
      )}
      {data.type === "pavilion" && (
        <>
          <mesh position={[0, 1.5, 0]}>
            <cylinderGeometry args={[0.3, 0.4, 3, 8]} />
            <meshToonMaterial color="#f5f0e8" />
          </mesh>
          <mesh position={[0, 3.2, 0]}>
            <coneGeometry args={[2.5, 1, 8]} />
            <meshToonMaterial color="#f5f0e8" />
          </mesh>
        </>
      )}
    </group>
  )
}
