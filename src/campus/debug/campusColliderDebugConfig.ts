/** 开发模式碰撞调试：URL ?colliderDebug=1 或 localStorage campusColliderDebug=1 */
export function isCampusColliderDebugEnabled(): boolean {
  if (typeof window === "undefined") return false
  try {
    const params = new URLSearchParams(window.location.search)
    if (params.get("colliderDebug") === "1") return true
    if (params.get("colliderDebug") === "0") return false
    if (window.localStorage.getItem("campusColliderDebug") === "1") return true
  } catch {
    /* ignore */
  }
  return false
}

export function setCampusColliderDebugEnabled(on: boolean): void {
  try {
    window.localStorage.setItem("campusColliderDebug", on ? "1" : "0")
  } catch {
    /* ignore */
  }
}
