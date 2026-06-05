import { useRef, useCallback, useEffect, useState } from "react"
import { clearCampusJoystickInput, setCampusJoystickInput } from "./campusJoystickInput"
import { isCampusCameraBlockedTarget } from "./campusTouchTargets"

const STICK_RADIUS = 48
const DEAD_ZONE = 0.12
const BASE_SIZE = 120
/** 内圈半径 = 摇杆控制；外环（内圈~底座边缘）= 拖动底座位置 */
const KNOB_ZONE_RADIUS = 36

interface MobileJoystickProps {
  visible: boolean
}

type DragMode = "none" | "joystick" | "reposition"

export function MobileJoystick({ visible }: MobileJoystickProps) {
  const modeRef = useRef<DragMode>("none")
  const pointerIdRef = useRef<number | null>(null)
  const touchIdRef = useRef<number | null>(null)
  /** ref 避免拖拽底座时 useEffect 重新注册 */
  const basePosRef = useRef({ x: 28, y: 0 })
  const [basePos, setBasePos] = useState({ x: 28, y: 0 })
  const [knobOffset, setKnobOffset] = useState({ x: 0, y: 0 })
  const [baseInit, setBaseInit] = useState(false)

  // 首次初始化底座位置
  useEffect(() => {
    if (!baseInit && typeof window !== "undefined") {
      const p = { x: 28, y: window.innerHeight - 192 }
      basePosRef.current = p
      setBasePos(p)
      setBaseInit(true)
    }
  }, [baseInit])

  useEffect(() => {
    if (!visible) clearCampusJoystickInput()
    return () => clearCampusJoystickInput()
  }, [visible])

  const applyVec = useCallback((dx: number, dy: number) => {
    const dist = Math.min(Math.hypot(dx, dy), STICK_RADIUS)
    const angle = Math.atan2(dy, dx)
    let x = (Math.cos(angle) * dist) / STICK_RADIUS
    let z = (Math.sin(angle) * dist) / STICK_RADIUS
    if (Math.hypot(x, z) < DEAD_ZONE) { x = 0; z = 0 }
    setCampusJoystickInput(x, z)
  }, [])

  const reset = useCallback(() => {
    modeRef.current = "none"
    pointerIdRef.current = null
    touchIdRef.current = null
    setKnobOffset({ x: 0, y: 0 })
    clearCampusJoystickInput()
  }, [])

  useEffect(() => {
    if (!visible) return

    const isLeftHalf = (clientX: number) => clientX <= window.innerWidth * 0.5
    const centerX = () => basePosRef.current.x + BASE_SIZE / 2
    const centerY = () => basePosRef.current.y + BASE_SIZE / 2
    const distFromCenter = (cx: number, cy: number) => Math.hypot(cx - centerX(), cy - centerY())

    const dispatchClick = (clientX: number, clientY: number) => {
      const target = document.elementFromPoint(clientX, clientY)
      if (!target) return
      const init: PointerEventInit = { bubbles: true, cancelable: true, clientX, clientY, pointerId: -1, pointerType: "touch", isPrimary: false }
      target.dispatchEvent(new PointerEvent("pointerdown", init))
      target.dispatchEvent(new PointerEvent("pointerup", init))
      target.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true, clientX, clientY }))
    }

    const onPointerDown = (e: PointerEvent) => {
      if (e.pointerId === -1) return
      if (isCampusCameraBlockedTarget(e.target)) return
      if (!isLeftHalf(e.clientX)) return

      const d = distFromCenter(e.clientX, e.clientY)

      // 触摸在底座外 → 放行
      if (d > BASE_SIZE / 2) return

      e.stopImmediatePropagation()
      e.preventDefault()
      pointerIdRef.current = e.pointerId
      touchIdRef.current = null

      if (d > KNOB_ZONE_RADIUS) {
        // 外环 → 拖动底座
        modeRef.current = "reposition"
        return
      }
      // 内圈 → 摇杆
      modeRef.current = "joystick"
    }

    const onPointerMove = (e: PointerEvent) => {
      if (e.pointerId === -1) return
      if (pointerIdRef.current !== e.pointerId) return
      e.stopImmediatePropagation()
      e.preventDefault()

      if (modeRef.current === "reposition") {
        const nx = e.clientX - BASE_SIZE / 2
        const ny = e.clientY - BASE_SIZE / 2
        basePosRef.current = { x: nx, y: ny }
        setBasePos({ x: nx, y: ny })
        return
      }

      if (modeRef.current === "joystick") {
        const dx = e.clientX - centerX()
        const dy = e.clientY - centerY()
        const dist = Math.min(Math.hypot(dx, dy), STICK_RADIUS)
        const angle = Math.atan2(dy, dx)
        setKnobOffset({
          x: Math.cos(angle) * dist,
          y: Math.sin(angle) * dist,
        })
        applyVec(dx, dy)
      }
    }

    const onPointerUp = (e: PointerEvent) => {
      if (e.pointerId === -1) return
      if (pointerIdRef.current !== e.pointerId) return
      e.stopImmediatePropagation()
      reset()
    }

    const onPointerCancel = (e: PointerEvent) => {
      if (pointerIdRef.current !== e.pointerId) return
      reset()
    }

    // ─── touch 事件（移动端必须也拦截，否则漏给相机轨道）───

    const onTouchStart = (e: TouchEvent) => {
      for (let i = 0; i < e.changedTouches.length; i++) {
        const t = e.changedTouches[i]
        if (isCampusCameraBlockedTarget(t.target as Element)) continue
        if (!isLeftHalf(t.clientX)) continue
        const d = distFromCenter(t.clientX, t.clientY)
        if (d > BASE_SIZE / 2) continue

        e.stopImmediatePropagation()
        e.preventDefault()
        touchIdRef.current = t.identifier
        pointerIdRef.current = null

        if (d > KNOB_ZONE_RADIUS) {
          modeRef.current = "reposition"
        } else {
          modeRef.current = "joystick"
        }
        return
      }
    }

    const onTouchMove = (e: TouchEvent) => {
      if (touchIdRef.current == null) return
      for (let i = 0; i < e.changedTouches.length; i++) {
        const t = e.changedTouches[i]
        if (t.identifier !== touchIdRef.current) continue
        e.stopImmediatePropagation()
        e.preventDefault()

        if (modeRef.current === "reposition") {
          const nx = t.clientX - BASE_SIZE / 2
          const ny = t.clientY - BASE_SIZE / 2
          basePosRef.current = { x: nx, y: ny }
          setBasePos({ x: nx, y: ny })
          return
        }

        if (modeRef.current === "joystick") {
          const dx = t.clientX - centerX()
          const dy = t.clientY - centerY()
          const dist = Math.min(Math.hypot(dx, dy), STICK_RADIUS)
          const angle = Math.atan2(dy, dx)
          setKnobOffset({
            x: Math.cos(angle) * dist,
            y: Math.sin(angle) * dist,
          })
          applyVec(dx, dy)
        }
        return
      }
    }

    const onTouchEnd = (e: TouchEvent) => {
      if (touchIdRef.current == null) return
      for (let i = 0; i < e.changedTouches.length; i++) {
        if (e.changedTouches[i].identifier === touchIdRef.current) {
          e.stopImmediatePropagation()
          reset()
          return
        }
      }
    }

    const onTouchCancel = (e: TouchEvent) => {
      if (touchIdRef.current == null) return
      for (let i = 0; i < e.changedTouches.length; i++) {
        if (e.changedTouches[i].identifier === touchIdRef.current) {
          reset()
          return
        }
      }
    }

    window.addEventListener("pointerdown", onPointerDown, true)
    window.addEventListener("pointermove", onPointerMove, true)
    window.addEventListener("pointerup", onPointerUp, true)
    window.addEventListener("pointercancel", onPointerCancel, true)
    window.addEventListener("touchstart", onTouchStart, true)
    window.addEventListener("touchmove", onTouchMove, true)
    window.addEventListener("touchend", onTouchEnd, true)
    window.addEventListener("touchcancel", onTouchCancel, true)

    return () => {
      window.removeEventListener("pointerdown", onPointerDown, true)
      window.removeEventListener("pointermove", onPointerMove, true)
      window.removeEventListener("pointerup", onPointerUp, true)
      window.removeEventListener("pointercancel", onPointerCancel, true)
      window.removeEventListener("touchstart", onTouchStart, true)
      window.removeEventListener("touchmove", onTouchMove, true)
      window.removeEventListener("touchend", onTouchEnd, true)
      window.removeEventListener("touchcancel", onTouchCancel, true)
      reset()
    }
  }, [visible, applyVec, reset])

  if (!visible) return null

  const active = modeRef.current !== "none"

  return (
    <div
      data-campus-joystick
      style={{
        position: "fixed",
        left: basePos.x,
        top: basePos.y,
        width: BASE_SIZE,
        height: BASE_SIZE,
        borderRadius: "50%",
        background: "rgba(255,255,255,0.12)",
        border: "2px solid rgba(255,255,255,0.22)",
        zIndex: 15,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        pointerEvents: "none",
        touchAction: "none",
      }}
    >
      {/* 外环虚线提示：拖拽此处移动底座 */}
      <div
        style={{
          position: "absolute",
          inset: 4,
          borderRadius: "50%",
          border: "1px dashed rgba(255,255,255,0.20)",
          pointerEvents: "none",
        }}
      />
      {/* 摇杆手柄 */}
      <div
        style={{
          width: 48,
          height: 48,
          borderRadius: "50%",
          background: active
            ? "rgba(255,255,255,0.50)"
            : "rgba(255,255,255,0.26)",
          boxShadow: "0 2px 10px rgba(0,0,0,0.22)",
          transform: `translate(${knobOffset.x}px, ${knobOffset.y}px)`,
          transition: active ? "none" : "transform 0.18s ease-out",
        }}
      />
    </div>
  )
}
