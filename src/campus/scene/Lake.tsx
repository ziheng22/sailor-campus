import { useRef, useMemo } from "react"
import * as THREE from "three"
import { lakes, type LakeData } from "../data/campusData"

export function Lakes() {
  return (
    <group>
      {lakes.map((lake) => (
        <Lake key={lake.id} data={lake} />
      ))}
    </group>
  )
}

function Lake({ data }: { data: LakeData }) {
  const meshRef = useRef<THREE.Mesh>(null)

  const shape = useMemo(() => {
    const s = new THREE.Shape()
    if (data.shape === "crescent") {
      const hw = data.width / 2
      const hd = data.depth / 2
      s.absarc(-hw * 0.3, 0, hd * 0.9, 0, Math.PI * 2, false)
      const hole = new THREE.Path()
      hole.absarc(hw * 0.35, 0, hd * 0.85, 0, Math.PI * 2, false)
      s.holes.push(hole)
    } else {
      s.moveTo(0, -data.depth / 2)
      s.bezierCurveTo(data.width * 0.3, -data.depth * 0.4, data.width * 0.4, -data.depth * 0.1, data.width * 0.2, data.depth * 0.3)
      s.bezierCurveTo(data.width * 0.1, data.depth * 0.5, -data.width * 0.2, data.depth * 0.4, -data.width * 0.3, data.depth * 0.1)
      s.bezierCurveTo(-data.width * 0.4, -data.depth * 0.2, -data.width * 0.2, -data.depth * 0.5, 0, -data.depth / 2)
    }
    return s
  }, [data.shape, data.width, data.depth])

  const geometry = useMemo(() => {
    return new THREE.ExtrudeGeometry(shape, { depth: 0.1, bevelEnabled: false })
  }, [shape])

  return (
    <group position={[data.centerX, 0.04, data.centerZ]}>
      <mesh ref={meshRef} rotation={[-Math.PI / 2, 0, 0]}>
        <shapeGeometry args={[shape]} />
        <meshToonMaterial color="#8cc8e8" transparent opacity={0.88} />
      </mesh>
      <mesh geometry={geometry} position={[0, -0.05, 0]}>
        <meshToonMaterial color="#c8c0b0" />
      </mesh>
    </group>
  )
}
