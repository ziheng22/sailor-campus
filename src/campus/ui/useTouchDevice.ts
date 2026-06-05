import { useEffect, useState } from "react"

function getIsTouch(): boolean {
  if (typeof window === "undefined") return false
  const mq = window.matchMedia("(pointer: coarse)")
  return mq.matches || "ontouchstart" in window || navigator.maxTouchPoints > 0
}

export function useTouchDevice(): boolean {
  // 首帧同步初始化，避免 LandscapePrompt / IosSafariHint 第一帧漏过
  const [isTouch, setIsTouch] = useState(getIsTouch)

  useEffect(() => {
    const mq = window.matchMedia("(pointer: coarse)")
    const update = () => {
      setIsTouch(mq.matches || "ontouchstart" in window || navigator.maxTouchPoints > 0)
    }
    // 值可能已变（如模拟器切换），首次挂载时再确认一次
    update()
    mq.addEventListener("change", update)
    return () => mq.removeEventListener("change", update)
  }, [])

  return isTouch
}
