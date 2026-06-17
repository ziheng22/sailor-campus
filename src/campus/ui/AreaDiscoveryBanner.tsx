import { useState, useEffect } from "react"

export interface AreaDiscoveryBannerProps {
  areaName: string
  icon?: string
  color?: string
  subtitle?: string
  showDuration?: number
  onDone: () => void
}

const LINE_GRADIENT =
  "linear-gradient(to right, transparent 0%, currentColor 30%, currentColor 70%, transparent 100%)"

export function AreaDiscoveryBanner({
  areaName,
  icon = "📍",
  color = "#ffffff",
  subtitle = "已进入此区域",
  showDuration = 2600,
  onDone,
}: AreaDiscoveryBannerProps) {
  const [phase, setPhase] = useState<"enter" | "hold" | "exit">("enter")

  useEffect(() => {
    // enter → hold
    const holdTimer = setTimeout(() => setPhase("hold"), 500)

    // hold → exit
    const exitTimer = setTimeout(() => setPhase("exit"), showDuration)

    // exit → done
    const doneTimer = setTimeout(() => onDone(), showDuration + 500)

    return () => {
      clearTimeout(holdTimer)
      clearTimeout(exitTimer)
      clearTimeout(doneTimer)
    }
  }, [showDuration, onDone])

  const isEntering = phase === "enter"
  const isExiting = phase === "exit"

  return (
    <div
      style={{
        position: "fixed",
        top: "12vh",
        left: "50%",
        zIndex: 40,
        pointerEvents: "none",
        opacity: isExiting ? 0 : 1,
        transform: isEntering
          ? "translateX(-50%) translateY(20px)"
          : "translateX(-50%) translateY(0)",
        transition: isEntering
          ? "opacity 0.4s ease, transform 0.55s cubic-bezier(0.34, 1.56, 0.64, 1)"
          : "opacity 0.45s ease, transform 0.35s ease",
        textAlign: "center",
        whiteSpace: "nowrap",
      }}
    >
      {/* 顶部装饰线 */}
      <div
        style={{
          width: 200,
          height: 1,
          margin: "0 auto 12px",
          background: LINE_GRADIENT,
          color,
          opacity: 0.5,
        }}
      />

      {/* 图标 */}
      <div
        style={{
          fontSize: 28,
          lineHeight: 1,
          marginBottom: 10,
          filter: `drop-shadow(0 0 8px ${color}66)`,
        }}
      >
        {icon}
      </div>

      {/* 区域名 */}
      <div
        style={{
          color: "#ffffff",
          fontSize: 22,
          fontWeight: 700,
          letterSpacing: 4,
          marginBottom: 6,
          textShadow: "0 2px 12px rgba(0,0,0,0.45)",
        }}
      >
        {areaName}
      </div>

      {/* 副标题 */}
      <div
        style={{
          color: "rgba(255,255,255,0.55)",
          fontSize: 12,
          letterSpacing: 2,
        }}
      >
        {subtitle}
      </div>

      {/* 底部装饰线 */}
      <div
        style={{
          width: 200,
          height: 1,
          margin: "12px auto 0",
          background: LINE_GRADIENT,
          color,
          opacity: 0.5,
        }}
      />
    </div>
  )
}
