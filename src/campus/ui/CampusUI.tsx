import { type BuildingData } from "../data/campusData"
import { type NavigateTarget } from "../navigate/NavigateTarget"
import { BuildingInfoPanel } from "./BuildingInfoPanel"
import { NavigateInput } from "./NavigateInput"
import { useState, useEffect } from "react"
import { MobileJoystick } from "./MobileJoystick"
import { TouchCameraPad } from "./TouchCameraPad"
import { useTouchDevice } from "./useTouchDevice"
import { canNativePageFullscreen, type CampusDisplayMode } from "../utils/campusFullscreen"

interface CampusUIProps {
  selectedBuilding: BuildingData | null
  navigateTarget: NavigateTarget | null
  onNavigate: (target: NavigateTarget) => void
  onClearNavigate: () => void
  onCloseInfo: () => void
  onExit: () => void
  displayMode: CampusDisplayMode
  onToggleFullscreen: () => void
  colliderDebug?: boolean
  airWallCount?: number
  onToggleColliderDebug?: () => void
  colliderEditMode?: boolean
  onToggleColliderEdit?: () => void
  onNewCollider?: () => void
  onNewColliderAtPlayer?: () => void
  onDeleteCollider?: () => void
  canDeleteCollider?: boolean
  nameDebug?: boolean
  onToggleNameDebug?: () => void
  roadDebug?: boolean
  onToggleRoadDebug?: () => void
}

export function CampusUI(props: CampusUIProps) {
  const {
    selectedBuilding, navigateTarget, onNavigate, onClearNavigate,
    onCloseInfo, onExit,
    displayMode, onToggleFullscreen,
    colliderDebug = false,
    airWallCount = 0,
    onToggleColliderDebug,
    colliderEditMode = false,
    onToggleColliderEdit,
    onNewCollider,
    onNewColliderAtPlayer,
    onDeleteCollider,
    canDeleteCollider = false,
    nameDebug = false,
    onToggleNameDebug,
    roadDebug = false,
    onToggleRoadDebug,
  } = props

  const isTouchDevice = useTouchDevice()
  const [landscape, setLandscape] = useState(false)
  const [joystickVisible, setJoystickVisible] = useState(true)

  useEffect(() => {
    const check = () => setLandscape(window.innerWidth > window.innerHeight)
    check()
    window.addEventListener("resize", check)
    window.addEventListener("orientationchange", check)
    return () => {
      window.removeEventListener("resize", check)
      window.removeEventListener("orientationchange", check)
    }
  }, [])

  const showDebugControls =
    (import.meta.env.DEV || colliderDebug) && !(isTouchDevice && landscape)

  const fullscreenLabel =
    displayMode === "native"
      ? "↙ 退出全屏"
      : displayMode === "immersive"
        ? "↙ 退出沉浸"
        : canNativePageFullscreen()
          ? "↗ 全屏"
          : "↗ 沉浸"

  return (
    <>
      {/* Top bar */}
      {isTouchDevice && <TouchCameraPad />}

      <div
        data-campus-ui
        data-campus-topbar
        style={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 10,
        display: "flex", justifyContent: "space-between", alignItems: "flex-start",
        padding: "10px 16px", pointerEvents: "none",
      }}>
        <div style={{ display: "flex", gap: 8, pointerEvents: "auto", flexShrink: 0 }}>
          <button
            className="campus-topbar-btn"
            onClick={() => { window.history.back() }}
            style={{
              background: "rgba(0,0,0,0.55)", color: "white",
              border: "none", borderRadius: 20,
              padding: "6px 14px", fontSize: 14, cursor: "pointer",
            }}
          >
            ← 返回
          </button>
          <div
            className="campus-topbar-title"
            style={{
            background: "rgba(0,0,0,0.55)", color: "white",
            padding: "6px 14px", borderRadius: 20, fontSize: 14,
          }}>
            🏫 河南牧业经济学院 英才校区
          </div>
        </div>

        <div className="campus-topbar-actions" style={{ display: "flex", gap: 8, pointerEvents: "auto" }}>
          {showDebugControls && onToggleColliderDebug && (
            <button
              type="button"
              className="campus-topbar-btn"
              aria-pressed={colliderDebug}
              onClick={onToggleColliderDebug}
              title="快捷键 C · ?colliderDebug=1"
              style={{
                background: colliderDebug ? "rgba(255,34,68,0.85)" : "rgba(0,0,0,0.55)",
                color: "white",
                border: "none",
                borderRadius: 20,
                padding: "6px 14px",
                fontSize: 13,
                cursor: "pointer",
              }}
            >
              {colliderDebug ? `碰撞 ${airWallCount} 疑墙` : "🔲 碰撞调试"}
            </button>
          )}
          {showDebugControls && onToggleNameDebug && (
            <button
              type="button"
              aria-pressed={nameDebug}
              onClick={onToggleNameDebug}
              title="快捷键 M · ?nameDebug=1"
              style={{
                background: nameDebug ? "rgba(255,204,0,0.85)" : "rgba(0,0,0,0.55)",
                color: nameDebug ? "#111" : "white",
                border: "none",
                borderRadius: 20,
                padding: "6px 14px",
                fontSize: 13,
                cursor: "pointer",
                fontWeight: nameDebug ? 700 : 400,
              }}
            >
              {nameDebug ? "✏️ 编辑中" : "🏷 命名调试"}
            </button>
          )}
          {showDebugControls && onToggleRoadDebug && (
            <button
              type="button"
              aria-pressed={roadDebug}
              onClick={onToggleRoadDebug}
              title="快捷键 T · 编辑道路"
              style={{
                background: roadDebug ? "rgba(90,90,90,0.85)" : "rgba(0,0,0,0.55)",
                color: roadDebug ? "#111" : "white",
                border: "none",
                borderRadius: 20,
                padding: "6px 14px",
                fontSize: 13,
                cursor: "pointer",
                fontWeight: roadDebug ? 700 : 400,
              }}
            >
              {roadDebug ? "🔧 编辑道路" : "🛣 道路调试"}
            </button>
          )}
          {showDebugControls && colliderDebug && onToggleColliderEdit && (
            <button
              type="button"
              aria-pressed={colliderEditMode}
              onClick={onToggleColliderEdit}
              title="快捷键 E · 点击红框移动/缩放"
              style={{
                background: colliderEditMode ? "rgba(255,238,0,0.9)" : "rgba(0,0,0,0.55)",
                color: colliderEditMode ? "#111" : "white",
                border: "none",
                borderRadius: 20,
                padding: "6px 14px",
                fontSize: 13,
                cursor: "pointer",
                fontWeight: colliderEditMode ? 700 : 400,
              }}
            >
              {colliderEditMode ? "✏️ 编辑中" : "✏️ 编辑碰撞"}
            </button>
          )}
          {colliderEditMode && onNewCollider && (
            <button
              type="button"
              onClick={onNewCollider}
              title="快捷键 N · 点击地面放置"
              style={{
                background: "rgba(0,230,118,0.85)",
                color: "#111",
                border: "none",
                borderRadius: 20,
                padding: "6px 14px",
                fontSize: 13,
                cursor: "pointer",
                fontWeight: 600,
              }}
            >
              ＋ 新建
            </button>
          )}
          {colliderEditMode && onDeleteCollider && (
            <button
              type="button"
              onClick={onDeleteCollider}
              disabled={!canDeleteCollider}
              title="快捷键 Del"
              style={{
                background: canDeleteCollider ? "rgba(180,40,40,0.9)" : "rgba(0,0,0,0.4)",
                color: "white",
                border: "none",
                borderRadius: 20,
                padding: "6px 14px",
                fontSize: 13,
                cursor: canDeleteCollider ? "pointer" : "not-allowed",
                opacity: canDeleteCollider ? 1 : 0.6,
              }}
            >
              删除
            </button>
          )}
          {isTouchDevice && (
            <button
              type="button"
              aria-pressed={joystickVisible}
              onClick={() => setJoystickVisible((v) => !v)}
              style={{
                background: joystickVisible ? "rgba(74,144,217,0.85)" : "rgba(0,0,0,0.55)",
                color: "white",
                border: "none",
                borderRadius: 20,
                padding: "8px 14px",
                fontSize: 14,
                minHeight: 36,
                cursor: "pointer",
              }}
            >
              {joystickVisible ? "隐藏摇杆" : "🕹 摇杆"}
            </button>
          )}
          <button
            onClick={onExit}
            style={{
              background: "rgba(0,0,0,0.55)", color: "white",
              border: "none", borderRadius: 20,
              padding: "6px 14px", fontSize: 14, cursor: "pointer",
            }}
          >
            ← 工作室
          </button>
          <button
            className="campus-topbar-btn"
            onClick={onToggleFullscreen}
            style={{
              background: "rgba(0,0,0,0.55)", color: "white",
              border: "none", borderRadius: 20,
              padding: "6px 14px", fontSize: 14, cursor: "pointer",
            }}
          >
            {fullscreenLabel}
          </button>
        </div>
      </div>

      {colliderDebug && !colliderEditMode && (
        <div
          data-campus-ui
          style={{
            position: "fixed",
            bottom: 14,
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 12,
            background: "rgba(0,0,0,0.72)",
            color: "#fff",
            padding: "8px 16px",
            borderRadius: 20,
            fontSize: 12,
            pointerEvents: "none",
          }}
        >
          俯视全图 · 滚轮缩放 · 右键/中键拖动平移
        </div>
      )}

      {isTouchDevice && <MobileJoystick visible={joystickVisible} />}

      {/* 导航搜索 */}
      <NavigateInput
        activeTarget={navigateTarget}
        onSelect={onNavigate}
        onClear={onClearNavigate}
      />

      {/* Building info panel */}
      {selectedBuilding && (
        <BuildingInfoPanel
          data={selectedBuilding}
          onClose={onCloseInfo}
          nameDebug={nameDebug}
        />
      )}

    </>
  )
}
