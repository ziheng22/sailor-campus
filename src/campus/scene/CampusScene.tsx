import { Suspense, type MutableRefObject } from "react"
import { Canvas } from "@react-three/fiber"
import { KeyboardControls } from "@react-three/drei"
import * as THREE from "three"
import { SceneContent } from "./SceneContent"
import { type BuildingData } from "../data/campusData"
import type { AirWallReport } from "../debug/campusColliderTypes"
import type { PolygonPoint } from "../utils/colliderPolygon"
import type { ColliderOverrides } from "../debug/campusColliderOverrides"
import type { ColliderTransformMode } from "../debug/CampusColliderEditor"
import type { CampusColliderEntry } from "../debug/campusColliderTypes"
import type { RoadDef } from "../debug/campusRoadTypes"
import type { NavigateTarget } from "../navigate/NavigateTarget"
import {
  DEFAULT_SPAWN_YAW,
  getDefaultCameraPosition,
  PLAYER_SPAWN_POSITION,
} from "../character/avatarConfig"

const keyboardMap = [
  { name: "forward", keys: ["KeyW", "ArrowUp"] },
  { name: "backward", keys: ["KeyS", "ArrowDown"] },
  { name: "left", keys: ["KeyA", "ArrowLeft"] },
  { name: "right", keys: ["KeyD", "ArrowRight"] },
]

export interface CampusSceneProps {
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
