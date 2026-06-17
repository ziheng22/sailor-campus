import { Suspense, useState, useCallback, useRef, useEffect, useMemo, type MutableRefObject } from "react"
import { useFrame } from "@react-three/fiber"
import { Canvas } from "@react-three/fiber"
import { KeyboardControls } from "@react-three/drei"
import * as THREE from "three"
import { GlbCampus } from "./GlbCampus"
import { CharacterController } from "../character/CharacterController"
import { type BuildingData, buildings as campusBuildings } from "../data/campusData"
import { type CampusCollisionData, type CampusWalkSurface } from "./campusColliders"
import { getHumanHeight } from "./glbBuildingScale"
import {
  DEFAULT_SPAWN_YAW,
  getDefaultCameraPosition,
  getReferenceHumanWorldHeight,
  PLAYER_SPAWN_POSITION,
} from "../character/avatarConfig"
import { buildAirWallReport, logAirWallReport } from "../debug/campusColliderDebug"
import { CampusColliderDebugView } from "../debug/CampusColliderDebugView"
import { CampusColliderEditor, type ColliderTransformMode } from "../debug/CampusColliderEditor"
import type { AirWallReport } from "../debug/campusColliderTypes"
import type { PolygonPoint } from "../utils/colliderPolygon"
import { ColliderGroundPlacer } from "../debug/ColliderGroundPlacer"
import { CampusDebugCamera } from "../debug/CampusDebugCamera"
import {
  applyColliderOverrides,
  patchColliderPolygon,
  saveColliderOverrides,
  type ColliderOverrides,
} from "../debug/campusColliderOverrides"
import type { CampusColliderEntry } from "../debug/campusColliderTypes"
import type { RoadDef } from "../debug/campusRoadTypes"
import { RoadEditor } from "../debug/RoadEditor"
import { RoadSurfaceLayer } from "../debug/RoadSurfaceLayer"
import type { NavigateTarget } from "../navigate/NavigateTarget"
import { setBuildingPosition, clearBuildingPositions } from "../navigate/NavigateTarget"
import { NavigateGuide } from "./NavigateGuide"
import { GLB_MESH_META } from "../data/glbBuildingMeta"
import { playerWorldPos } from "../ui/playerPosition"

const keyboardMap = [
  { name: "forward", keys: ["KeyW", "ArrowUp"] },
  { name: "backward", keys: ["KeyS", "ArrowDown"] },
  { name: "left", keys: ["KeyA", "ArrowLeft"] },
  { name: "right", keys: ["KeyD", "ArrowRight"] },
]

interface CampusSceneProps {
  navigateTarget?: NavigateTarget | null
  onBuildingClick: (data: BuildingData) => void
  colliderDebug?: boolean
  colliderEditMode?: boolean
  onAirWallReport?: (report: AirWallReport) => void
  overrides?: ColliderOverrides
  onOverridesChange?: (o: ColliderOverrides) => void
  selectedColliderId?: string | null
  onSelectCollider?: (id: string | null) => void
  transformMode?: ColliderTransformMode
  newColliderCenterRef?: MutableRefObject<{ x: number; z: number }>
  placeNewMode?: boolean
  onPlaceNewCollider?: (x: number, z: number) => void
  onEditorEntriesChange?: (entries: CampusColliderEntry[]) => void
  customColliderIds?: Set<string>
  selectedVertexIndex?: number | null
  onSelectVertex?: (index: number | null) => void
  addPointMode?: boolean
  // Road debug
  roadDebug?: boolean
  roadDefs?: RoadDef[]
  selectedRoadId?: string | null
  selectedRoadVertexIndex?: number | null
  onSelectRoad?: (id: string | null) => void
  onSelectRoadVertex?: (index: number | null) => void
  onRoadPolygonChange?: (id: string, polygon: PolygonPoint[]) => void
  roadAddPointMode?: boolean
  roadPlaceNewMode?: boolean
  onPlaceNewRoad?: (x: number, z: number) => void
}

function SceneContent({
  navigateTarget,
  onBuildingClick,
  colliderDebug = false,
  colliderEditMode = false,
  onAirWallReport,
  overrides,
  onOverridesChange,
  selectedColliderId = null,
  onSelectCollider,
  transformMode = "translate",
  newColliderCenterRef,
  placeNewMode = false,
  onPlaceNewCollider,
  onEditorEntriesChange,
  customColliderIds,
  selectedVertexIndex = null,
  onSelectVertex,
  addPointMode = false,
  roadDebug = false,
  roadDefs,
  selectedRoadId = null,
  selectedRoadVertexIndex = null,
  onSelectRoad,
  onSelectRoadVertex,
  onRoadPolygonChange,
  roadAddPointMode = false,
  roadPlaceNewMode = false,
  onPlaceNewRoad,
}: CampusSceneProps) {
  const [baseCollision, setBaseCollision] = useState<CampusCollisionData | null>(null)
  const [colliders, setColliders] = useState<CampusCollisionData["obstacles"]>([])
  const [polygonColliders, setPolygonColliders] = useState<PolygonPoint[][]>([])
  const [lakeObstacles, setLakeObstacles] = useState<CampusCollisionData["lakeObstacles"]>([])
  const [lakePolygonObstacles, setLakePolygonObstacles] = useState<PolygonPoint[][]>([])
  const [walkSurfaces, setWalkSurfaces] = useState<CampusWalkSurface[]>([])
  const [walkSurfaceMeshes, setWalkSurfaceMeshes] = useState<Map<string, THREE.Mesh>>(
    () => new Map(),
  )
  const [airWallReport, setAirWallReport] = useState<AirWallReport | null>(null)
  const glbRootRef = useRef<THREE.Group>(null)
  const playerRef = useRef<THREE.Group>(null)

  // 调试：在浏览器控制台输入 __pos() 打印玩家当前位置
  if (typeof window !== "undefined") {
    ;(window as any).__pos = () => {
      if (playerRef.current) {
        const p = playerRef.current.position
        console.log(`Player position: (${p.x.toFixed(2)}, ${p.z.toFixed(2)})`)
        return `(${p.x.toFixed(2)}, ${p.z.toFixed(2)})`
      }
      return "player not ready"
    }
  }

  useFrame(() => {
    if (playerRef.current) {
      playerWorldPos.x = playerRef.current.position.x
      playerWorldPos.z = playerRef.current.position.z
    }
    if (!newColliderCenterRef || !playerRef.current) return
    newColliderCenterRef.current.x = playerRef.current.position.x
    newColliderCenterRef.current.z = playerRef.current.position.z
  })

  const workingCollision = useMemo(() => {
    if (!baseCollision || !overrides) return baseCollision
    return applyColliderOverrides(baseCollision, overrides)
  }, [baseCollision, overrides])

  const editorEntries = workingCollision?.entries ?? []
  const debugTopDownCamera = colliderDebug || colliderEditMode || roadDebug

  const handleCollidersReady = useCallback((data: CampusCollisionData, _glbRoot: THREE.Group) => {
    setBaseCollision(data)
  }, [])

  useEffect(() => {
    if (!workingCollision) return
    setColliders(workingCollision.obstacles)
    setPolygonColliders(workingCollision.polygonObstacles ?? [])
    setLakeObstacles(workingCollision.lakeObstacles)
    setLakePolygonObstacles(workingCollision.lakePolygonObstacles ?? [])
    setWalkSurfaces(workingCollision.walkSurfaces)
    setWalkSurfaceMeshes(workingCollision.meshByUuid ?? new Map())

    const root = glbRootRef.current
    if (workingCollision.entries && root && workingCollision.meshByUuid) {
      const report = buildAirWallReport(workingCollision.entries, root, workingCollision.meshByUuid)
      setAirWallReport(report)
      onAirWallReport?.(report)
      if (colliderDebug && !colliderEditMode) logAirWallReport(report)
    }

  }, [workingCollision, colliderDebug, colliderEditMode, onAirWallReport])

  useEffect(() => {
    if (workingCollision?.entries) onEditorEntriesChange?.(workingCollision.entries)
  }, [workingCollision?.entries, onEditorEntriesChange])

  // GLB 内部宿舍编号 → campusData dorm ID（GLB 模型编号 ≠ 实际楼号）
  // 空间规律：4列×~5排，每列北→南连续编号
  // 列C(x~-36):1-5  列B(x~-16):6-10  列A(x~1):11-15  列D(x~-53):16-17
  const GLB_DORM_TO_CAMPUS: Record<number, string> = {
    1: "dorm-12", 2: "dorm-11", 3: "dorm-13", 4: "dorm-14", 5: "dorm-15",
    6: "dorm-10", 7: "dorm-09", 8: "dorm-08", 9: "dorm-07", 10: "dorm-06",
    11: "dorm-01", 12: "dorm-02", 13: "dorm-03", 14: "dorm-04", 15: "dorm-05",
    16: "dorm-17", 17: "dorm-16",
  }

  // 将 GLB 碰撞条目中的实际世界坐标同步到导航搜索系统
  useEffect(() => {
    if (!workingCollision?.entries || workingCollision.entries.length === 0) return
    clearBuildingPositions()

    // 分离三类条目：GLB 宿舍 → 网格建筑（meta） → 未匹配
    const dormEntries: { num: number; center: { x: number; z: number } }[] = []
    const metaEntries = new Map<string, { x: number; z: number }>()
    const unmatchedEntries: string[] = []

    for (const entry of workingCollision.entries) {
      const dormMatch = entry.name.match(/^宿舍#(\d+)$/)
      if (dormMatch) {
        const num = Number.parseInt(dormMatch[1], 10)
        dormEntries.push({ num, center: entry.center })
        const campusId = GLB_DORM_TO_CAMPUS[num]
        if (campusId) {
          setBuildingPosition(campusId, entry.center)
        }
        continue
      }
      const meta = GLB_MESH_META[entry.name]
      if (meta?.id) {
        metaEntries.set(meta.id, entry.center)
        setBuildingPosition(meta.id, entry.center)
      } else {
        unmatchedEntries.push(entry.name)
      }
    }

    console.log(
      "[CampusScene] synced:",
      campusBuildings.filter((b) => b.id.startsWith("dorm-")).length, "dorms,",
      metaEntries.size, "named,",
      dormEntries.length, "GLB,",
      unmatchedEntries.length > 0 ? `${unmatchedEntries.length} unmatched` : "",
    )

    return () => {
      clearBuildingPositions()
    }
  }, [workingCollision?.entries])

  const handlePolygonChange = useCallback(
    (id: string, polygon: PolygonPoint[]) => {
      if (!onOverridesChange || !overrides || !baseCollision) return
      const baseEntry = baseCollision.entries?.find((e) => e.id === id)
      const next = patchColliderPolygon(overrides, id, polygon, baseEntry?.name)
      onOverridesChange(next)
      saveColliderOverrides(next)
    },
    [onOverridesChange, overrides, baseCollision],
  )

  const [targetBuildingHeight, setTargetBuildingHeight] = useState<number | null>(null)
  const [groundSurfaceY, setGroundSurfaceY] = useState(0.22)

  const handleGroundSurfaceYReady = useCallback((y: number) => {
    setGroundSurfaceY(y)
  }, [])

  useEffect(() => {
    const id = requestAnimationFrame(() => {
      if (!playerRef.current) return
      const measured = getHumanHeight(playerRef.current)
      const humanHeight = getReferenceHumanWorldHeight(measured)
      setTargetBuildingHeight(humanHeight * 2)
    })
    return () => cancelAnimationFrame(id)
  }, [])

  useEffect(() => {
    if (colliderDebug && !colliderEditMode && airWallReport) logAirWallReport(airWallReport)
  }, [colliderDebug, colliderEditMode, airWallReport])

  return (
    <group name="campus-scene-root">
      <ambientLight intensity={1.2} />
      <directionalLight
        position={[40, 60, 20]}
        intensity={1.5}
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-camera-left={-120}
        shadow-camera-right={120}
        shadow-camera-top={120}
        shadow-camera-bottom={-120}
      />
      <hemisphereLight args={["#87ceeb", "#5a7a3a", 0.6]} />

      {debugTopDownCamera && <CampusDebugCamera active />}

      <GlbCampus
        ref={glbRootRef}
        onBuildingClick={onBuildingClick}
        onCollidersReady={handleCollidersReady}
        targetBuildingHeight={targetBuildingHeight}
        onGroundSurfaceYReady={handleGroundSurfaceYReady}
      />

      <CharacterController
        ref={playerRef}
        colliders={colliders}
        polygonColliders={polygonColliders}
        lakeObstacles={lakeObstacles}
        lakePolygonObstacles={lakePolygonObstacles}
        walkSurfaces={walkSurfaces}
        walkSurfaceMeshes={walkSurfaceMeshes}
        groundSurfaceY={groundSurfaceY}
        movementEnabled={!colliderEditMode && !roadDebug}
        cameraOrbitEnabled={!debugTopDownCamera}
        debugTopDownCamera={debugTopDownCamera}
      />

      <NavigateGuide
        target={navigateTarget ?? null}
        playerRef={playerRef}
        groundY={groundSurfaceY}
      />

      {colliderEditMode && (
        <>
          {placeNewMode && onPlaceNewCollider && (
            <ColliderGroundPlacer
              active
              groundY={groundSurfaceY}
              onPlace={onPlaceNewCollider}
            />
          )}
          {editorEntries.length > 0 && (
            <CampusColliderEditor
              entries={editorEntries}
              selectedId={selectedColliderId}
              selectedVertexIndex={selectedVertexIndex}
              onSelect={onSelectCollider ?? (() => {})}
              onSelectVertex={onSelectVertex ?? (() => {})}
              onPolygonChange={handlePolygonChange}
              transformMode={transformMode}
              groundY={groundSurfaceY}
              customColliderIds={customColliderIds}
              addPointMode={addPointMode}
            />
          )}
        </>
      )}

      {colliderDebug && !colliderEditMode && airWallReport && (
        <CampusColliderDebugView report={airWallReport} groundY={groundSurfaceY} />
      )}

      {/* 区域调试视图 */}

      {/* Road surfaces (always visible when roads exist) */}
      {roadDefs && roadDefs.length > 0 && (
        <RoadSurfaceLayer roads={roadDefs} groundY={groundSurfaceY} />
      )}

      {/* Road editor (debug mode) */}
      {roadDebug && roadDefs && roadDefs.length > 0 && onSelectRoad && onSelectRoadVertex && onRoadPolygonChange && (
        <RoadEditor
          roads={roadDefs}
          selectedId={selectedRoadId}
          selectedVertexIndex={selectedRoadVertexIndex}
          onSelect={onSelectRoad}
          onSelectVertex={onSelectRoadVertex}
          onPolygonChange={onRoadPolygonChange}
          groundY={groundSurfaceY}
          addPointMode={roadAddPointMode}
        />
      )}
      {roadPlaceNewMode && onPlaceNewRoad && (
        <ColliderGroundPlacer
          active
          groundY={groundSurfaceY}
          onPlace={onPlaceNewRoad}
        />
      )}

    </group>
  )
}

export function CampusScene(props: CampusSceneProps) {
  const {
    navigateTarget,
    onBuildingClick,
    colliderDebug = false,
    colliderEditMode = false,
    onAirWallReport,
    overrides,
    onOverridesChange,
    selectedColliderId,
    onSelectCollider,
    transformMode,
    newColliderCenterRef,
    placeNewMode,
    onPlaceNewCollider,
    onEditorEntriesChange,
    customColliderIds,
    selectedVertexIndex,
    onSelectVertex,
    addPointMode,
    roadDebug,
    roadDefs,
    selectedRoadId,
    selectedRoadVertexIndex,
    onSelectRoad,
    onSelectRoadVertex,
    onRoadPolygonChange,
    roadAddPointMode,
    roadPlaceNewMode,
    onPlaceNewRoad,
  } = props

  return (
    <KeyboardControls map={keyboardMap}>
      <Canvas
        shadows
        camera={{
          position: getDefaultCameraPosition(
            PLAYER_SPAWN_POSITION.x,
            PLAYER_SPAWN_POSITION.y,
            PLAYER_SPAWN_POSITION.z,
            DEFAULT_SPAWN_YAW,
          ),
          fov: 50,
          near: 0.5,
          far: 500,
        }}
        gl={{
          antialias: true,
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.2,
        }}
        style={{ width: "100%", height: "100%", position: "absolute", inset: 0 }}
      >
        <Suspense fallback={null}>
          <SceneContent
            navigateTarget={navigateTarget}
            onBuildingClick={onBuildingClick}
            colliderDebug={colliderDebug}
            colliderEditMode={colliderEditMode}
            onAirWallReport={onAirWallReport}
            overrides={overrides}
            onOverridesChange={onOverridesChange}
            selectedColliderId={selectedColliderId}
            onSelectCollider={onSelectCollider}
            transformMode={transformMode}
            newColliderCenterRef={newColliderCenterRef}
            placeNewMode={placeNewMode}
            onPlaceNewCollider={onPlaceNewCollider}
            onEditorEntriesChange={onEditorEntriesChange}
            customColliderIds={customColliderIds}
            selectedVertexIndex={selectedVertexIndex}
            onSelectVertex={onSelectVertex}
            addPointMode={addPointMode}
            roadDebug={roadDebug}
            roadDefs={roadDefs}
            selectedRoadId={selectedRoadId}
            selectedRoadVertexIndex={selectedRoadVertexIndex}
            onSelectRoad={onSelectRoad}
            onSelectRoadVertex={onSelectRoadVertex}
            onRoadPolygonChange={onRoadPolygonChange}
            roadAddPointMode={roadAddPointMode}
            roadPlaceNewMode={roadPlaceNewMode}
            onPlaceNewRoad={onPlaceNewRoad}
          />
        </Suspense>
      </Canvas>
    </KeyboardControls>
  )
}
