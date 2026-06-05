import bundledNames from "./campusNameOverrides.raw.json"
import bundledInfos from "./campusInfoOverrides.raw.json"

/** 开发模式命名调试：URL ?nameDebug=1 或 localStorage campusNameDebug=1 */
export function isCampusNameDebugEnabled(): boolean {
  if (typeof window === "undefined") return false
  try {
    const params = new URLSearchParams(window.location.search)
    if (params.get("nameDebug") === "1") return true
    if (params.get("nameDebug") === "0") return false
    if (window.localStorage.getItem("campusNameDebug") === "1") return true
  } catch {
    /* ignore */
  }
  return false
}

export function setCampusNameDebugEnabled(on: boolean): void {
  try {
    window.localStorage.setItem("campusNameDebug", on ? "1" : "0")
  } catch {
    /* ignore */
  }
}

const NAME_OVERRIDES_KEY = "campusNameOverrides"
const INFO_OVERRIDES_KEY = "campusInfoOverrides"

// ---- dev API: write back to raw.json source files ----

async function saveToDevApi(key: string, data: Record<string, string>): Promise<boolean> {
  try {
    const res = await fetch("/__dev__/campus-save", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key, data }),
    })
    return res.ok
  } catch {
    return false
  }
}

function loadJson(key: string): Record<string, string> {
  try {
    const raw = window.localStorage.getItem(key)
    if (raw) return JSON.parse(raw) as Record<string, string>
  } catch { /* ignore */ }
  return {}
}

function saveJson(key: string, data: Record<string, string>): void {
  try {
    window.localStorage.setItem(key, JSON.stringify(data))
  } catch { /* ignore */ }
  // 开发时同时写回源码 raw.json 文件，换设备/清缓存不丢失
  saveToDevApi(key, data)
}

// ---- name overrides (keyed by building id) ----

/** 加载名称覆盖：bundled raw.json（源码默认）+ localStorage（开发编辑），localStorage 优先 */
export function loadNameOverrides(): Record<string, string> {
  const merged: Record<string, string> = { ...bundledNames }
  const local = loadJson(NAME_OVERRIDES_KEY)
  return Object.assign(merged, local)
}

export function saveNameOverride(buildingId: string, newName: string): void {
  const overrides = loadNameOverrides()
  if (newName) {
    overrides[buildingId] = newName
  } else {
    delete overrides[buildingId]
  }
  saveJson(NAME_OVERRIDES_KEY, overrides)
}

// ---- info overrides (keyed by building id) ----

/** 加载简介覆盖：bundled raw.json（源码默认）+ localStorage（开发编辑），localStorage 优先 */
export function loadInfoOverrides(): Record<string, string> {
  const merged: Record<string, string> = { ...bundledInfos }
  const local = loadJson(INFO_OVERRIDES_KEY)
  return Object.assign(merged, local)
}

export function saveInfoOverride(buildingId: string, newInfo: string): void {
  const overrides = loadInfoOverrides()
  if (newInfo) {
    overrides[buildingId] = newInfo
  } else {
    delete overrides[buildingId]
  }
  saveJson(INFO_OVERRIDES_KEY, overrides)
}
