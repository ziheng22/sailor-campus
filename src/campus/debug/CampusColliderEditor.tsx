import { useEffect, useRef, useCallback, useMemo } from "react"
import { Html, Line } from "@react-three/drei"
import { type ThreeEvent, useThree } from "@react-three/fiber"
import * as THREE from "three"
import type { CampusColliderEntry } from "./campusColliderTypes"
import {
  aabbToPolygon,
  findClosestEdge,
  insertVertexOnEdge,
  GROUND_SHAPE_ROTATION,
  polygonCentroid,
  polygonOutlineY,
  polygonToGroundShape,
  translatePolygon,
  updateVertexAt,
  type PolygonPoint,
} from "../utils/colliderPolygon"
import { pickGroundXZ } from "./colliderGroundPick"

export type ColliderTransformMode = "translate" | "corners"

interface CampusColliderEditorProps {
  entries: CampusColliderEntry[]
  selectedId: string | null
  selectedVertexIndex: number | null
  onSelect: (id: string | null) => void
  onSelectVertex: (index: number | null) => void
  onPolygonChange: (id: string, polygon: PolygonPoint[]) => void
  transformMode: ColliderTransformMode
  groundY?: number
  showLabels?: boolean
  customColliderIds?: Set<string>
  addPointMode?: boolean
}

function displayPolygon(entry: CampusColliderEntry): PolygonPoint[] {
  return entry.polygon && entry.polygon.length >= 3
    ? entry.polygon
    : aabbToPolygon(entry.aabb)
}

function VertexHandle({
  index,
  point,
  groundY,
  selected,
  onSelect,
  onDrag,
}: {
  index: number
  point: PolygonPoint
  groundY: number
  selected: boolean
  onSelect: (index: number) => void
  onDrag: (index: number, x: number, z: number) => void
}) {
  const { camera, gl, raycaster } = useThree()
  const draggingRef = useRef(false)
  const posRef = useRef(point)
  posRef.current = point

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      if (!draggingRef.current) return
      const xz = pickGroundXZ(e.clientX, e.clientY, gl.domElement, camera, raycaster, groundY)
      if (xz) onDrag(index, xz.x, xz.z)
    }
    const onUp = () => {
      draggingRef.current = false
      document.body.style.cursor = "default"
    }
    window.addEventListener("pointermove", onMove)
    window.addEventListener("pointerup", onUp)
    window.addEventListener("pointercancel", onUp)
    return () => {
      window.removeEventListener("pointermove", onMove)
      window.removeEventListener("pointerup", onUp)
      window.removeEventListener("pointercancel", onUp)
    }
  }, [camera, gl.domElement, groundY, index, onDrag, raycaster])

  return (
    <mesh
      position={[point.x, groundY + 0.4, point.z]}
      renderOrder={25}
      onPointerDown={(e: ThreeEvent<PointerEvent>) => {
        e.stopPropagation()
        onSelect(index)
        draggingRef.current = true
        document.body.style.cursor = "grabbing"
      }}
      onPointerOver={(e) => {
        e.stopPropagation()
        if (!draggingRef.current) document.body.style.cursor = "grab"
      }}
      onPointerOut={() => {
        if (!draggingRef.current) document.body.style.cursor = "default"
      }}
    >
      <sphereGeometry args={[selected ? 0.65 : 0.5, 14, 14]} />
      <meshBasicMaterial
        color={selected ? "#ffffff" : "#ffee00"}
        depthTest={false}
        toneMapped={false}
      />
    </mesh>
  )
}

function CenterHandle({
  points,
  groundY,
  onDrag,
}: {
  points: PolygonPoint[]
  groundY: number
  onDrag: (dx: number, dz: number) => void
}) {
  const { camera, gl, raycaster } = useThree()
  const draggingRef = useRef(false)
  const startRef = useRef<{ x: number; z: number } | null>(null)
  const c = polygonCentroid(points)

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      if (!draggingRef.current || !startRef.current) return
      const xz = pickGroundXZ(e.clientX, e.clientY, gl.domElement, camera, raycaster, groundY)
      if (!xz) return
      onDrag(xz.x - startRef.current.x, xz.z - startRef.current.z)
      startRef.current = xz
    }
    const onUp = () => {
      draggingRef.current = false
      startRef.current = null
      document.body.style.cursor = "default"
    }
    window.addEventListener("pointermove", onMove)
    window.addEventListener("pointerup", onUp)
    return () => {
      window.removeEventListener("pointermove", onMove)
      window.removeEventListener("pointerup", onUp)
    }
  }, [camera, gl.domElement, groundY, onDrag, raycaster])

  return (
    <mesh
      position={[c.x, groundY + 0.55, c.z]}
      renderOrder={24}
      onPointerDown={(e: ThreeEvent<PointerEvent>) => {
        e.stopPropagation()
        draggingRef.current = true
        const xz = pickGroundXZ(e.clientX, e.clientY, gl.domElement, camera, raycaster, groundY)
        startRef.current = xz
        document.body.style.cursor = "grabbing"
      }}
    >
      <octahedronGeometry args={[0.45, 0]} />
      <meshBasicMaterial color="#4a90d9" depthTest={false} />
    </mesh>
  )
}

function PolygonColliderShape({
  entry,
  points,
  selected,
  isCustom,
  groundY,
  showLabels,
  transformMode,
  selectedVertexIndex,
  addPointMode,
  onSelect,
  onSelectVertex,
  onPolygonChange,
}: {
  entry: CampusColliderEntry
  points: PolygonPoint[]
  selected: boolean
  isCustom: boolean
  groundY: number
  showLabels: boolean
  transformMode: ColliderTransformMode
  selectedVertexIndex: number | null
  addPointMode: boolean
  onSelect: (id: string) => void
  onSelectVertex: (index: number | null) => void
  onPolygonChange: (id: string, polygon: PolygonPoint[]) => void
}) {
  const { camera, gl, raycaster } = useThree()
  const outline = useMemo(() => polygonOutlineY(points, groundY), [points, groundY])

  const shape = useMemo(() => polygonToGroundShape(points), [points])

  const color = isCustom
    ? "#00e676"
    : entry.layer === "lake"
      ? "#4488ff"
      : entry.flags.length > 0
        ? "#ff2244"
        : "#ff6666"

  const handleVertexDrag = useCallback(
    (index: number, x: number, z: number) => {
      onPolygonChange(entry.id, updateVertexAt(points, index, x, z))
    },
    [entry.id, onPolygonChange, points],
  )

  const handleCenterDrag = useCallback(
    (dx: number, dz: number) => {
      onPolygonChange(entry.id, translatePolygon(points, dx, dz))
    },
    [entry.id, onPolygonChange, points],
  )

  const onFillDown = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation()
    onSelect(entry.id)

    if (addPointMode) {
      const xz = pickGroundXZ(e.clientX, e.clientY, gl.domElement, camera, raycaster, groundY)
      if (!xz) return
      const hit = findClosestEdge(xz.x, xz.z, points)
      if (hit && hit.dist < 4) {
        onPolygonChange(entry.id, insertVertexOnEdge(points, hit.edgeIndex, hit.point))
        onSelectVertex(hit.edgeIndex + 1)
      } else {
        onPolygonChange(
          entry.id,
          insertVertexOnEdge(points, points.length - 1, { x: xz.x, z: xz.z }),
        )
        onSelectVertex(points.length)
      }
    }
  }

  const h = Math.max(2.5, Math.min(12, Math.sqrt(entry.area) * 0.15))

  return (
    <group name={`collider-poly-${entry.id}`}>
      <mesh
        rotation={GROUND_SHAPE_ROTATION}
        position={[0, groundY + 0.06, 0]}
        renderOrder={5}
        onPointerDown={onFillDown}
        onPointerOver={(e) => {
          e.stopPropagation()
          document.body.style.cursor = addPointMode ? "copy" : "pointer"
        }}
        onPointerOut={() => {
          document.body.style.cursor = "default"
        }}
      >
        <shapeGeometry args={[shape]} />
        <meshBasicMaterial
          color={selected ? "#ffee00" : color}
          transparent
          opacity={selected ? 0.42 : 0.22}
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </mesh>

      <Line
        points={outline}
        color={selected ? "#ffee00" : color}
        lineWidth={selected ? 2.5 : 1.5}
        renderOrder={15}
        depthTest={false}
      />

      {selected && (
        <>
          {points.map((p, i) => (
            <VertexHandle
              key={`${entry.id}-v-${i}`}
              index={i}
              point={p}
              groundY={groundY}
              selected={selectedVertexIndex === i}
              onSelect={onSelectVertex}
              onDrag={handleVertexDrag}
            />
          ))}
          {transformMode === "translate" && (
            <CenterHandle points={points} groundY={groundY} onDrag={handleCenterDrag} />
          )}
        </>
      )}

      {showLabels && (
        <Html
          position={[entry.center.x, groundY + h + 1.2, entry.center.z]}
          center
          distanceFactor={48}
          style={{ pointerEvents: "none" }}
        >
          <div
            style={{
              fontSize: 11,
              fontWeight: selected ? 700 : 500,
              color: selected ? "#fff59d" : "#ffd0d0",
              background: "rgba(0,0,0,0.82)",
              padding: "3px 8px",
              borderRadius: 4,
              border: selected ? "2px solid #ffee00" : "1px solid #aa4444",
              whiteSpace: "nowrap",
            }}
          >
            {entry.name} ({points.length}点)
          </div>
        </Html>
      )}
    </group>
  )
}

export function CampusColliderEditor({
  entries,
  selectedId,
  selectedVertexIndex,
  onSelect,
  onSelectVertex,
  onPolygonChange,
  transformMode,
  groundY = 0.22,
  showLabels = true,
  customColliderIds,
  addPointMode = false,
}: CampusColliderEditorProps) {
  return (
    <group name="campus-collider-editor">
      {entries.map((entry) => {
        const points = displayPolygon(entry)
        return (
          <PolygonColliderShape
            key={entry.id}
            entry={entry}
            points={points}
            selected={selectedId === entry.id}
            isCustom={customColliderIds?.has(entry.id) ?? false}
            groundY={groundY}
            showLabels={showLabels}
            transformMode={transformMode}
            selectedVertexIndex={selectedId === entry.id ? selectedVertexIndex : null}
            addPointMode={addPointMode && selectedId === entry.id}
            onSelect={onSelect}
            onSelectVertex={onSelectVertex}
            onPolygonChange={onPolygonChange}
          />
        )
      })}
    </group>
  )
}
