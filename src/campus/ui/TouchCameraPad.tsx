import { useTouchDevice } from "./useTouchDevice"

/**
 * 手机端右侧视角拖动区（与左下摇杆分离，可双指同时操作）
 */
export function TouchCameraPad() {
  const isTouch = useTouchDevice()
  if (!isTouch) return null

  return (
    <div
      data-campus-camera-pad
      aria-hidden
      style={{
        position: "fixed",
        top: 56,
        right: 0,
        bottom: 0,
        left: "36%",
        zIndex: 5,
        touchAction: "none",
        pointerEvents: "none",
      }}
    />
  )
}
