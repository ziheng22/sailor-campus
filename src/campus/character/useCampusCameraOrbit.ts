import { useEffect, type MutableRefObject, type RefObject } from "react"
import * as THREE from "three"
import { isCampusCameraBlockedTarget } from "../ui/campusTouchTargets"

const ORBIT_SENSITIVITY = 0.004
const DRAG_DIST_THRESHOLD = 4

type OrbitPointerState = {
  startX: number
  startY: number
  lastX: number
  lastY: number
  dragging: boolean
}

function isOrbitSurfaceTarget(target: EventTarget | null, canvas: HTMLCanvasElement): boolean {
  if (!(target instanceof Element)) return false
  if (target.closest("[data-campus-camera-pad]")) return true
  return target === canvas || canvas.contains(target)
}

/** 拖动：左右转人物，上下调俯仰 */
export function useCampusCameraOrbit(
  playerRef: RefObject<THREE.Group | null>,
  orbitPitchRef: MutableRefObject<number>,
  pitchMin: number,
  pitchMax: number,
  canvas: HTMLCanvasElement | null,
  enabled = true,
) {
  useEffect(() => {
    if (!canvas || !enabled) return

    canvas.style.touchAction = "none"

    const pointers = new Map<number, OrbitPointerState>()
    const touchPointers = new Map<number, OrbitPointerState>()
    const capturedPointerIds = new Set<number>()

    const applyOrbit = (
      map: Map<number, OrbitPointerState>,
      id: number,
      clientX: number,
      clientY: number,
    ) => {
      const player = playerRef.current
      const state = map.get(id)
      if (!player || !state) return

      const dx = clientX - state.startX
      const dy = clientY - state.startY
      if (!state.dragging && Math.hypot(dx, dy) < DRAG_DIST_THRESHOLD) return

      // 轻点不拦截：只有拖动超过阈值才捕获指针，避免轻触被拦截导致建筑弹窗不出现
      if (!state.dragging) {
        state.dragging = true
        if (!capturedPointerIds.has(id)) {
          try { canvas.setPointerCapture(id) } catch { /* ignore */ }
          capturedPointerIds.add(id)
        }
      }

      const ddx = clientX - state.lastX
      const ddy = clientY - state.lastY
      player.rotation.y -= ddx * ORBIT_SENSITIVITY
      orbitPitchRef.current = Math.max(
        pitchMin,
        Math.min(pitchMax, orbitPitchRef.current + ddy * ORBIT_SENSITIVITY),
      )
      state.lastX = clientX
      state.lastY = clientY
    }

    const onPointerDown = (e: PointerEvent) => {
      if (e.pointerType === "mouse" && e.button !== 0) return
      if (isCampusCameraBlockedTarget(e.target)) return
      if (!isOrbitSurfaceTarget(e.target, canvas)) return

      pointers.set(e.pointerId, {
        startX: e.clientX,
        startY: e.clientY,
        lastX: e.clientX,
        lastY: e.clientY,
        dragging: false,
      })
      // 不在这里 setPointerCapture — 等到 applyOrbit 确认是拖动手势后才捕获
    }

    const onPointerMove = (e: PointerEvent) => {
      if (!pointers.has(e.pointerId)) return
      applyOrbit(pointers, e.pointerId, e.clientX, e.clientY)
    }

    const endPointer = (e: PointerEvent) => {
      if (!pointers.has(e.pointerId)) return
      pointers.delete(e.pointerId)
      if (capturedPointerIds.has(e.pointerId)) {
        try { canvas.releasePointerCapture(e.pointerId) } catch { /* ignore */ }
        capturedPointerIds.delete(e.pointerId)
      }
    }

    const onTouchStart = (e: TouchEvent) => {
      if (isCampusCameraBlockedTarget(e.target)) return
      if (!isOrbitSurfaceTarget(e.target, canvas)) return

      for (const touch of Array.from(e.changedTouches)) {
        touchPointers.set(touch.identifier, {
          startX: touch.clientX,
          startY: touch.clientY,
          lastX: touch.clientX,
          lastY: touch.clientY,
          dragging: false,
        })
      }
    }

    const onTouchMove = (e: TouchEvent) => {
      let handled = false
      for (const touch of Array.from(e.changedTouches)) {
        if (!touchPointers.has(touch.identifier)) continue
        handled = true
        applyOrbit(touchPointers, touch.identifier, touch.clientX, touch.clientY)
      }
      if (handled) e.preventDefault()
    }

    const onTouchEnd = (e: TouchEvent) => {
      for (const touch of Array.from(e.changedTouches)) {
        touchPointers.delete(touch.identifier)
      }
    }

    window.addEventListener("pointerdown", onPointerDown)
    window.addEventListener("pointermove", onPointerMove)
    window.addEventListener("pointerup", endPointer)
    window.addEventListener("pointercancel", endPointer)

    window.addEventListener("touchstart", onTouchStart, { passive: false })
    window.addEventListener("touchmove", onTouchMove, { passive: false })
    window.addEventListener("touchend", onTouchEnd)
    window.addEventListener("touchcancel", onTouchEnd)

    return () => {
      window.removeEventListener("pointerdown", onPointerDown)
      window.removeEventListener("pointermove", onPointerMove)
      window.removeEventListener("pointerup", endPointer)
      window.removeEventListener("pointercancel", endPointer)

      window.removeEventListener("touchstart", onTouchStart)
      window.removeEventListener("touchmove", onTouchMove)
      window.removeEventListener("touchend", onTouchEnd)
      window.removeEventListener("touchcancel", onTouchEnd)
      pointers.clear()
      touchPointers.clear()
      capturedPointerIds.clear()
    }
  }, [canvas, enabled, orbitPitchRef, pitchMax, pitchMin, playerRef])
}
