import { CAMPUS_GLB_SCALE } from "../scene/campusGlbScale"

export const TARGET_LOCAL_HEIGHT = 1.15

export const CHARACTER_SCALE_BASE = CAMPUS_GLB_SCALE.x * 0.09
export const CHARACTER_SCALE = CHARACTER_SCALE_BASE * 0.5

/** 世界空间脚底与 GLB 地面上表面的间隙（不改角色缩放） */
export const FEET_GROUND_CLEARANCE = 0.035

export const FLIGHT_EYE_HEIGHT_RATIO = 0.9
export const FLIGHT_HOVER_AMPLITUDE = 0.05
export const FLIGHT_PITCH_MOVING = 0.14
export const FLIGHT_PITCH_IDLE = 0.04

/**
 * 默认出生点：广播站与邮政之间，略靠广播站一侧
 * 广播站 ≈ (40.9, 81.1)，邮政 ≈ (60.4, 83.1)
 */
export const LAKE1_CENTER = { x: 52.05, z: 5.73 } as const

export const PLAYER_SPAWN_POSITION = { x: 44.85, y: 0, z: 81.25 } as const

/** 出生默认朝向：面向湖1 */
export const DEFAULT_SPAWN_YAW = Math.atan2(
  LAKE1_CENTER.x - PLAYER_SPAWN_POSITION.x,
  -(LAKE1_CENTER.z - PLAYER_SPAWN_POSITION.z),
)

export { getSpawnCameraPosition as getDefaultCameraPosition } from "./campusFollowCamera"

export function isFlyingAvatar(): boolean {
  return false
}

export function getFlightWorldY(groundSurfaceY: number): number {
  return groundSurfaceY + CHARACTER_SCALE * TARGET_LOCAL_HEIGHT * FLIGHT_EYE_HEIGHT_RATIO
}

export function getReferenceHumanWorldHeight(_measured: number): number {
  return _measured
}
