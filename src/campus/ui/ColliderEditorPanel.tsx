import type { CSSProperties } from "react"
import type { CampusColliderEntry } from "../debug/campusColliderTypes"
import type { ColliderTransformMode } from "../debug/CampusColliderEditor"

interface ColliderEditorPanelProps {
  selectedEntry: CampusColliderEntry | null
  transformMode: ColliderTransformMode
  placeNewMode: boolean
  addPointMode: boolean
  selectedVertexIndex: number | null
  vertexCount: number
  onTransformModeChange: (mode: ColliderTransformMode) => void
  onStartPlaceNew: () => void
  onNewAtPlayer: () => void
  onCancelPlaceNew: () => void
  onToggleAddPointMode: () => void
  onAddVertex: () => void
  onRemoveVertex: () => void
  onDelete: () => void
  onSave: () => void
  onExportJson: () => void
  onClear: () => void
  patchCount: number
  addedCount: number
}

export function ColliderEditorPanel({
  selectedEntry,
  transformMode,
  placeNewMode,
  addPointMode,
  selectedVertexIndex,
  vertexCount,
  onTransformModeChange,
  onStartPlaceNew,
  onNewAtPlayer,
  onCancelPlaceNew,
  onToggleAddPointMode,
  onAddVertex,
  onRemoveVertex,
  onDelete,
  onSave,
  onExportJson,
  onClear,
  patchCount,
  addedCount,
}: ColliderEditorPanelProps) {
  return (
    <div
      data-campus-ui
      style={{
        position: "fixed",
        left: 12,
        bottom: 12,
        zIndex: 20,
        width: 310,
        background: "rgba(0,0,0,0.82)",
        color: "#fff",
        borderRadius: 10,
        padding: "12px 14px",
        fontSize: 13,
        lineHeight: 1.45,
        boxShadow: "0 4px 20px rgba(0,0,0,0.45)",
        pointerEvents: "auto",
      }}
    >
      <div style={{ fontWeight: 700, marginBottom: 8 }}>多边形碰撞编辑</div>

      {placeNewMode && (
        <div
          style={{
            marginBottom: 10,
            padding: "8px 10px",
            background: "rgba(0,230,118,0.15)",
            border: "1px solid #00e676",
            borderRadius: 6,
            fontSize: 12,
          }}
        >
          放置模式：点击地面新建（绿色多边形）
          <button type="button" onClick={onCancelPlaceNew} style={{ ...btnStyle(false), marginTop: 6, width: "100%" }}>
            取消放置 Esc
          </button>
        </div>
      )}

      {addPointMode && selectedEntry && (
        <div
          style={{
            marginBottom: 10,
            padding: "8px 10px",
            background: "rgba(74,144,217,0.15)",
            border: "1px solid #4a90d9",
            borderRadius: 6,
            fontSize: 12,
          }}
        >
          加点模式：点击边或区域添加角点
          <button
            type="button"
            onClick={onToggleAddPointMode}
            style={{ ...btnStyle(false), marginTop: 6, width: "100%" }}
          >
            退出加点 Esc
          </button>
        </div>
      )}

      <div style={{ opacity: 0.85, marginBottom: 10, fontSize: 12 }}>
        已修改 {patchCount} · 自建 {addedCount} · 当前 {vertexCount || "—"} 角点
      </div>

      {selectedEntry ? (
        <div
          style={{
            marginBottom: 10,
            padding: "8px 10px",
            background: "rgba(255,238,0,0.12)",
            border: "1px solid #ffee00",
            borderRadius: 6,
            fontSize: 12,
          }}
        >
          <div style={{ fontWeight: 600 }}>{selectedEntry.name}</div>
          <div>
            {selectedEntry.width.toFixed(1)} × {selectedEntry.depth.toFixed(1)} @ (
            {selectedEntry.center.x.toFixed(1)}, {selectedEntry.center.z.toFixed(1)})
          </div>
          {selectedVertexIndex !== null && (
            <div style={{ marginTop: 4, color: "#fff59d" }}>角点 #{selectedVertexIndex + 1} 已选中</div>
          )}
        </div>
      ) : (
        <div style={{ marginBottom: 10, opacity: 0.7, fontSize: 12 }}>未选中 · 点区域可选中</div>
      )}

      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>
        <button type="button" onClick={onStartPlaceNew} style={btnStyle(placeNewMode, "#1b5e3a")}>
          ＋ 新建 N
        </button>
        <button type="button" onClick={onNewAtPlayer} style={btnStyle(false, "#2a5a3a")}>
          脚下新建
        </button>
        <button type="button" onClick={onDelete} disabled={!selectedEntry} style={btnStyle(false, "#6b2a2a")}>
          删区域 Del
        </button>
      </div>

      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>
        <button type="button" onClick={onAddVertex} disabled={!selectedEntry} style={btnStyle(addPointMode, "#2a4a6b")}>
          加点 A
        </button>
        <button
          type="button"
          onClick={onRemoveVertex}
          disabled={!selectedEntry || selectedVertexIndex === null}
          style={btnStyle(false, "#5a3a2a")}
        >
          删角点
        </button>
        <button
          type="button"
          onClick={() => onTransformModeChange("translate")}
          style={btnStyle(transformMode === "translate")}
        >
          移动 G
        </button>
        <button
          type="button"
          onClick={() => onTransformModeChange("corners")}
          style={btnStyle(transformMode === "corners")}
        >
          拖角 S
        </button>
      </div>

      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        <button type="button" onClick={onSave} style={btnStyle(false, "#2a6b3c")}>
          保存
        </button>
        <button type="button" onClick={onExportJson} style={btnStyle(false)}>
          导出 JSON
        </button>
        <button type="button" onClick={onClear} style={btnStyle(false, "#444")}>
          清空全部
        </button>
      </div>

      <div style={{ marginTop: 10, fontSize: 11, opacity: 0.75 }}>
        俯视全图 · 滚轮缩放 · 右键/中键拖动平移 · 拖黄球改形状
      </div>
    </div>
  )
}

function btnStyle(active: boolean, bg = "rgba(255,255,255,0.12)"): CSSProperties {
  return {
    background: active ? "rgba(74,144,217,0.9)" : bg,
    color: "#fff",
    border: "none",
    borderRadius: 6,
    padding: "6px 10px",
    fontSize: 12,
    cursor: "pointer",
    opacity: 1,
  }
}
