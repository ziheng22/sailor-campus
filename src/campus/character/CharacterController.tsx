import { forwardRef, useRef, useEffect, useState, useImperativeHandle } from "react"
import { useFrame, useThree } from "@react-three/fiber"
import { useKeyboardControls } from "@react-three/drei"
import * as THREE from "three"
import { Character } from "./Character"
import {
  buildActiveObstacles,
  buildActivePolygonObstacles,
  resolveWalkSurfaceY,
  type CampusWalkSurface,
} from "../scene/glbBuildingScale"
import { resolveCollisionMixed, type AABB } from "../utils/collision"
import type { PolygonPoint } from "../utils/colliderPolygon"
import { getCampusJoystickInput } from "../ui/campusJoystickInput"
import {
  applyFollowCamera,
  CAMERA_PITCH_MAX,
  CAMERA_PITCH_MIN,
  DEFAULT_ORBIT_PITCH,
  type CameraFollowSmoothState,
} from "./campusFollowCamera"
import {
  CHARACTER_SCALE,
  DEFAULT_SPAWN_YAW,
  FEET_GROUND_CLEARANCE,
  PLAYER_SPAWN_POSITION,
} from "./avatarConfig"
import { useCampusCameraOrbit } from "./useCampusCameraOrbit"

const MOVE_SPEED = 16
const TURN_SPEED = Math.PI * 0.5
const PLAYER_RADIUS = 0.75
const DEFAULT_GROUND_Y = 0.22

interface CharacterControllerProps {
  colliders: AABB[]
  polygonColliders?: PolygonPoint[][]
  lakeObstacles?: AABB[]
  lakePolygonObstacles?: PolygonPoint[][]
  walkSurfaces?: CampusWalkSurface[]
  walkSurfaceMeshes?: Map<string, THREE.Mesh>
  groundSurfaceY?: number
  movementEnabled?: boolean
  cameraOrbitEnabled?: boolean
  debugTopDownCamera?: boolean
}

export const CharacterController = forwardRef<THREE.Group, CharacterControllerProps>(
  function CharacterController(
    {
      colliders,
      polygonColliders = [],
      lakeObstacles = [],
      lakePolygonObstacles = [],
      walkSurfaces = [],
      walkSurfaceMeshes,
      groundSurfaceY = DEFAULT_GROUND_Y,
      movementEnabled = true,
      cameraOrbitEnabled = true,
      debugTopDownCamera = false,
    },
    ref,
  ) {
    const groupRef = useRef<THREE.Group>(null)
    useImperativeHandle(ref, () => groupRef.current as THREE.Group)

    const isMovingRef = useRef(false)
    const [isMoving, setIsMoving] = useState(false)
    const groundYRef = useRef(groundSurfaceY)
    const walkSurfacesRef = useRef(walkSurfaces)
    const walkSurfaceMeshesRef = useRef(walkSurfaceMeshes)
    const lakeObstaclesRef = useRef(lakeObstacles)
    const lakePolygonObstaclesRef = useRef(lakePolygonObstacles)
    const polygonCollidersRef = useRef(polygonColliders)
    const collidersRef = useRef(colliders)
    groundYRef.current = groundSurfaceY
    walkSurfacesRef.current = walkSurfaces
    walkSurfaceMeshesRef.current = walkSurfaceMeshes
    lakeObstaclesRef.current = lakeObstacles
    lakePolygonObstaclesRef.current = lakePolygonObstacles
    polygonCollidersRef.current = polygonColliders
    collidersRef.current = colliders

    const { camera, gl } = useThree()
    const [, getKeys] = useKeyboardControls()
    const orbitPitchRef = useRef(DEFAULT_ORBIT_PITCH)
    const cameraCollisionTRef = useRef(1)
    const cameraSmoothRef = useRef<CameraFollowSmoothState>({
      position: new THREE.Vector3(),
      lookAt: new THREE.Vector3(),
      ready: false,
    })
    const footBelowRootRef = useRef<number | null>(null)
    const groundYSmoothRef = useRef(groundSurfaceY)

    useEffect(() => {
      footBelowRootRef.current = null
      orbitPitchRef.current = DEFAULT_ORBIT_PITCH
      cameraCollisionTRef.current = 1
      cameraSmoothRef.current.ready = false
    }, [])

    useEffect(() => {
      cameraSmoothRef.current.ready = false
    }, [debugTopDownCamera])

    useCampusCameraOrbit(
      groupRef,
      orbitPitchRef,
      CAMERA_PITCH_MIN,
      CAMERA_PITCH_MAX,
      gl.domElement,
      cameraOrbitEnabled && !debugTopDownCamera,
    )

    useEffect(() => {
      if (!groupRef.current) return
      const p = groupRef.current.position
      const surfaceY = resolveWalkSurfaceY(
        p.x,
        p.z,
        groundYRef.current,
        walkSurfacesRef.current,
        walkSurfaceMeshesRef.current,
      )
      if (footBelowRootRef.current === null) {
        groupRef.current.updateWorldMatrix(true, false)
        const box = new THREE.Box3().setFromObject(groupRef.current)
        footBelowRootRef.current = box.min.y - groupRef.current.position.y
      }
      groupRef.current.position.y =
        surfaceY - footBelowRootRef.current + FEET_GROUND_CLEARANCE
    }, [walkSurfaces])

    useFrame((_, delta) => {
      const player = groupRef.current
      if (!player) return

      // 输入框聚焦时不处理 WASD，避免打字时角色移动
      const activeTag = (document.activeElement?.tagName ?? "").toLowerCase()
      const isInputFocused = activeTag === "input" || activeTag === "textarea" || activeTag === "select"

      const keys = getKeys() as Record<string, boolean>
      if (movementEnabled && !isInputFocused) {
        let turnDir = 0
        if (keys.left) turnDir += 1
        if (keys.right) turnDir -= 1
        player.rotation.y += turnDir * TURN_SPEED * delta

        const moveVec = new THREE.Vector3()
        const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(player.quaternion)
        const right = new THREE.Vector3(1, 0, 0).applyQuaternion(player.quaternion)
        if (keys.forward) moveVec.add(forward)
        if (keys.backward) moveVec.sub(forward)

        const { x: joyX, z: joyZ } = getCampusJoystickInput()
        if (Math.abs(joyX) > 0.01 || Math.abs(joyZ) > 0.01) {
          moveVec.add(forward.clone().multiplyScalar(-joyZ))
          moveVec.add(right.clone().multiplyScalar(joyX))
        }

        const moving = moveVec.lengthSq() > 1e-6
        if (moving !== isMovingRef.current) {
          isMovingRef.current = moving
          setIsMoving(moving)
        }

        if (moving) {
          moveVec.normalize()
          const moveDist = MOVE_SPEED * delta
          const stepX = moveVec.x * moveDist
          const stepZ = moveVec.z * moveDist

          // 最终目标位置（用于桥面/湖面判定，避免分子步时中间位置被湖障碍阻挡）
          const finalX = player.position.x + stepX
          const finalZ = player.position.z + stepZ
          const activeObstacles = buildActiveObstacles(
            finalX,
            finalZ,
            collidersRef.current,
            lakeObstaclesRef.current,
            walkSurfacesRef.current,
            walkSurfaceMeshesRef.current,
          )
          const activePolygons = buildActivePolygonObstacles(
            finalX,
            finalZ,
            polygonCollidersRef.current,
            lakePolygonObstaclesRef.current,
            walkSurfacesRef.current,
            walkSurfaceMeshesRef.current,
          )

          // 子步长碰撞：防止低帧率下穿透薄墙
          const maxSafeStep = PLAYER_RADIUS * 0.5
          const subSteps = moveDist > maxSafeStep
            ? Math.min(Math.ceil(moveDist / maxSafeStep), 10)
            : 1
          const subStepDist = moveDist / subSteps

          let curX = player.position.x
          let curZ = player.position.z

          for (let s = 0; s < subSteps; s++) {
            const nextX = curX + stepX / subSteps
            const nextZ = curZ + stepZ / subSteps
            const resolved = resolveCollisionMixed(
              { x: nextX, z: nextZ },
              PLAYER_RADIUS,
              activeObstacles,
              activePolygons,
              subStepDist,
            )
            curX = resolved.x
            curZ = resolved.z
          }

          player.position.x = curX
          player.position.z = curZ
        }
      }

      const surfaceY = resolveWalkSurfaceY(
        player.position.x,
        player.position.z,
        groundYRef.current,
        walkSurfacesRef.current,
        walkSurfaceMeshesRef.current,
      )
      if (footBelowRootRef.current === null) {
        player.updateWorldMatrix(true, false)
        const box = new THREE.Box3().setFromObject(player)
        footBelowRootRef.current = box.min.y - player.position.y
        groundYSmoothRef.current = surfaceY
      }
      groundYSmoothRef.current = THREE.MathUtils.lerp(
        groundYSmoothRef.current,
        surfaceY,
        Math.min(1, delta * 16),
      )
      player.position.y =
        groundYSmoothRef.current - footBelowRootRef.current + FEET_GROUND_CLEARANCE

      if (!debugTopDownCamera) {
        applyFollowCamera(
          camera,
          player,
          collidersRef.current,
          orbitPitchRef.current,
          cameraCollisionTRef,
          cameraSmoothRef.current,
          delta,
          polygonCollidersRef.current,
        )
      }
    })

    return (
      <group
        ref={groupRef}
        name="campus-player"
        userData={{ isCampusPlayer: true }}
        position={[PLAYER_SPAWN_POSITION.x, 0, PLAYER_SPAWN_POSITION.z]}
        rotation={[0, DEFAULT_SPAWN_YAW, 0]}
        scale={CHARACTER_SCALE}
      >
        <Character isMoving={isMoving} />
      </group>
    )
  },
)
