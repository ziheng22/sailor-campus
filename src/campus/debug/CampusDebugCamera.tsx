import { useEffect, useRef } from "react"
import { useFrame, useThree } from "@react-three/fiber"
import * as THREE from "three"

/** 校园 GLB 地面约 220×200，原点在未名湖 */
export const CAMPUS_DEBUG_MAP_CENTER = { x: 0, z: 0 }

/** 俯视高度：能容纳整张地图 */
const DEBUG_CAMERA_HEIGHT = 200
const DEBUG_CAMERA_SMOOTH = 0.1
const DEBUG_ZOOM_MIN = 80
const DEBUG_ZOOM_MAX = 320

type DebugCameraState = {
  position: THREE.Vector3
  target: THREE.Vector3
  ready: boolean
}

const _target = new THREE.Vector3()
const _idealPos = new THREE.Vector3()

/**
 * 调试/编辑模式：正上方俯视整张校园地图
 */
export function applyDebugTopDownCamera(
  camera: THREE.Camera,
  height: number,
  panX: number,
  panZ: number,
  smooth: DebugCameraState,
  delta: number,
): void {
  const cx = CAMPUS_DEBUG_MAP_CENTER.x + panX
  const cz = CAMPUS_DEBUG_MAP_CENTER.z + panZ
  _idealPos.set(cx, height, cz)
  _target.set(cx, 0.02, cz)

  const alpha = 1 - Math.pow(1 - DEBUG_CAMERA_SMOOTH, delta * 60)
  if (!smooth.ready) {
    smooth.position.copy(_idealPos)
    smooth.target.copy(_target)
    smooth.ready = true
  } else {
    smooth.position.lerp(_idealPos, alpha)
    smooth.target.lerp(_target, alpha)
  }

  camera.position.copy(smooth.position)
  camera.lookAt(smooth.target)
}

interface CampusDebugCameraProps {
  active: boolean
}

/** 调试模式下接管相机：俯视全图，滚轮缩放，右键拖动平移 */
export function CampusDebugCamera({ active }: CampusDebugCameraProps) {
  const { camera, gl } = useThree()
  const smoothRef = useRef<DebugCameraState>({
    position: new THREE.Vector3(),
    target: new THREE.Vector3(),
    ready: false,
  })
  const heightRef = useRef(DEBUG_CAMERA_HEIGHT)
  const panRef = useRef({ x: 0, z: 0 })
  const dragRef = useRef<{ active: boolean; lastX: number; lastY: number }>({
    active: false,
    lastX: 0,
    lastY: 0,
  })

  useEffect(() => {
    smoothRef.current.ready = false
    heightRef.current = DEBUG_CAMERA_HEIGHT
    panRef.current = { x: 0, z: 0 }
  }, [active])

  useEffect(() => {
    if (!active) return
    const canvas = gl.domElement

    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      const factor = e.deltaY > 0 ? 1.08 : 0.92
      heightRef.current = THREE.MathUtils.clamp(
        heightRef.current * factor,
        DEBUG_ZOOM_MIN,
        DEBUG_ZOOM_MAX,
      )
    }

    const onPointerDown = (e: PointerEvent) => {
      if (e.button !== 2 && e.button !== 1) return
      dragRef.current = { active: true, lastX: e.clientX, lastY: e.clientY }
    }

    const onPointerMove = (e: PointerEvent) => {
      if (!dragRef.current.active) return
      const dx = e.clientX - dragRef.current.lastX
      const dy = e.clientY - dragRef.current.lastY
      dragRef.current.lastX = e.clientX
      dragRef.current.lastY = e.clientY
      const scale = heightRef.current * 0.0022
      panRef.current.x -= dx * scale
      panRef.current.z -= dy * scale
    }

    const onPointerUp = () => {
      dragRef.current.active = false
    }

    const onContextMenu = (e: Event) => e.preventDefault()

    canvas.addEventListener("wheel", onWheel, { passive: false })
    canvas.addEventListener("pointerdown", onPointerDown)
    window.addEventListener("pointermove", onPointerMove)
    window.addEventListener("pointerup", onPointerUp)
    canvas.addEventListener("contextmenu", onContextMenu)
    return () => {
      canvas.removeEventListener("wheel", onWheel)
      canvas.removeEventListener("pointerdown", onPointerDown)
      window.removeEventListener("pointermove", onPointerMove)
      window.removeEventListener("pointerup", onPointerUp)
      canvas.removeEventListener("contextmenu", onContextMenu)
    }
  }, [active, gl.domElement])

  useFrame((_, delta) => {
    if (!active) return
    applyDebugTopDownCamera(
      camera,
      heightRef.current,
      panRef.current.x,
      panRef.current.z,
      smoothRef.current,
      delta,
    )
  })

  return null
}
