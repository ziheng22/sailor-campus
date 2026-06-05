const IMMERSIVE_CLASS = "campus-immersive"

export type CampusDisplayMode = "normal" | "native" | "immersive"

export function isStandaloneDisplay(): boolean {
  const nav = navigator as Navigator & { standalone?: boolean }
  return (
    nav.standalone === true ||
    window.matchMedia("(display-mode: standalone)").matches
  )
}

export function isIosDevice(): boolean {
  return /iphone|ipad|ipod/i.test(navigator.userAgent)
}

/** iPhone Safari 不支持对页面元素 requestFullscreen，仅 iPad/桌面等可用 */
export function canNativePageFullscreen(): boolean {
  const el = document.documentElement as HTMLElement & {
    webkitRequestFullscreen?: () => Promise<void>
  }
  const hasApi =
    typeof el.requestFullscreen === "function" ||
    typeof el.webkitRequestFullscreen === "function"
  return hasApi && !(isIosDevice() && /iphone|ipod/i.test(navigator.userAgent))
}

export function getCampusDisplayMode(): CampusDisplayMode {
  if (document.fullscreenElement) return "native"
  if (document.documentElement.classList.contains(IMMERSIVE_CLASS)) {
    return "immersive"
  }
  return "normal"
}

export function setCampusImmersive(on: boolean): void {
  document.documentElement.classList.toggle(IMMERSIVE_CLASS, on)
}

async function requestNativeFullscreen(): Promise<boolean> {
  const el = document.documentElement as HTMLElement & {
    webkitRequestFullscreen?: () => Promise<void>
  }
  try {
    if (el.requestFullscreen) {
      await el.requestFullscreen()
    } else if (el.webkitRequestFullscreen) {
      await el.webkitRequestFullscreen()
    } else {
      return false
    }
    return !!document.fullscreenElement
  } catch {
    return false
  }
}

/** 全屏 API 失败时切换沉浸（隐藏顶栏） */
export async function toggleCampusDisplay(): Promise<CampusDisplayMode> {
  if (document.fullscreenElement) {
    await document.exitFullscreen()
    return "normal"
  }
  if (canNativePageFullscreen()) {
    const ok = await requestNativeFullscreen()
    if (ok) return "native"
  }
  const nextImmersive = !document.documentElement.classList.contains(IMMERSIVE_CLASS)
  setCampusImmersive(nextImmersive)
  return nextImmersive ? "immersive" : "normal"
}

export function syncDisplayModeFromDom(): CampusDisplayMode {
  return getCampusDisplayMode()
}
