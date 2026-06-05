import { useState, useEffect, useCallback } from "react"
import { useTouchDevice } from "./useTouchDevice"

export function LandscapePrompt() {
  const isTouch = useTouchDevice()
  const [isPortrait, setIsPortrait] = useState(false)
  const [dismissed, setDismissed] = useState(false)

  const checkOrientation = useCallback(() => {
    if (typeof window === "undefined") return
    setIsPortrait(window.innerWidth < window.innerHeight)
  }, [])

  useEffect(() => {
    checkOrientation()
    window.addEventListener("resize", checkOrientation)
    window.addEventListener("orientationchange", checkOrientation)
    return () => {
      window.removeEventListener("resize", checkOrientation)
      window.removeEventListener("orientationchange", checkOrientation)
    }
  }, [checkOrientation])

  // 不是触屏设备、已经是横屏、或用户已关闭 → 不显示
  if (!isTouch || !isPortrait || dismissed) return null

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(0, 0, 0, 0.85)",
        backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
        color: "#fff",
        fontFamily: "system-ui, -apple-system, sans-serif",
        textAlign: "center",
        padding: 32,
        gap: 24,
      }}
    >
      {/* 手机旋转动画图标 */}
      <div
        style={{
          animation: "landscapeRotate 2s ease-in-out infinite",
          fontSize: 64,
          lineHeight: 1,
        }}
      >
        <style>{`
          @keyframes landscapeRotate {
            0%, 100% { transform: rotate(0deg); }
            25% { transform: rotate(0deg); }
            50% { transform: rotate(90deg); }
            75% { transform: rotate(90deg); }
          }
        `}</style>
        📱
      </div>

      <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: 1 }}>
        请旋转手机
      </div>

      <div style={{ fontSize: 15, opacity: 0.7, lineHeight: 1.8 }}>
        横屏模式体验更佳
        <br />
        将手机横过来即可开始漫游校园
      </div>

      <button
        onClick={() => setDismissed(true)}
        style={{
          marginTop: 8,
          padding: "10px 32px",
          fontSize: 14,
          color: "rgba(255,255,255,0.7)",
          background: "rgba(255,255,255,0.1)",
          border: "1px solid rgba(255,255,255,0.2)",
          borderRadius: 20,
          cursor: "pointer",
          letterSpacing: 1,
        }}
      >
        继续竖屏浏览
      </button>
    </div>
  )
}
