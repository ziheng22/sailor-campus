import { useState, useEffect } from "react"
import { type BuildingData } from "../data/campusData"
import {
  loadNameOverrides,
  loadInfoOverrides,
  saveNameOverride,
  saveInfoOverride,
} from "../debug/campusNameDebugConfig"

interface Props {
  data: BuildingData
  onClose: () => void
  /** 命名调试模式：允许直接编辑名称和简介 */
  nameDebug?: boolean
}

export function BuildingInfoPanel({ data, onClose, nameDebug = false }: Props) {
  const [editName, setEditName] = useState(false)
  const [editInfo, setEditInfo] = useState(false)
  const [nameDraft, setNameDraft] = useState(data.name)
  const [infoDraft, setInfoDraft] = useState(data.info)

  // 同步外部 data 变化（切换建筑时）
  useEffect(() => {
    setNameDraft(data.name)
    setInfoDraft(data.info)
    setEditName(false)
    setEditInfo(false)
  }, [data.id, data.name, data.info])

  const displayName = loadNameOverrides()[data.id] || data.name
  const displayInfo = loadInfoOverrides()[data.id] || data.info

  const handleSaveName = () => {
    const trimmed = nameDraft.trim()
    if (trimmed && trimmed !== data.name) {
      saveNameOverride(data.id, trimmed)
    } else {
      saveNameOverride(data.id, "")
    }
    setEditName(false)
  }

  const handleSaveInfo = () => {
    const trimmed = infoDraft.trim()
    if (trimmed && trimmed !== data.info) {
      saveInfoOverride(data.id, trimmed)
    } else {
      saveInfoOverride(data.id, "")
    }
    setEditInfo(false)
  }

  const handleNameKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleSaveName()
    if (e.key === "Escape") {
      setNameDraft(loadNameOverrides()[data.id] || data.name)
      setEditName(false)
    }
  }

  const handleInfoKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && e.ctrlKey) handleSaveInfo()
    if (e.key === "Escape") {
      setInfoDraft(loadInfoOverrides()[data.id] || data.info)
      setEditInfo(false)
    }
  }

  return (
    <div style={{
      position: "fixed", bottom: 30, left: "50%", transform: "translateX(-50%)",
      zIndex: 20, background: "rgba(30,30,30,0.92)", color: "white",
      borderRadius: 16, padding: "20px 28px", maxWidth: 420, minWidth: 300,
      backdropFilter: "blur(12px)", fontFamily: "system-ui, sans-serif",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        {nameDebug && editName ? (
          <input
            autoFocus
            value={nameDraft}
            onChange={(e) => setNameDraft(e.target.value)}
            onBlur={handleSaveName}
            onKeyDown={handleNameKey}
            style={{
              fontSize: 18,
              fontWeight: 700,
              background: "rgba(255,255,255,0.1)",
              border: "1px solid #ffcc00",
              borderRadius: 6,
              color: "#ffcc00",
              padding: "3px 8px",
              width: 180,
              outline: "none",
            }}
          />
        ) : (
          <h3
            onClick={nameDebug ? () => {
              setNameDraft(loadNameOverrides()[data.id] || data.name)
              setEditName(true)
            } : undefined}
            title={nameDebug ? "点击编辑名称" : undefined}
            style={{
              margin: 0,
              fontSize: 18,
              cursor: nameDebug ? "text" : "default",
              borderBottom: nameDebug ? "1px dashed rgba(255,204,0,0.3)" : "none",
              padding: nameDebug ? "2px 6px" : 0,
              borderRadius: 4,
              transition: "background 0.15s",
            }}
            onMouseEnter={nameDebug ? (e) => { (e.target as HTMLElement).style.background = "rgba(255,255,255,0.06)" } : undefined}
            onMouseLeave={nameDebug ? (e) => { (e.target as HTMLElement).style.background = "transparent" } : undefined}
          >
            {displayName}
          </h3>
        )}
        <button
          onClick={onClose}
          style={{
            background: "rgba(255,255,255,0.15)", border: "none", color: "white",
            borderRadius: "50%", width: 28, height: 28, cursor: "pointer",
            fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center",
          }}
        >
          ✕
        </button>
      </div>

      {nameDebug && editInfo ? (
        <textarea
          autoFocus
          value={infoDraft}
          onChange={(e) => setInfoDraft(e.target.value)}
          onBlur={handleSaveInfo}
          onKeyDown={handleInfoKey}
          rows={3}
          style={{
            fontSize: 14,
            lineHeight: 1.5,
            background: "rgba(255,255,255,0.1)",
            border: "1px solid #ffcc00",
            borderRadius: 6,
            color: "#ffcc00",
            padding: "6px 8px",
            width: "100%",
            resize: "vertical",
            outline: "none",
            margin: "8px 0",
            fontFamily: "inherit",
          }}
        />
      ) : (
        <p
          onClick={nameDebug ? () => {
            setInfoDraft(loadInfoOverrides()[data.id] || data.info)
            setEditInfo(true)
          } : undefined}
          title={nameDebug ? "点击编辑简介（Ctrl+Enter 保存）" : undefined}
          style={{
            margin: "8px 0",
            fontSize: 14,
            lineHeight: 1.5,
            opacity: 0.85,
            cursor: nameDebug ? "text" : "default",
            borderBottom: nameDebug ? "1px dashed rgba(255,204,0,0.2)" : "none",
            padding: nameDebug ? "4px 6px" : 0,
            borderRadius: 4,
            transition: "background 0.15s",
          }}
          onMouseEnter={nameDebug ? (e) => { (e.target as HTMLElement).style.background = "rgba(255,255,255,0.05)" } : undefined}
          onMouseLeave={nameDebug ? (e) => { (e.target as HTMLElement).style.background = "transparent" } : undefined}
        >
          {displayInfo}
        </p>
      )}

    </div>
  )
}
