import { Icon } from './icons'
import { DINING_HALL } from './Journey'

// Dining hall table upar na pendant (Journey.jsx na DINING_HALL.tables[].lamps)
const pendants = DINING_HALL.tables.flatMap((t) => t.lamps)

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

// Ghaas jevo j rang: kyarey scene ni pachhal no bhaag dekhay to pan alag na pade
export const BACKDROP = { day: '#707945', night: '#3A3C26' }

export default function Lights({ night }) {
  return (
    <>
      <color attach="background" args={[night ? BACKDROP.night : BACKDROP.day]} />

      <ambientLight
        intensity={night ? 0.3 : 0.7}
        color={night ? '#FFD9A8' : '#FFFFFF'}
      />
      <directionalLight
        position={[24, 42, 18]}
        intensity={night ? 0.35 : 1}
        color={night ? '#9FB4FF' : '#FFF1DC'}
        castShadow
        shadow-mapSize={[4096, 4096]}
        shadow-camera-left={-48}
        shadow-camera-right={48}
        shadow-camera-top={48}
        shadow-camera-bottom={-48}
        shadow-camera-far={150}
        shadow-bias={-0.0004}
        shadow-normalBias={0.03}
        shadow-radius={5}
      />

      {pendants.map(([x, z], i) => (
        <Pendant key={i} x={x} z={z} night={night} />
      ))}

      <Glow pos={[-5, 1.8, -3.5]} night={night} />
      <Glow pos={[4, 2.2, -3]} night={night} />
      <Glow pos={[-5.5, 2, 4.2]} night={night} />
      <Glow pos={[-4.3, 2, -9]} night={night} />
      <Glow pos={[3.8, 2.2, -9]} night={night} />
      <Glow pos={[3.2, 1.8, 8]} night={night} />
    </>
  )
}

export function NightToggle({ night, onToggle, compact }) {
  return (
    <button
      className={`night-toggle glass${night ? ' is-night' : ''}`}
      onClick={onToggle}
      aria-pressed={night}
      aria-label={night ? 'Switch to day mode' : 'Switch to night mode'}
    >
      <span className="night-icons" aria-hidden="true">
        <Icon.sun />
        <Icon.moon />
      </span>
      {!compact && <span>{night ? 'Day mode' : 'Night mode'}</span>}
    </button>
  )
}
