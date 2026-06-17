import { useRef, useCallback, useEffect, useState } from "react"
import { clearCampusJoystickInput, setCampusJoystickInput } from "./campusJoystickInput"

const STICK_RADIUS = 42
const DEAD_ZONE = 0.12

interface MobileJoystickProps {
  visible: boolean
}

export function MobileJoystick({ visible }: MobileJoystickProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const knobRef = useRef<HTMLDivElement>(null)
  const activeRef = useRef(false)
  const centerRef = useRef({ x: 0, y: 0 })
  const [position, setPosition] = useState({ bottom: 48, left: 24 })
  const dragRef = useRef<{
    pointerId: number
    startX: number
    startY: number
    baseBottom: number
    baseLeft: number
  } | null>(null)

  useEffect(() => {
    if (!visible) clearCampusJoystickInput()
    return () => clearCampusJoystickInput()
  }, [visible])

  const applyVec = useCallback((clientX: number, clientY: number) => {
    const dx = clientX - centerRef.current.x
    const dy = clientY - centerRef.current.y
    const dist = Math.min(Math.hypot(dx, dy), STICK_RADIUS)
    const angle = Math.atan2(dy, dx)
    let x = (Math.cos(angle) * dist) / STICK_RADIUS
    let z = (Math.sin(angle) * dist) / STICK_RADIUS
    if (Math.hypot(x, z) < DEAD_ZONE) {
      x = 0
      z = 0
    }
    if (knobRef.current) {
      knobRef.current.style.transform = `translate(${Math.cos(angle) * dist}px, ${Math.sin(angle) * dist}px)`
    }
    setCampusJoystickInput(x, z)
  }, [])

  const resetKnob = useCallback(() => {
    activeRef.current = false
    if (knobRef.current) knobRef.current.style.transform = "translate(0px, 0px)"
    clearCampusJoystickInput()
  }, [])

  const handleStickStart = useCallback(
    (clientX: number, clientY: number) => {
      const rect = containerRef.current?.getBoundingClientRect()
      if (!rect) return
      centerRef.current = {
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2,
      }
      activeRef.current = true
      applyVec(clientX, clientY)
    },
    [applyVec],
  )

  const handleStickMove = useCallback(
    (clientX: number, clientY: number) => {
      if (!activeRef.current) return
      applyVec(clientX, clientY)
    },
    [applyVec],
  )

  const handleDragMove = useCallback((clientX: number, clientY: number) => {
    const drag = dragRef.current
    if (!drag) return
    const dx = clientX - drag.startX
    const dy = clientY - drag.startY
    setPosition({
      left: Math.max(8, Math.min(window.innerWidth - 116, drag.baseLeft + dx)),
      bottom: Math.max(16, Math.min(window.innerHeight - 132, drag.baseBottom - dy)),
    })
  }, [])

  const onTouchStart = useCallback(
    (e: React.TouchEvent) => {
      e.stopPropagation()
      const touch = e.touches[0]
      if ((e.target as HTMLElement).dataset.joystickDrag === "handle") {
        dragRef.current = {
          pointerId: touch.identifier,
          startX: touch.clientX,
          startY: touch.clientY,
          baseBottom: position.bottom,
          baseLeft: position.left,
        }
        return
      }
      e.preventDefault()
      handleStickStart(touch.clientX, touch.clientY)
    },
    [handleStickStart, position.bottom, position.left],
  )

  const onTouchMove = useCallback(
    (e: React.TouchEvent) => {
      e.stopPropagation()
      const touch = e.touches[0]
      if (dragRef.current?.pointerId === touch.identifier) {
        handleDragMove(touch.clientX, touch.clientY)
        return
      }
      if (!activeRef.current) return
      e.preventDefault()
      handleStickMove(touch.clientX, touch.clientY)
    },
    [handleDragMove, handleStickMove],
  )

  const onTouchEnd = useCallback((e: React.TouchEvent) => {
    e.stopPropagation()
    dragRef.current = null
    resetKnob()
  }, [resetKnob])

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      e.stopPropagation()
      if ((e.target as HTMLElement).dataset.joystickDrag === "handle") {
        dragRef.current = {
          pointerId: e.pointerId,
          startX: e.clientX,
          startY: e.clientY,
          baseBottom: position.bottom,
          baseLeft: position.left,
        }
        e.currentTarget.setPointerCapture(e.pointerId)
        return
      }
      e.preventDefault()
      e.currentTarget.setPointerCapture(e.pointerId)
      handleStickStart(e.clientX, e.clientY)
    },
    [handleStickStart, position.bottom, position.left],
  )

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      e.stopPropagation()
      if (dragRef.current?.pointerId === e.pointerId) {
        handleDragMove(e.clientX, e.clientY)
        return
      }
      if (!activeRef.current) return
      handleStickMove(e.clientX, e.clientY)
    },
    [handleDragMove, handleStickMove],
  )

  const onPointerUp = useCallback(
    (e: React.PointerEvent) => {
      e.stopPropagation()
      dragRef.current = null
      resetKnob()
      try {
        e.currentTarget.releasePointerCapture(e.pointerId)
      } catch {
        /* ignore */
      }
    },
    [resetKnob],
  )

  if (!visible) return null

  return (
    <div
      data-campus-joystick
      style={{
        position: "fixed",
        bottom: position.bottom,
        left: position.left,
        zIndex: 15,
        pointerEvents: "auto",
        touchAction: "none",
      }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      <div
        data-joystick-drag="handle"
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        style={{
          width: 28,
          height: 20,
          margin: "0 auto 4px",
          borderRadius: 6,
          background: "rgba(0,0,0,0.35)",
          color: "rgba(255,255,255,0.85)",
          fontSize: 10,
          lineHeight: "20px",
          textAlign: "center",
          userSelect: "none",
        }}
      >
        ⋮⋮
      </div>
      <div
        ref={containerRef}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onTouchCancel={onTouchEnd}
        style={{
          width: 104,
          height: 104,
          borderRadius: "50%",
          background: "rgba(255,255,255,0.16)",
          border: "2px solid rgba(255,255,255,0.28)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div
          ref={knobRef}
          style={{
            width: 46,
            height: 46,
            borderRadius: "50%",
            background: "rgba(255,255,255,0.42)",
            boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
            transition: "transform 0.04s linear",
          }}
        />
      </div>
    </div>
  )
}
