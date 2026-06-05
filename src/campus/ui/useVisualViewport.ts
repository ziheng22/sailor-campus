import { useEffect, useState } from "react"

export interface VisualViewportSize {
  width: number
  height: number
  offsetTop: number
  offsetLeft: number
}

function readViewport(): VisualViewportSize {
  const vv = window.visualViewport
  if (!vv) {
    return {
      width: window.innerWidth,
      height: window.innerHeight,
      offsetTop: 0,
      offsetLeft: 0,
    }
  }
  return {
    width: vv.width,
    height: vv.height,
    offsetTop: vv.offsetTop,
    offsetLeft: vv.offsetLeft,
  }
}

/** 与 Safari 地址栏/底栏同步的可视区域（避免 100vh 被挡） */
export function useVisualViewport(): VisualViewportSize {
  const [size, setSize] = useState(readViewport)

  useEffect(() => {
    const update = () => setSize(readViewport())
    update()
    const vv = window.visualViewport
    vv?.addEventListener("resize", update)
    vv?.addEventListener("scroll", update)
    window.addEventListener("resize", update)
    window.addEventListener("orientationchange", update)
    return () => {
      vv?.removeEventListener("resize", update)
      vv?.removeEventListener("scroll", update)
      window.removeEventListener("resize", update)
      window.removeEventListener("orientationchange", update)
    }
  }, [])

  return size
}
