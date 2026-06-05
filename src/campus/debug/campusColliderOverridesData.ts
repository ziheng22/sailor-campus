import type { ColliderOverrides } from "./campusColliderOverrides"
import bundled from "./campusColliderOverrides.raw.json"

/** 已审核的碰撞覆盖（来自编辑器导出，全员默认生效） */
export const BUNDLED_COLLIDER_OVERRIDES = bundled as ColliderOverrides
