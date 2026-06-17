import { useState, useEffect } from "react"

const STORAGE_KEY = "campusHintsDismissed"

function isTouchDevice() {
  return "ontouchstart" in window || navigator.maxTouchPoints > 0
}

export function CampusHints() {
  const [show, setShow] = useState(false)
  const touch = isTouchDevice()

  useEffect(() => {
    const dismissed = localStorage.getItem(STORAGE_KEY)
    if (dismissed) return

    const timer = setTimeout(() => setShow(true), 800)
    const hide = setTimeout(() => setShow(false), 8000)

    return () => {
      clearTimeout(timer)
      clearTimeout(hide)
    }
  }, [])

  const dismiss = () => {
    setShow(false)
    localStorage.setItem(STORAGE_KEY, "1")
  }

  if (!show) return null

  return (
    <div
      data-campus-ui
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 50,
        pointerEvents: "none",
        display: "flex",
        flexDirection: "column",
        justifyContent: "flex-end",
        alignItems: "center",
        paddingBottom: "35vh",
        gap: 14,
      }}
    >
      {/* 点击建筑提示 */}
      <div
        style={{
          background: "rgba(0,0,0,0.72)",
          backdropFilter: "blur(10px)",
          borderRadius: 14,
          padding: "12px 22px",
          border: "1px solid rgba(255,255,255,0.12)",
          color: "white",
          fontSize: 14,
          textAlign: "center",
          opacity: show ? 1 : 0,
          transform: show ? "translateY(0)" : "translateY(10px)",
          transition: "all 0.5s ease",
        }}
      >
        👆 点击建筑查看详情
      </div>

      {/* 摇杆拖拽提示 — 仅移动端 */}
      {touch && (
        <div
          style={{
            background: "rgba(0,0,0,0.72)",
            backdropFilter: "blur(10px)",
            borderRadius: 14,
            padding: "12px 22px",
            border: "1px solid rgba(255,255,255,0.12)",
            color: "white",
            fontSize: 14,
            textAlign: "center",
            opacity: show ? 1 : 0,
            transform: show ? "translateY(0)" : "translateY(10px)",
            transition: "all 0.5s ease 0.15s",
          }}
        >
          🕹 拖动摇杆上方 <span style={{ letterSpacing: 2 }}>⋮⋮</span> 可移动摇杆位置
        </div>
      )}

      {/* 不再提示按钮 */}
      <button
        onClick={dismiss}
        style={{
          pointerEvents: "auto",
          background: "rgba(255,255,255,0.08)",
          border: "1px solid rgba(255,255,255,0.15)",
          borderRadius: 16,
          color: "rgba(255,255,255,0.6)",
          fontSize: 12,
          padding: "6px 16px",
          cursor: "pointer",
          marginTop: 4,
        }}
      >
        知道了
      </button>
    </div>
  )
}
