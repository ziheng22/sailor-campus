import * as THREE from "three"
import type { AABB } from "../utils/collision"
import { pointInPolygon, type PolygonPoint } from "../utils/colliderPolygon"

/** 参考局部偏移（实际机位由 DEFAULT_ORBIT_PITCH + CAMERA_FOLLOW_DISTANCE 计算） */
export const CAMERA_FOLLOW_LOCAL_OFFSET = new THREE.Vector3(0, 12, 18)

/** 默认俯仰：相对水平面仰角 33°（后上方第三人称俯视） */
export const DEFAULT_ORBIT_PITCH_DEG = 33
export const DEFAULT_ORBIT_PITCH = (DEFAULT_ORBIT_PITCH_DEG * Math.PI) / 180

/** 跟随臂长（与原先 12/18 后上方距离一致） */
export const CAMERA_FOLLOW_DISTANCE = Math.hypot(12, 18)

/** 鼠标可调的俯仰范围（弧度） */
export const CAMERA_PITCH_MIN = 0.12
export const CAMERA_PITCH_MAX = Math.PI / 2 - 0.08

/** 视线落在人物前方略高处，人物在画面偏下（与截图构图一致） */
export const CAMERA_LOOK_AT_HEIGHT = 0.85
export const CAMERA_LOOK_AHEAD = 4.5

export const CAMERA_COLLISION_MARGIN = 2.0
/** 建筑遮挡时拉近机位的平滑系数（仅碰撞缩放，避免硬切） */
export const CAMERA_COLLISION_LERP = 0.15
/** 跟随缓动（机位与注视点同系数，避免只 lerp 位置导致抖动） */
export const CAMERA_FOLLOW_SMOOTH = 0.08
/** 碰撞拉近后，与人物的最小水平距离 */
export const CAMERA_MIN_HORIZONTAL_DIST = 4

const _offset = new THREE.Vector3()
const _forward = new THREE.Vector3()
const _idealPos = new THREE.Vector3()
const _lookAt = new THREE.Vector3()

function pointInExpandedAabb(x: number, z: number, box: AABB, margin: number): boolean {
  return (
    x >= box.minX - margin &&
    x <= box.maxX + margin &&
    z >= box.minZ - margin &&
    z <= box.maxZ + margin
  )
}

function isCameraXZBlocked(
  x: number,
  z: number,
  obstacles: AABB[],
  margin: number,
  polygonObstacles?: PolygonPoint[][],
): boolean {
  for (const obs of obstacles) {
    if (pointInExpandedAabb(x, z, obs, margin)) return true
  }
  if (polygonObstacles) {
    for (const poly of polygonObstacles) {
      if (poly.length < 3) continue
      if (pointInPolygon(x, z, poly)) return true
    }
  }
  return false
}

function resolveCameraCollisionT(
  playerX: number,
  playerZ: number,
  idealX: number,
  idealZ: number,
  obstacles: AABB[],
  polygonObstacles?: PolygonPoint[][],
): number {
  const dx = idealX - playerX
  const dz = idealZ - playerZ
  const fullLen = Math.hypot(dx, dz)
  if (fullLen < 1e-4) return 1
  if (!isCameraXZBlocked(idealX, idealZ, obstacles, CAMERA_COLLISION_MARGIN, polygonObstacles)) return 1

  const minT = Math.min(1, CAMERA_MIN_HORIZONTAL_DIST / fullLen)
  let lo = minT
  let hi = 1
  for (let i = 0; i < 12; i++) {
    const mid = (lo + hi) * 0.5
    const x = playerX + dx * mid
    const z = playerZ + dz * mid
    if (isCameraXZBlocked(x, z, obstacles, CAMERA_COLLISION_MARGIN, polygonObstacles)) hi = mid
    else lo = mid
  }
  return Math.max(minT, lo - 0.02)
}

export type CameraFollowSmoothState = {
  position: THREE.Vector3
  lookAt: THREE.Vector3
  ready: boolean
}

/**
 * 第三人称平滑跟随：机位与 lookAt 用相同 alpha 缓动，保留动感且不抖。
 * collisionTRef 仅平滑建筑遮挡时的拉近比例。
 */
export function applyFollowCamera(
  camera: THREE.Camera,
  player: THREE.Object3D,
  obstacles: AABB[],
  orbitPitch: number,
  collisionTRef: { current: number },
  smooth: CameraFollowSmoothState,
  delta: number,
  polygonObstacles?: PolygonPoint[][],
): void {
  const horiz = CAMERA_FOLLOW_DISTANCE * Math.cos(orbitPitch)
  const height = CAMERA_FOLLOW_DISTANCE * Math.sin(orbitPitch)
  _offset.set(0, height, horiz).applyQuaternion(player.quaternion)
  _idealPos.copy(player.position).add(_offset)

  const targetT = resolveCameraCollisionT(
    player.position.x,
    player.position.z,
    _idealPos.x,
    _idealPos.z,
    obstacles,
    polygonObstacles,
  )
  collisionTRef.current = THREE.MathUtils.lerp(
    collisionTRef.current,
    targetT,
    CAMERA_COLLISION_LERP,
  )

  const dx = _idealPos.x - player.position.x
  const dz = _idealPos.z - player.position.z
  _idealPos.x = player.position.x + dx * collisionTRef.current
  _idealPos.z = player.position.z + dz * collisionTRef.current

  _forward.set(0, 0, -1).applyQuaternion(player.quaternion)
  _lookAt.copy(player.position)
  _lookAt.addScaledVector(_forward, CAMERA_LOOK_AHEAD)
  _lookAt.y = player.position.y + CAMERA_LOOK_AT_HEIGHT

  const alpha = 1 - Math.pow(1 - CAMERA_FOLLOW_SMOOTH, delta * 60)
  if (!smooth.ready) {
    smooth.position.copy(_idealPos)
    smooth.lookAt.copy(_lookAt)
    smooth.ready = true
  } else {
    smooth.position.lerp(_idealPos, alpha)
    smooth.lookAt.lerp(_lookAt, alpha)
  }

  camera.position.copy(smooth.position)
  camera.lookAt(smooth.lookAt)
}

/** Canvas 初始机位（spawn 朝向） */
export function getSpawnCameraPosition(
  playerX: number,
  playerY: number,
  playerZ: number,
  yaw: number,
  pitch: number = DEFAULT_ORBIT_PITCH,
): [number, number, number] {
  const sin = Math.sin(yaw)
  const cos = Math.cos(yaw)
  const horiz = CAMERA_FOLLOW_DISTANCE * Math.cos(pitch)
  const up = CAMERA_FOLLOW_DISTANCE * Math.sin(pitch)
  return [playerX + sin * horiz, playerY + up, playerZ + cos * horiz]
}
