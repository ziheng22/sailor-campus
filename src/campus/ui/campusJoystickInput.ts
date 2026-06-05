/** 与 CharacterController 共享的摇杆输入（-1~1） */
export type CampusJoystickInput = {
  __campusJoystickX?: number
  __campusJoystickZ?: number
}

export function setCampusJoystickInput(x: number, z: number): void {
  const w = window as Window & CampusJoystickInput
  w.__campusJoystickX = x
  w.__campusJoystickZ = z
}

export function clearCampusJoystickInput(): void {
  setCampusJoystickInput(0, 0)
}

export function getCampusJoystickInput(): { x: number; z: number } {
  const w = window as Window & CampusJoystickInput
  return { x: w.__campusJoystickX ?? 0, z: w.__campusJoystickZ ?? 0 }
}
