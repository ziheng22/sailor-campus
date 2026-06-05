import { useEffect, useMemo, useRef } from "react"
import { useFrame } from "@react-three/fiber"
import { useAnimations, useGLTF } from "@react-three/drei"
import * as THREE from "three"
import butterflyGlb from "../assets/butterfly.glb?url"
import { applyMorphoButterflyMaterials } from "./butterflyMaterials"
import {
  FLIGHT_PITCH_IDLE,
  FLIGHT_PITCH_MOVING,
  TARGET_LOCAL_HEIGHT,
} from "./avatarConfig"

interface ButterflyCharacterProps {
  isMoving?: boolean
}

/** 水平姿态下翅膀折叠 / 舒展（绕翅轴） */
const WING_FOLDED = -0.38
const WING_SPREAD = 0.22
const WING_SPEED_IDLE = 5.2
const WING_SPEED_MOVING = 9.8

/**
 * 水平飞行蝴蝶：身体平行于地面，机头朝 -Z，移动时略微前倾
 */
export function ButterflyCharacter({ isMoving = false }: ButterflyCharacterProps) {
  const rootRef = useRef<THREE.Group>(null)
  const bodyRef = useRef<THREE.Group>(null)
  const wingsRef = useRef<THREE.Group>(null)
  const flapPhase = useRef(0)
  const pitchRef = useRef(FLIGHT_PITCH_IDLE)

  const { scene, animations } = useGLTF(butterflyGlb)
  const hasClips = animations.length > 0

  const model = useMemo(() => {
    const cloned = scene.clone(true)
    applyMorphoButterflyMaterials(cloned)

    cloned.rotation.x = -Math.PI / 2
    cloned.rotation.y = Math.PI

    const box = new THREE.Box3().setFromObject(cloned)
    const size = box.getSize(new THREE.Vector3())
    const span = Math.max(size.x, size.z, size.y * 0.5)
    const scale = TARGET_LOCAL_HEIGHT / Math.max(span, 0.001)
    cloned.scale.setScalar(scale)

    const centered = new THREE.Box3().setFromObject(cloned)
    const center = centered.getCenter(new THREE.Vector3())
    cloned.position.sub(center)

    return cloned
  }, [scene])

  const { actions, mixer } = useAnimations(animations, rootRef)

  useEffect(() => {
    if (!hasClips) return
    Object.values(actions).forEach((action) => {
      if (!action) return
      action.reset().setLoop(THREE.LoopRepeat, Infinity).play()
    })
    return () => {
      Object.values(actions).forEach((action) => action?.stop())
    }
  }, [actions, hasClips])

  useFrame((_, delta) => {
    const body = bodyRef.current
    const wings = wingsRef.current
    if (!body || !wings) return

    const wingSpeed = isMoving ? WING_SPEED_MOVING : WING_SPEED_IDLE
    flapPhase.current += delta * wingSpeed

    if (hasClips && mixer) {
      mixer.update(delta)
      Object.values(actions).forEach((action) => {
        if (action) action.timeScale = isMoving ? 1.2 : 0.88
      })
    }

    const cycle = (1 - Math.cos(flapPhase.current)) * 0.5
    const wingAngle = THREE.MathUtils.lerp(WING_FOLDED, WING_SPREAD, cycle)

    if (!hasClips) {
      wings.rotation.x = wingAngle
      wings.scale.set(1 + cycle * 0.04, 1, 1 + cycle * 0.12)
    } else {
      wings.rotation.x = wingAngle * 0.4
      wings.scale.set(1, 1, 1 + cycle * 0.06)
    }

    const targetPitch = isMoving ? FLIGHT_PITCH_MOVING : FLIGHT_PITCH_IDLE
    pitchRef.current = THREE.MathUtils.lerp(pitchRef.current, targetPitch, delta * 5)
    body.rotation.x = pitchRef.current

    const hover = Math.sin(flapPhase.current * 0.7) * 0.015
    body.position.y = hover
  })

  return (
    <group ref={rootRef}>
      <group ref={bodyRef}>
        <group ref={wingsRef}>
          <primitive object={model} />
        </group>
      </group>
      <mesh position={[0, 0, -0.32]}>
        <sphereGeometry args={[0.03, 4, 4]} />
        <meshBasicMaterial color="#ffffff" />
      </mesh>
    </group>
  )
}

useGLTF.preload(butterflyGlb)
