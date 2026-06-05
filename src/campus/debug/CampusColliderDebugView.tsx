import { useMemo } from "react"
import { Html } from "@react-three/drei"
import * as THREE from "three"
import type { AirWallReport, CampusColliderEntry } from "./campusColliderTypes"

interface CampusColliderDebugViewProps {
  report: AirWallReport | null
  groundY?: number
  showAll?: boolean
  /** 在碰撞盒上方显示名称标签 */
  showLabels?: boolean
}

function ColliderBox({
  entry,
  groundY,
  isAirWall,
  showLabels,
}: {
  entry: CampusColliderEntry
  groundY: number
  isAirWall: boolean
  showLabels: boolean
}) {
  const w = entry.width
  const d = entry.depth
  const h = Math.max(2.5, Math.min(12, Math.sqrt(entry.area) * 0.15))
  const cx = entry.center.x
  const cz = entry.center.z

  const color = entry.layer === "lake" ? "#4488ff" : isAirWall ? "#ff2244" : "#ff6666"

  return (
    <group position={[cx, groundY + h / 2, cz]}>
      <mesh>
        <boxGeometry args={[w, h, d]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={isAirWall ? 0.42 : 0.22}
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </mesh>
      <lineSegments>
        <edgesGeometry args={[new THREE.BoxGeometry(w, h, d)]} />
        <lineBasicMaterial color={isAirWall ? "#ff0000" : "#ff8888"} linewidth={1} />
      </lineSegments>
      {showLabels && (
        <Html
          position={[0, h / 2 + 1.2, 0]}
          center
          distanceFactor={48}
          zIndexRange={[100, 0]}
          style={{ pointerEvents: "none" }}
        >
          <div
            style={{
              whiteSpace: "nowrap",
              fontSize: 11,
              lineHeight: 1.35,
              fontWeight: isAirWall ? 700 : 500,
              color: isAirWall ? "#ffb3c0" : "#ffd0d0",
              background: "rgba(0,0,0,0.78)",
              padding: "3px 7px",
              borderRadius: 4,
              border: isAirWall ? "1px solid #ff2244" : "1px solid #aa4444",
              boxShadow: "0 1px 4px rgba(0,0,0,0.45)",
            }}
          >
            <div>{entry.name}</div>
            <div style={{ fontSize: 9, opacity: 0.85, marginTop: 1 }}>
              {entry.width.toFixed(1)}×{entry.depth.toFixed(1)} · {entry.sourceKind}
              {entry.flags.length > 0 ? ` · ${entry.flags.join(",")}` : ""}
            </div>
          </div>
        </Html>
      )}
    </group>
  )
}

export function CampusColliderDebugView({
  report,
  groundY = 0.22,
  showAll = true,
  showLabels = true,
}: CampusColliderDebugViewProps) {
  const airWallIds = useMemo(() => {
    if (!report) return new Set<string>()
    return new Set([
      ...report.airWalls.map((e) => e.id),
      ...report.orphanHiddenMeshes.map((e) => e.id),
    ])
  }, [report])

  if (!report) return null

  const visible = showAll
    ? report.entries
    : [...report.airWalls, ...report.orphanHiddenMeshes]

  return (
    <group name="campus-collider-debug">
      {visible.map((entry) => (
        <ColliderBox
          key={entry.id}
          entry={entry}
          groundY={groundY}
          isAirWall={airWallIds.has(entry.id)}
          showLabels={showLabels}
        />
      ))}
    </group>
  )
}
