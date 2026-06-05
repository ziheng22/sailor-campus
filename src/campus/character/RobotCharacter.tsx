import { useEffect, useMemo, useRef } from "react"
import { useFrame } from "@react-three/fiber"
import { useAnimations, useGLTF } from "@react-three/drei"
import * as THREE from "three"
import defaultRobotGlb from "../assets/robot.glb?url"

interface RobotCharacterProps {
  isMoving?: boolean
  modelUrl?: string
}

const BOB_AMPLITUDE = 0.09
const BOB_SPEED = 10

const IDLE_NAMES = /^(idle|Idle|idle_01|idle_1|idle01|stand|breathing|breathing_idle|静止|待机|休息)$/
const WALK_NAMES = /^(walk|Walk|walking|walk_cycle|run|jog|行走|走路|跑步|移动)$/

function findClip(animations: THREE.AnimationClip[], pattern: RegExp): THREE.AnimationClip | null {
  return animations.find((c) => pattern.test(c.name)) ?? null
}

function measureMeshYExtent(root: THREE.Object3D): { height: number; minY: number } {
  const box = new THREE.Box3()
  root.traverse((obj) => {
    if ((obj as THREE.Mesh).isMesh) {
      box.union(new THREE.Box3().setFromObject(obj))
    }
  })
  const size = new THREE.Vector3()
  box.getSize(size)
  return { height: Math.max(size.y, 0.001), minY: box.min.y }
}

export function RobotCharacter({ isMoving = false, modelUrl }: RobotCharacterProps) {
  const rootRef = useRef<THREE.Group>(null)
  const bodyRef = useRef<THREE.Group>(null)
  const bobPhase = useRef(0)
  const prevMoving = useRef(isMoving)
  const activeActionRef = useRef<THREE.AnimationAction | null>(null)

  const glbUrl = modelUrl || defaultRobotGlb
  const { scene, animations } = useGLTF(glbUrl)
  const hasClips = animations.length > 0

  const idleClip = findClip(animations, IDLE_NAMES)
  const walkClip = findClip(animations, WALK_NAMES)
  const hasNamedClips = idleClip !== null && walkClip !== null

  const model = useMemo(() => {
    const cloned = scene.clone(true)

    cloned.traverse((obj) => {
      if ((obj as THREE.Mesh).isMesh) {
        const mesh = obj as THREE.Mesh
        mesh.castShadow = true
        mesh.receiveShadow = true
      }
    })

    // 朝向修正：模型面向 -Z
    cloned.rotation.y = Math.PI + Math.PI / 2

    // 等比缩放
    const { height, minY } = measureMeshYExtent(cloned)
    const scale = 1.15 / height
    cloned.scale.setScalar(scale)
    console.log("[robot] raw height:", height, "scale:", scale)

    // 贴地 + 居中
    const box = new THREE.Box3().setFromObject(cloned)
    const center = new THREE.Vector3()
    box.getCenter(center)
    cloned.position.set(-center.x, -box.min.y, -center.z)
    console.log("[robot] after ground: pos", cloned.position.toArray())

    return cloned
  }, [scene])

  const { actions, mixer } = useAnimations(animations, rootRef)

  // 初始化 idle 动画
  useEffect(() => {
    if (!mixer) return

    if (hasNamedClips) {
      const idleAction = actions[idleClip!.name]
      const walkAction = actions[walkClip!.name]
      if (idleAction && walkAction) {
        Object.values(actions).forEach((a) => a?.stop())
        idleAction.reset().setLoop(THREE.LoopRepeat, Infinity).play()
        activeActionRef.current = idleAction
        return () => {
          Object.values(actions).forEach((a) => a?.stop())
        }
      }
    }

    if (hasClips) {
      Object.values(actions).forEach((action) => {
        if (!action) return
        action.reset().setLoop(THREE.LoopRepeat, Infinity).play()
      })
      return () => {
        Object.values(actions).forEach((action) => action?.stop())
      }
    }
  }, [actions, hasClips, mixer, hasNamedClips, idleClip, walkClip])

  // isMoving 切换动画
  useEffect(() => {
    if (!mixer || !hasNamedClips) return
    if (prevMoving.current === isMoving) return
    prevMoving.current = isMoving

    const idleAction = actions[idleClip!.name]
    const walkAction = actions[walkClip!.name]
    if (!idleAction || !walkAction) return

    const from = isMoving ? idleAction : walkAction
    const to = isMoving ? walkAction : idleAction

    if (!from.isRunning()) from.reset().play()
    to.reset().setLoop(THREE.LoopRepeat, Infinity).play()

    from.crossFadeTo(to, 0.25, false)
    activeActionRef.current = to
  }, [isMoving, mixer, hasNamedClips, idleClip, walkClip, actions])

  useFrame((_, delta) => {
    const body = bodyRef.current
    if (!body) return

    if (mixer) {
      mixer.update(delta)
      if (hasNamedClips && activeActionRef.current) {
        activeActionRef.current.timeScale = isMoving ? 1.15 : 0.85
      } else if (hasClips && activeActionRef.current) {
        activeActionRef.current.timeScale = isMoving ? 1.3 : 0.7
      }
    }

    if (isMoving) {
      bobPhase.current += delta * BOB_SPEED
      body.position.y = Math.sin(bobPhase.current) * BOB_AMPLITUDE
      if (!hasNamedClips) {
        body.rotation.z = Math.sin(bobPhase.current * 0.8) * 0.04
      }
    } else {
      bobPhase.current = 0
      body.position.y = THREE.MathUtils.lerp(body.position.y, 0, delta * 8)
      if (!hasNamedClips) {
        body.rotation.z = THREE.MathUtils.lerp(body.rotation.z, 0, delta * 6)
      }
    }
  })

  return (
    <group ref={rootRef}>
      <group ref={bodyRef}>
        <primitive object={model} />
      </group>
      <mesh position={[0, 0.1, -0.22]}>
        <sphereGeometry args={[0.04, 4, 4]} />
        <meshBasicMaterial color="#ffffff" />
      </mesh>
    </group>
  )
}

useGLTF.preload(defaultRobotGlb)
