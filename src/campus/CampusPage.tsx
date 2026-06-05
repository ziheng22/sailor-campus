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
import { ColliderEditorPanel } from "./ui/ColliderEditorPanel"
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
    console.log("[Campus] 碰撞覆盖已复制到剪贴板:\n", json)
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

      if (e.code === "KeyC" && !e.ctrlKey && !e.metaKey) {
        setColliderDebug((v) => {
          const next = !v
          setCampusColliderDebugEnabled(next)
          if (!next) {
            setColliderEditMode(false)
            setPlaceNewMode(false)
          }
          return next
        })
        return
      }

      if (e.code === "KeyT" && !e.ctrlKey && !e.metaKey) {
        setRoadDebug((v) => !v)
        return
      }

      if (e.code === "KeyM" && !e.ctrlKey && !e.metaKey) {
        setNameDebug((v) => {
          const next = !v
          setCampusNameDebugEnabled(next)
          return next
        })
        return
      }

      if (!colliderEditMode && !roadDebug) {
        if (e.code === "KeyE" && colliderDebug) {
          toggleColliderEditMode()
        }
        return
      }

      // ---- collider edit shortcuts ----
      if (colliderEditMode) {
        if (e.code === "KeyE") {
          setColliderEditMode(false)
          setPlaceNewMode(false)
          return
        }
        if (e.code === "Escape") {
          if (placeNewMode) {
            setPlaceNewMode(false)
            showToast("已取消放置")
          } else if (addPointMode) {
            setAddPointMode(false)
            showToast("已退出加点模式")
          } else if (selectedVertexIndex !== null) {
            setSelectedVertexIndex(null)
          } else {
            setSelectedColliderId(null)
          }
          return
        }
        if (e.code === "KeyG") {
          setTransformMode("translate")
          setPlaceNewMode(false)
          return
        }
        if (e.code === "KeyS" && !e.ctrlKey && !e.metaKey) {
          setTransformMode("corners")
          setPlaceNewMode(false)
          return
        }
        if (e.code === "KeyA" && !e.ctrlKey && !e.metaKey) {
          setAddPointMode((v) => !v)
          if (!addPointMode) showToast("加点模式：点击边或区域添加角点")
          return
        }
        if (e.code === "KeyN") {
          handleStartPlaceNew()
          return
        }
        if (e.code === "KeyP" && e.shiftKey) {
          handleNewAtPlayer()
          return
        }
        if (e.code === "Insert" || (e.code === "Equal" && e.shiftKey)) {
          handleAddVertex()
          return
        }
        if (e.code === "Delete" || e.code === "Backspace") {
          e.preventDefault()
          if (selectedVertexIndex !== null) handleRemoveVertex()
          else handleDeleteCollider()
        }
        return
      }

      // ---- road debug shortcuts ----
      if (roadDebug) {
        if (e.code === "Escape") {
          if (roadPlaceNewMode) {
            setRoadPlaceNewMode(false)
            showToast("已取消放置道路")
          } else if (roadAddPointMode) {
            setRoadAddPointMode(false)
            showToast("已退出加点模式")
          } else if (selectedRoadVertexIndex !== null) {
            setSelectedRoadVertexIndex(null)
          } else {
            setSelectedRoadId(null)
          }
          return
        }
        if (e.code === "KeyA" && !e.ctrlKey && !e.metaKey) {
          setRoadAddPointMode((v) => !v)
          setRoadPlaceNewMode(false)
          if (!roadAddPointMode) showToast("加点模式：点击边添加角点")
          return
        }
        if (e.code === "KeyN") {
          handleRoadStartPlaceNew()
          return
        }
        if (e.code === "Delete" || e.code === "Backspace") {
          e.preventDefault()
          if (selectedRoadVertexIndex !== null) handleDeleteRoadVertex()
          else handleDeleteRoad()
        }
        return
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [
    colliderEditMode,
    colliderDebug,
    placeNewMode,
    addPointMode,
    selectedVertexIndex,
    toggleColliderEditMode,
    handleStartPlaceNew,
    handleNewAtPlayer,
    handleDeleteCollider,
    handleAddVertex,
    handleRemoveVertex,
    showToast,
    roadDebug,
    roadPlaceNewMode,
    roadAddPointMode,
    selectedRoadVertexIndex,
    handleRoadStartPlaceNew,
    handleDeleteRoadVertex,
    handleDeleteRoad,
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
        colliderDebug={colliderDebug}
        colliderEditMode={colliderEditMode}
        onAirWallReport={handleAirWallReport}
        overrides={overrides}
        onOverridesChange={setOverrides}
        selectedColliderId={selectedColliderId}
        onSelectCollider={(id) => {
          setSelectedColliderId(id)
          setSelectedVertexIndex(null)
        }}
        selectedVertexIndex={selectedVertexIndex}
        onSelectVertex={setSelectedVertexIndex}
        addPointMode={addPointMode}
        transformMode={transformMode}
        newColliderCenterRef={newColliderCenterRef}
        placeNewMode={placeNewMode}
        onPlaceNewCollider={handlePlaceNewCollider}
        onEditorEntriesChange={handleEditorEntriesChange}
        customColliderIds={customColliderIds}
        roadDebug={roadDebug}
        roadDefs={roadOverrides.roads}
        selectedRoadId={selectedRoadId}
        selectedRoadVertexIndex={selectedRoadVertexIndex}
        onSelectRoad={(id) => {
          setSelectedRoadId(id)
          setSelectedRoadVertexIndex(null)
        }}
        onSelectRoadVertex={setSelectedRoadVertexIndex}
        onRoadPolygonChange={handleRoadPolygonChange}
        roadAddPointMode={roadAddPointMode}
        roadPlaceNewMode={roadPlaceNewMode}
        onPlaceNewRoad={handlePlaceNewRoad}
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
        colliderDebug={colliderDebug}
        airWallCount={airWallCount}
        onToggleColliderDebug={toggleColliderDebug}
        colliderEditMode={colliderEditMode}
        onToggleColliderEdit={toggleColliderEditMode}
        onNewCollider={handleStartPlaceNew}
        onNewColliderAtPlayer={handleNewAtPlayer}
        onDeleteCollider={handleDeleteCollider}
        canDeleteCollider={!!selectedColliderId}
        nameDebug={nameDebug}
        onToggleNameDebug={toggleNameDebug}
        roadDebug={roadDebug}
        onToggleRoadDebug={toggleRoadDebug}
      />
      {roadDebug && (
        <div
          data-campus-ui
          style={{
            position: "fixed",
            bottom: 14,
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 22,
            background: "rgba(0,0,0,0.85)",
            color: "#fff",
            padding: "8px 18px",
            borderRadius: 20,
            fontSize: 12,
            display: "flex",
            gap: 12,
            alignItems: "center",
            flexWrap: "wrap",
            justifyContent: "center",
          }}
        >
          {selectedRoad ? (
            <>
              <span>{selectedRoad.name} · {selectedRoad.polygon.length}点</span>
              <button
                onClick={handleRoadAddPointToggle}
                style={{
                  background: roadAddPointMode ? "#ffcc00" : "rgba(255,255,255,0.15)",
                  color: roadAddPointMode ? "#111" : "#fff",
                  border: "none", borderRadius: 12, padding: "4px 10px", fontSize: 11, cursor: "pointer",
                }}
              >
                ＋ 加点
              </button>
              <button
                onClick={handleDeleteRoadVertex}
                disabled={selectedRoadVertexIndex === null}
                style={{
                  background: selectedRoadVertexIndex !== null ? "rgba(200,60,60,0.85)" : "rgba(255,255,255,0.1)",
                  color: selectedRoadVertexIndex !== null ? "#fff" : "#888",
                  border: "none", borderRadius: 12, padding: "4px 10px", fontSize: 11,
                  cursor: selectedRoadVertexIndex !== null ? "pointer" : "not-allowed",
                }}
              >
                删除点
              </button>
              <button
                onClick={handleDeleteRoad}
                disabled={!selectedRoadId}
                style={{
                  background: selectedRoadId ? "rgba(180,40,40,0.85)" : "rgba(255,255,255,0.1)",
                  color: selectedRoadId ? "#fff" : "#888",
                  border: "none", borderRadius: 12, padding: "4px 10px", fontSize: 11,
                  cursor: selectedRoadId ? "pointer" : "not-allowed",
                }}
              >
                删除道路
              </button>
            </>
          ) : (
            <span style={{ opacity: 0.7 }}>点击选中道路进行编辑</span>
          )}
          <button
            onClick={handleRoadStartPlaceNew}
            style={{
              background: roadPlaceNewMode ? "#ffcc00" : "rgba(0,200,100,0.8)",
              color: roadPlaceNewMode ? "#111" : "#fff",
              border: "none", borderRadius: 12, padding: "4px 12px", fontSize: 11, cursor: "pointer", fontWeight: 600,
            }}
          >
            {roadPlaceNewMode ? "点击地面放置..." : "＋ 新建道路"}
          </button>
        </div>
      )}
      {colliderEditMode && (
        <ColliderEditorPanel
          selectedEntry={selectedEntry}
          transformMode={transformMode}
          placeNewMode={placeNewMode}
          onTransformModeChange={setTransformMode}
          onStartPlaceNew={handleStartPlaceNew}
          onNewAtPlayer={handleNewAtPlayer}
          onCancelPlaceNew={() => setPlaceNewMode(false)}
          onDelete={handleDeleteCollider}
          onAddVertex={handleAddVertex}
          onRemoveVertex={handleRemoveVertex}
          addPointMode={addPointMode}
          onToggleAddPointMode={() => setAddPointMode((v) => !v)}
          selectedVertexIndex={selectedVertexIndex}
          vertexCount={selectedPolygon?.length ?? 0}
          onSave={() => {
            saveColliderOverrides(overrides)
            showToast("已保存到浏览器")
          }}
          onExportJson={handleExportJson}
          onClear={handleClearOverrides}
          patchCount={patchCount}
          addedCount={addedCount}
        />
      )}
      {editorToast && (
        <div
          data-campus-ui
          style={{
            position: "fixed",
            top: 56,
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 25,
            background: "rgba(0,0,0,0.88)",
            color: "#fff",
            padding: "10px 18px",
            borderRadius: 8,
            fontSize: 13,
            pointerEvents: "none",
            border: "1px solid rgba(255,238,0,0.5)",
          }}
        >
          {editorToast}
        </div>
      )}
    </div>
  )
}
