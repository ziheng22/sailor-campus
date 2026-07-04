import { useState, useCallback, useEffect, useMemo, useRef } from "react"
import { PLAYER_SPAWN_POSITION } from "./character/avatarConfig"
import { CampusScene } from "./scene/CampusScene"
import { CampusUI } from "./ui/CampusUI"
import { LandscapePrompt } from "./ui/LandscapePrompt"
import { IosSafariHint } from "./ui/IosSafariHint"
import { useVisualViewport } from "./ui/useVisualViewport"
import {
  syncDisplayModeFromDom,
  toggleCampusDisplay,
  type CampusDisplayMode,
} from "./utils/campusFullscreen"
import "./campusLayout.css"
import { type BuildingData } from "./data/campusData"
import { type NavigateTarget } from "./navigate/NavigateTarget"
import {
  isCampusColliderDebugEnabled,
  setCampusColliderDebugEnabled,
} from "./debug/campusColliderDebugConfig"
import {
  isCampusNameDebugEnabled,
  setCampusNameDebugEnabled,
} from "./debug/campusNameDebugConfig"
import type { AirWallReport, CampusColliderEntry } from "./debug/campusColliderTypes"
import type { ColliderTransformMode } from "./debug/CampusColliderEditor"
import {
  addCustomCollider,
  clearColliderOverrides,
  exportOverridesAsJson,
  isCustomColliderId,
  loadColliderOverrides,
  patchColliderPolygon,
  removeColliderFromOverrides,
  saveColliderOverrides,
  type ColliderOverrides,
} from "./debug/campusColliderOverrides"
import {
  aabbToPolygon,
  insertVertexAtLongestEdgeMidpoint,
  removeVertexAt,
  type PolygonPoint,
} from "./utils/colliderPolygon"
import {
  loadRoadOverrides,
  patchRoadPolygon,
  saveRoadOverrides,
  addRoad,
  removeRoad,
} from "./debug/campusRoadConfig"
import type { RoadDef, RoadOverrides } from "./debug/campusRoadTypes"

interface CampusPageProps {
  onExit: () => void
}

export function CampusPage({ onExit }: CampusPageProps) {
  const [selectedBuilding, setSelectedBuilding] = useState<BuildingData | null>(null)
  const [navigateTarget, setNavigateTarget] = useState<NavigateTarget | null>(null)
  const [displayMode, setDisplayMode] = useState<CampusDisplayMode>("normal")
  const viewport = useVisualViewport()
  const [colliderDebug, setColliderDebug] = useState(() => isCampusColliderDebugEnabled())
  const [colliderEditMode, setColliderEditMode] = useState(false)
  const [nameDebug, setNameDebug] = useState(() => isCampusNameDebugEnabled())
  const [airWallCount, setAirWallCount] = useState(0)
  const [overrides, setOverrides] = useState<ColliderOverrides>(() => loadColliderOverrides())
  const [selectedColliderId, setSelectedColliderId] = useState<string | null>(null)
  const [selectedVertexIndex, setSelectedVertexIndex] = useState<number | null>(null)
  const [transformMode, setTransformMode] = useState<ColliderTransformMode>("corners")
  const [placeNewMode, setPlaceNewMode] = useState(false)
  const [addPointMode, setAddPointMode] = useState(false)
  const [editorToast, setEditorToast] = useState<string | null>(null)
  const newColliderCenterRef = useRef({
    x: PLAYER_SPAWN_POSITION.x,
    z: PLAYER_SPAWN_POSITION.z,
  })
  const [editorEntries, setEditorEntries] = useState<CampusColliderEntry[]>([])

  // Road editor state
  const [roadDebug, setRoadDebug] = useState(false)
  const [roadOverrides, setRoadOverrides] = useState<RoadOverrides>(() => loadRoadOverrides())
  const [selectedRoadId, setSelectedRoadId] = useState<string | null>(null)
  const [selectedRoadVertexIndex, setSelectedRoadVertexIndex] = useState<number | null>(null)
  const [roadAddPointMode, setRoadAddPointMode] = useState(false)
  const [roadPlaceNewMode, setRoadPlaceNewMode] = useState(false)

  const customColliderIds = useMemo(
    () => new Set(overrides.added.map((a) => a.id)),
    [overrides.added],
  )

  const selectedEntry = useMemo(
    () => editorEntries.find((e) => e.id === selectedColliderId) ?? null,
    [editorEntries, selectedColliderId],
  )

  const patchCount = Object.keys(overrides.patches).length
  const addedCount = overrides.added.length

  const showToast = useCallback((msg: string) => {
    setEditorToast(msg)
    window.setTimeout(() => setEditorToast(null), 2200)
  }, [])

  const applyOverrides = useCallback((next: ColliderOverrides, toast?: string) => {
    setOverrides(next)
    saveColliderOverrides(next)
    if (toast) showToast(toast)
  }, [showToast])

  const selectedPolygon = useMemo(() => {
    if (!selectedEntry) return null
    return selectedEntry.polygon && selectedEntry.polygon.length >= 3
      ? selectedEntry.polygon
      : aabbToPolygon(selectedEntry.aabb)
  }, [selectedEntry])

  const patchSelectedPolygon = useCallback(
    (polygon: PolygonPoint[]) => {
      if (!selectedColliderId) return
      const next = patchColliderPolygon(
        overrides,
        selectedColliderId,
        polygon,
        selectedEntry?.name,
      )
      applyOverrides(next)
    },
    [applyOverrides, overrides, selectedColliderId, selectedEntry?.name],
  )

  const handleAddVertex = useCallback(() => {
    if (!selectedPolygon || !selectedColliderId) {
      showToast("请先选中一个碰撞区域")
      return
    }
    patchSelectedPolygon(insertVertexAtLongestEdgeMidpoint(selectedPolygon))
    setAddPointMode(true)
    setTransformMode("corners")
    showToast("已加点 · 点击边或区域可继续加")
  }, [patchSelectedPolygon, selectedColliderId, selectedPolygon, showToast])

  const handleRemoveVertex = useCallback(() => {
    if (!selectedPolygon || selectedVertexIndex === null || !selectedColliderId) {
      showToast("请先选中一个角点（白球）")
      return
    }
    if (selectedPolygon.length <= 3) {
      showToast("至少保留 3 个角点")
      return
    }
    patchSelectedPolygon(removeVertexAt(selectedPolygon, selectedVertexIndex))
    setSelectedVertexIndex(null)
    showToast("已删除角点")
  }, [patchSelectedPolygon, selectedColliderId, selectedPolygon, selectedVertexIndex, showToast])

  const handleBuildingClick = useCallback((data: BuildingData) => {
    if (colliderEditMode) return
    setSelectedBuilding(data)
  }, [colliderEditMode])

  const handleCloseInfo = useCallback(() => {
    setSelectedBuilding(null)
  }, [])

  const handleNavigate = useCallback((target: NavigateTarget) => {
    setNavigateTarget(target)
    setSelectedBuilding(null)
  }, [])

  const handleClearNavigate = useCallback(() => {
    setNavigateTarget(null)
  }, [])

  const toggleFullscreen = useCallback(async () => {
    const mode = await toggleCampusDisplay()
    setDisplayMode(mode)
  }, [])

  const exitImmersive = useCallback(() => {
    document.documentElement.classList.remove("campus-immersive")
    setDisplayMode(syncDisplayModeFromDom())
  }, [])

  useEffect(() => {
    const onFsChange = () => setDisplayMode(syncDisplayModeFromDom())
    document.addEventListener("fullscreenchange", onFsChange)
    document.addEventListener("webkitfullscreenchange", onFsChange)
    return () => {
      document.removeEventListener("fullscreenchange", onFsChange)
      document.removeEventListener("webkitfullscreenchange", onFsChange)
    }
  }, [])

  const toggleColliderDebug = useCallback(() => {
    setColliderDebug((v) => {
      const next = !v
      setCampusColliderDebugEnabled(next)
      if (!next) {
        setColliderEditMode(false)
        setPlaceNewMode(false)
      }
      return next
    })
  }, [])

  const toggleColliderEditMode = useCallback(() => {
    setColliderEditMode((v) => {
      const next = !v
      if (next) setColliderDebug(true)
      else setPlaceNewMode(false)
      return next
    })
  }, [])

  const toggleNameDebug = useCallback(() => {
    setNameDebug((v) => {
      const next = !v
      setCampusNameDebugEnabled(next)
      return next
    })
  }, [])

  const handleAirWallReport = useCallback((report: AirWallReport) => {
    setAirWallCount(report.airWallCount)
    setEditorEntries(report.entries)
  }, [])

  const handleEditorEntriesChange = useCallback((entries: CampusColliderEntry[]) => {
    setEditorEntries(entries)
  }, [])

  const createColliderAt = useCallback(
    (x: number, z: number, toast: string) => {
      const { overrides: next, id } = addCustomCollider(overrides, x, z)
      applyOverrides(next, toast)
      setSelectedColliderId(id)
      setTransformMode("corners")
      setPlaceNewMode(false)
    },
    [applyOverrides, overrides],
  )

  const handleNewAtPlayer = useCallback(() => {
    const { x, z } = newColliderCenterRef.current
    createColliderAt(x, z, "已在脚下新建碰撞框（绿色）")
  }, [createColliderAt])

  const handleStartPlaceNew = useCallback(() => {
    setPlaceNewMode(true)
    setSelectedColliderId(null)
    showToast("点击地面空白处放置新碰撞框（可拖动镜头）")
  }, [showToast])

  const handlePlaceNewCollider = useCallback(
    (x: number, z: number) => {
      createColliderAt(x, z, "已在此位置新建碰撞框（绿色）")
    },
    [createColliderAt],
  )

  const handleDeleteCollider = useCallback(() => {
    if (!selectedColliderId) {
      showToast("请先选中要删除的碰撞框")
      return
    }
    const name = selectedEntry?.name ?? selectedColliderId
    const isCustom = isCustomColliderId(selectedColliderId)
    const next = removeColliderFromOverrides(overrides, selectedColliderId)
    applyOverrides(next, isCustom ? `已删除「${name}」` : `已隐藏「${name}」（GLB 原碰撞）`)
    setSelectedColliderId(null)
    setSelectedVertexIndex(null)
  }, [applyOverrides, overrides, selectedColliderId, selectedEntry?.name, showToast])

  const handleExportJson = useCallback(() => {
    const json = exportOverridesAsJson(overrides)
    void navigator.clipboard.writeText(json)

    showToast("JSON 已复制到剪贴板")
  }, [overrides, showToast])

  const handleClearOverrides = useCallback(() => {
    if (!confirm("清空所有碰撞编辑？将恢复为 GLB 自动生成。")) return
    const empty = clearColliderOverrides()
    setOverrides(empty)
    setSelectedColliderId(null)
    setPlaceNewMode(false)
    showToast("已清空全部编辑")
  }, [showToast])

  // Road handlers
  const handleRoadPolygonChange = useCallback(
    (id: string, polygon: PolygonPoint[]) => {
      setRoadOverrides((prev) => patchRoadPolygon(prev, id, polygon))
    },
    [],
  )

  const toggleRoadDebug = useCallback(() => {
    setRoadDebug((v) => {
      if (v) {
        setRoadPlaceNewMode(false)
        setRoadAddPointMode(false)
        // Save when exiting debug mode
        setRoadOverrides((prev) => { saveRoadOverrides(prev); return prev })
      }
      return !v
    })
  }, [])

  const handleRoadAddPointToggle = useCallback(() => {
    setRoadAddPointMode((v) => !v)
    setRoadPlaceNewMode(false)
  }, [])

  const handleRoadStartPlaceNew = useCallback(() => {
    setRoadPlaceNewMode(true)
    setSelectedRoadId(null)
    setRoadAddPointMode(false)
  }, [])

  const handlePlaceNewRoad = useCallback(
    (x: number, z: number) => {
      const { overrides: next, id } = addRoad(roadOverrides, [
        { x: x - 2, z: z - 2 },
        { x: x + 2, z: z - 2 },
        { x: x + 2, z: z + 2 },
        { x: x - 2, z: z + 2 },
      ])
      setRoadOverrides(next)
      saveRoadOverrides(next)
      setSelectedRoadId(id)
      setRoadPlaceNewMode(false)
      showToast("已新建道路（可拖动角点编辑）")
    },
    [roadOverrides, showToast],
  )

  const handleDeleteRoadVertex = useCallback(() => {
    if (!selectedRoadId || selectedRoadVertexIndex === null) return
    const selectedRoad = roadOverrides.roads.find((r) => r.id === selectedRoadId)
    if (!selectedRoad) return
    if (selectedRoad.polygon.length <= 3) {
      showToast("至少保留 3 个角点")
      return
    }
    const polygon = removeVertexAt(selectedRoad.polygon, selectedRoadVertexIndex)
    const next = patchRoadPolygon(roadOverrides, selectedRoadId, polygon)
    setRoadOverrides(next)
    saveRoadOverrides(next)
    setSelectedRoadVertexIndex(null)
    showToast("已删除角点")
  }, [roadOverrides, selectedRoadId, selectedRoadVertexIndex, showToast])

  const handleDeleteRoad = useCallback(() => {
    if (!selectedRoadId) {
      showToast("请先选中要删除的道路")
      return
    }
    const name = roadOverrides.roads.find((r) => r.id === selectedRoadId)?.name ?? selectedRoadId
    const next = removeRoad(roadOverrides, selectedRoadId)
    setRoadOverrides(next)
    saveRoadOverrides(next)
    setSelectedRoadId(null)
    setSelectedRoadVertexIndex(null)
    showToast(`已删除「${name}」`)
  }, [roadOverrides, selectedRoadId, showToast])

  const selectedRoad = selectedRoadId
    ? roadOverrides.roads.find((r) => r.id === selectedRoadId) ?? null
    : null

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName
      if (tag === "INPUT" || tag === "TEXTAREA") return

      if (e.code === "KeyM" && !e.ctrlKey && !e.metaKey) {
        setNameDebug((v) => {
          const next = !v
          setCampusNameDebugEnabled(next)
          return next
        })
        return
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [
    handleDeleteCollider,
    handleAddVertex,
    handleRemoveVertex,
  ])

  return (
    <div
      className="campus-root"
      style={{
        position: "fixed",
        top: viewport.offsetTop,
        left: viewport.offsetLeft,
        width: viewport.width,
        height: viewport.height,
      }}
    >
      <LandscapePrompt />
      <IosSafariHint />
      <button
        type="button"
        className="campus-immersive-exit"
        aria-label="退出沉浸"
        onClick={exitImmersive}
      >
        退出沉浸
      </button>
      <div className="campus-scene-layer">
      <CampusScene
        navigateTarget={navigateTarget}
        onBuildingClick={handleBuildingClick}
        overrides={overrides}
        roadDebug={false}
        roadDefs={roadOverrides.roads}
      />
      </div>
      <CampusUI
        selectedBuilding={selectedBuilding}
        navigateTarget={navigateTarget}
        onNavigate={handleNavigate}
        onClearNavigate={handleClearNavigate}
        onCloseInfo={handleCloseInfo}
        onExit={onExit}
        displayMode={displayMode}
        onToggleFullscreen={toggleFullscreen}
        nameDebug={nameDebug}
        onToggleNameDebug={toggleNameDebug}
      />
    </div>
  )
}
