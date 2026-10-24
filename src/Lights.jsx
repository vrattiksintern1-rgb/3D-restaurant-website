const pendants = [
  [0, 1.5], [3, 1.5], [6, 1.5],
  [0, 4.5], [3, 4.5], [6, 4.5],
]

function Pendant({ x, z, night }) {
  return (
    <group position={[x, 0, z]}>
      <mesh position={[0, 2.65, 0]}>
        <cylinderGeometry args={[0.012, 0.012, 0.7, 6]} />
        <meshStandardMaterial color="#4A3426" />
      </mesh>
      <mesh position={[0, 2.2, 0]}>
        <sphereGeometry args={[0.16, 16, 16]} />
        <meshStandardMaterial
          color="#F5E6CC"
          emissive="#FFB35C"
          emissiveIntensity={night ? 2.5 : 0.15}
        />
      </mesh>
      <pointLight
        position={[0, 2.1, 0]}
        color="#FFB35C"
        intensity={night ? 6 : 0}
        distance={7}
        decay={2}
      />
    </group>
  )
}

function Glow({ pos, night }) {
  return (
    <pointLight
      position={pos}
      color="#FFB35C"
      intensity={night ? 8 : 0}
      distance={8}
      decay={2}
    />
  )
}

export default function Lights({ night }) {
  return (
    <>
      <color attach="background" args={[night ? '#1B1410' : '#F5E6CC']} />

      <ambientLight
        intensity={night ? 0.3 : 0.7}
        color={night ? '#FFD9A8' : '#FFFFFF'}
      />
      <directionalLight
        position={[8, 14, 6]}
        intensity={night ? 0.35 : 1}
        color={night ? '#9FB4FF' : '#FFF1DC'}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-15}
        shadow-camera-right={15}
        shadow-camera-top={15}
        shadow-camera-bottom={-15}
      />

      {pendants.map(([x, z], i) => (
        <Pendant key={i} x={x} z={z} night={night} />
      ))}

      <Glow pos={[-5, 1.8, -3.5]} night={night} />
      <Glow pos={[4, 2.2, -3]} night={night} />
      <Glow pos={[-5.5, 2, 4.2]} night={night} />
    </>
  )
}

export function NightToggle({ night, setNight }) {
  return (
    <button
      onClick={() => setNight(!night)}
      style={{
        position: 'fixed',
        top: 24,
        right: 24,
        padding: '11px 20px',
        borderRadius: 999,
        border: '1px solid #4A3426',
        background: night ? '#F5E6CC' : '#4A3426',
        color: night ? '#4A3426' : '#F5E6CC',
        fontFamily: 'Georgia, serif',
        fontSize: 14,
        cursor: 'pointer',
        zIndex: 10,
        boxShadow: '0 8px 20px rgba(0, 0, 0, 0.25)',
      }}
    >
      {night ? 'Day mode' : 'Night mode'}
    </button>
  )
}