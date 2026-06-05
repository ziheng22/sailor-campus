import { useEffect, useRef, useCallback, useMemo } from "react"
import { Line } from "@react-three/drei"
import { type ThreeEvent, useThree } from "@react-three/fiber"
import * as THREE from "three"
import type { RoadDef } from "./campusRoadTypes"
import {
  findClosestEdge,
  insertVertexOnEdge,
  polygonCentroid,
  GROUND_SHAPE_ROTATION,
  polygonOutlineY,
  polygonToGroundShape,
  translatePolygon,
  updateVertexAt,
  type PolygonPoint,
} from "../utils/colliderPolygon"
import { pickGroundXZ } from "./colliderGroundPick"

export interface RoadEditorProps {
  roads: RoadDef[]
  selectedId: string | null
  selectedVertexIndex: number | null
  onSelect: (id: string | null) => void
  onSelectVertex: (index: number | null) => void
  onPolygonChange: (id: string, polygon: PolygonPoint[]) => void
  groundY: number
  addPointMode?: boolean
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
  const originRef = useRef<{ x: number; z: number } | null>(null)

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      if (!draggingRef.current) return
      const xz = pickGroundXZ(e.clientX, e.clientY, gl.domElement, camera, raycaster, groundY)
      if (!xz) return

      if (e.shiftKey && originRef.current) {
        const dx = xz.x - originRef.current.x
        const dz = xz.z - originRef.current.z
        if (Math.abs(dx) > Math.abs(dz)) {
          onDrag(index, xz.x, originRef.current.z)
        } else {
          onDrag(index, originRef.current.x, xz.z)
        }
      } else {
        onDrag(index, xz.x, xz.z)
      }
    }
    const onUp = () => {
      draggingRef.current = false
      originRef.current = null
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
      position={[point.x, groundY + 0.35, point.z]}
      renderOrder={25}
      onPointerDown={(e: ThreeEvent<PointerEvent>) => {
        e.stopPropagation()
        onSelect(index)
        draggingRef.current = true
        originRef.current = { x: point.x, z: point.z }
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
      <sphereGeometry args={[selected ? 0.55 : 0.4, 14, 14]} />
      <meshBasicMaterial
        color={selected ? "#ffffff" : "#5a5a5a"}
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
      position={[c.x, groundY + 0.45, c.z]}
      renderOrder={24}
      onPointerDown={(e: ThreeEvent<PointerEvent>) => {
        e.stopPropagation()
        draggingRef.current = true
        const xz = pickGroundXZ(e.clientX, e.clientY, gl.domElement, camera, raycaster, groundY)
        startRef.current = xz
        document.body.style.cursor = "grabbing"
      }}
    >
      <octahedronGeometry args={[0.35, 0]} />
      <meshBasicMaterial color="#666666" depthTest={false} />
    </mesh>
  )
}

function RoadPolygonShape({
  def,
  selected,
  groundY,
  selectedVertexIndex,
  addPointMode,
  onSelect,
  onSelectVertex,
  onPolygonChange,
}: {
  def: RoadDef
  selected: boolean
  groundY: number
  selectedVertexIndex: number | null
  addPointMode: boolean
  onSelect: (id: string) => void
  onSelectVertex: (index: number | null) => void
  onPolygonChange: (id: string, polygon: PolygonPoint[]) => void
}) {
  const { camera, gl, raycaster } = useThree()
  const points = def.polygon
  const outline = useMemo(() => polygonOutlineY(points, groundY, 0.08), [points, groundY])

  const shape = useMemo(() => polygonToGroundShape(points), [points])

  const handleVertexDrag = useCallback(
    (index: number, x: number, z: number) => {
      onPolygonChange(def.id, updateVertexAt(points, index, x, z))
    },
    [def.id, onPolygonChange, points],
  )

  const handleCenterDrag = useCallback(
    (dx: number, dz: number) => {
      onPolygonChange(def.id, translatePolygon(points, dx, dz))
    },
    [def.id, onPolygonChange, points],
  )

  const onFillDown = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation()
    onSelect(def.id)

    if (addPointMode) {
      const xz = pickGroundXZ(e.clientX, e.clientY, gl.domElement, camera, raycaster, groundY)
      if (!xz) return
      const hit = findClosestEdge(xz.x, xz.z, points)
      if (hit && hit.dist < 4) {
        onPolygonChange(def.id, insertVertexOnEdge(points, hit.edgeIndex, hit.point))
        onSelectVertex(hit.edgeIndex + 1)
      } else {
        onPolygonChange(
          def.id,
          insertVertexOnEdge(points, points.length - 1, { x: xz.x, z: xz.z }),
        )
        onSelectVertex(points.length)
      }
    }
  }

  return (
    <group name={`road-poly-${def.id}`}>
      {/* Editor fill overlay */}
      <mesh
        rotation={GROUND_SHAPE_ROTATION}
        position={[0, groundY + 0.03, 0]}
        renderOrder={6}
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
          color={selected ? "#ffcc00" : "#555555"}
          transparent
          opacity={selected ? 0.35 : 0.2}
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Outline */}
      <Line
        points={outline}
        color={selected ? "#ffcc00" : "#888888"}
        lineWidth={selected ? 2.5 : 1.5}
        renderOrder={15}
        depthTest={false}
      />

      {/* Vertex handles (only when selected) */}
      {selected && (
        <>
          {points.map((p, i) => (
            <VertexHandle
              key={`${def.id}-v-${i}`}
              index={i}
              point={p}
              groundY={groundY}
              selected={selectedVertexIndex === i}
              onSelect={onSelectVertex}
              onDrag={handleVertexDrag}
            />
          ))}
          <CenterHandle points={points} groundY={groundY} onDrag={handleCenterDrag} />
        </>
      )}
    </group>
  )
}

export function RoadEditor({
  roads,
  selectedId,
  selectedVertexIndex,
  onSelect,
  onSelectVertex,
  onPolygonChange,
  groundY,
  addPointMode = false,
}: RoadEditorProps) {
  return (
    <group name="road-editor">
      {roads.map((def) => (
        <RoadPolygonShape
          key={def.id}
          def={def}
          selected={selectedId === def.id}
          groundY={groundY}
          selectedVertexIndex={selectedId === def.id ? selectedVertexIndex : null}
          addPointMode={addPointMode && selectedId === def.id}
          onSelect={onSelect}
          onSelectVertex={onSelectVertex}
          onPolygonChange={onPolygonChange}
        />
      ))}
    </group>
  )
}
