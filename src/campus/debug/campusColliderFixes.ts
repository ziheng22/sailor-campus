import type { AABB } from "../utils/collision"
import type { CampusColliderEntry } from "./campusColliderTypes"

/**
 * 从障碍列表中排除指定条目（用于手动移除空气墙后测试）。
 * 本项目无 Rapier：等价于删除 Collider / 在 collectGlbColliders 中 skip mesh。
 */
export function filterObstaclesByEntryIds(
  obstacles: AABB[],
  entries: CampusColliderEntry[],
  excludeIds: Set<string>,
): AABB[] {
  const excludeAabbs = new Set(
    entries.filter((e) => excludeIds.has(e.id) && e.layer === "obstacle").map((e) => e.aabb),
  )
  return obstacles.filter((a) => !excludeAabbs.has(a))
}

/** 按 mesh 名称排除（对应 campusColliders.ts 中加 skip 或 exclude Set） */
export const COLLIDER_EXCLUDE_MESH_NAMES = new Set<string>([
  // 示例：确认空气墙后在此添加
  // "某隐藏mesh名",
])
