import { useState, useEffect } from "react"
import { isIosDevice, isStandaloneDisplay } from "../utils/campusFullscreen"
import { useTouchDevice } from "./useTouchDevice"

const STORAGE_KEY = "campus-ios-hint-dismissed"

export function IosSafariHint() {
  const isTouch = useTouchDevice()
  // null = 尚未确定；true/false = 已确定
  const [iosReady, setIosReady] = useState<boolean | null>(null)
  const [dismissed, setDismissed] = useState(false)
  const [landscape, setLandscape] = useState(false)

  useEffect(() => {
    // 等 isTouch 确定后再判定，避免首次渲染漏过
    if (isTouch && isIosDevice() && !isStandaloneDisplay()) {
      setIosReady(true)
      setDismissed(localStorage.getItem(STORAGE_KEY) === "1")
    } else {
      setIosReady(false)
    }
    const check = () => setLandscape(window.innerWidth > window.innerHeight)
    check()
    window.addEventListener("resize", check)
    window.addEventListener("orientationchange", check)
    return () => {
      window.removeEventListener("resize", check)
      window.removeEventListener("orientationchange", check)
    }
  }, [isTouch])

  // 还没确定就不渲染，避免闪一下
  if (iosReady === null) return null
  // 非 iOS / 已 PWA / 已关闭 / 竖屏时等旋转后再提示
  if (!iosReady || dismissed || !landscape) return null

  const handleDismiss = () => {
    localStorage.setItem(STORAGE_KEY, "1")
    setDismissed(true)
  }

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 10000,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(0, 0, 0, 0.88)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        color: "#fff",
        fontFamily: "system-ui, -apple-system, sans-serif",
        textAlign: "center",
        padding: 32,
        gap: 20,
      }}
    >
      {/* Safari 分享按钮示意 */}
      <div style={{ position: "relative", width: 80, height: 80 }}>
        <div
          style={{
            width: 80,
            height: 80,
            borderRadius: 20,
            background: "#007aff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round">
            <rect x="4" y="2" width="16" height="20" rx="3" />
            <line x1="12" y1="7" x2="12" y2="15" />
            <polyline points="8 12 12 8 16 12" />
          </svg>
        </div>
        {/* 脉冲光圈 */}
        <div
          style={{
            position: "absolute",
            top: -8,
            left: -8,
            width: 96,
            height: 96,
            borderRadius: 24,
            border: "2px solid rgba(0,122,255,0.4)",
            animation: "iosPulse 2s ease-out infinite",
          }}
        />
        <style>{`
          @keyframes iosPulse {
            0% { transform: scale(0.9); opacity: 1; }
            100% { transform: scale(1.25); opacity: 0; }
          }
        `}</style>
      </div>

      <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: 0.5 }}>
        添加到主屏幕
      </div>

      <div style={{ fontSize: 15, opacity: 0.75, lineHeight: 1.8, maxWidth: 280 }}>
        点击 Safari 工具栏的
        <span style={{
          display: "inline-flex",
          verticalAlign: "middle",
          margin: "0 4px",
          width: 22,
          height: 22,
          borderRadius: 5,
          background: "#007aff",
          alignItems: "center",
          justifyContent: "center",
        }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round">
            <rect x="4" y="2" width="16" height="20" rx="3" />
            <line x1="12" y1="8" x2="12" y2="18" />
            <polyline points="8 14 12 10 16 14" />
          </svg>
        </span>
        <b>分享</b> → <b>"添加到主屏幕"</b>
        <br />
        即可像 App 一样全屏沉浸体验校园
      </div>

      <div style={{
        fontSize: 13,
        opacity: 0.6,
        background: "rgba(255,255,255,0.08)",
        padding: "8px 16px",
        borderRadius: 12,
      }}>
        💡 添加后横屏使用效果最佳
      </div>

      <button
        onClick={handleDismiss}
        style={{
          marginTop: 8,
          padding: "12px 40px",
          fontSize: 15,
          fontWeight: 600,
          color: "#fff",
          background: "#007aff",
          border: "none",
          borderRadius: 24,
          cursor: "pointer",
          letterSpacing: 0.5,
        }}
      >
        知道了
      </button>
    </div>
  )
}
