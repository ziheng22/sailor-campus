import { type BuildingData } from "../data/campusData"
import { type NavigateTarget } from "../navigate/NavigateTarget"
import { BuildingInfoPanel } from "./BuildingInfoPanel"
import { NavigateInput } from "./NavigateInput"
import { AreaHUD } from "./AreaHUD"
import { CampusHints } from "./CampusHints"
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
  nameDebug?: boolean
  onToggleNameDebug?: () => void
}

export function CampusUI(props: CampusUIProps) {
  const {
    selectedBuilding, navigateTarget, onNavigate, onClearNavigate,
    onCloseInfo, onExit,
    displayMode, onToggleFullscreen,
    nameDebug = false,
    onToggleNameDebug,
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
      {/* 区域感应 HUD */}
      <AreaHUD />

      {/* 首次进入提示 */}
      <CampusHints />

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
          {nameDebug && onToggleNameDebug && (
            <button
              type="button"
              aria-pressed={nameDebug}
              onClick={onToggleNameDebug}
              title="管理员模式"
              style={{
                background: "rgba(255,204,0,0.85)",
                color: "#111",
                border: "none",
                borderRadius: 20,
                padding: "6px 14px",
                fontSize: 13,
                cursor: "pointer",
                fontWeight: 700,
              }}
            >
              ✏️ 编辑中
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
