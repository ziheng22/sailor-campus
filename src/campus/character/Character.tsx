import { RobotCharacter } from "./RobotCharacter"

interface CharacterProps {
  isMoving?: boolean
}

export function Character({ isMoving = false }: CharacterProps) {
  return <RobotCharacter isMoving={isMoving} />
}
