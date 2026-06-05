export function Sky() {
  return (
    <group>
      {/* Simple sky dome via background color in Canvas, here just a sun disc */}
      <mesh position={[30, 60, -30]}>
        <sphereGeometry args={[5, 16, 16]} />
        <meshBasicMaterial color="#ffec99" />
      </mesh>
    </group>
  )
}
