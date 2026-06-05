/** 触摸/指针落点是否应忽略（不参与转动视角） */
export function isCampusCameraBlockedTarget(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return true
  return !!target.closest(
    "[data-campus-joystick], [data-campus-ui], [data-campus-modal], button, a, input, textarea, select",
  )
}
