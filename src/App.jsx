import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import Characters from './Characters'
import { useState } from 'react'
import CameraRig, { Menu } from './CameraRig'
import Actions from './Actions'
import Intro from './Intro'
import Lights, { NightToggle } from './Lights'
import Food from './Food'
import Journey from './Journey'
import Outside from './Outside'
import Sections from './Sections'

const C = {
  cream: '#F5E6CC',
  terra: '#C8553D',
  olive: '#6B7F3A',
  oliveDark: '#4F6128',
  wood: '#4A3426',
  woodLight: '#6B4A35',
}

function Box({ pos, size, color }) {
  return (
    <mesh position={pos} castShadow receiveShadow>
      <boxGeometry args={size} />
      <meshStandardMaterial color={color} />
    </mesh>
  )
}

function Zone({ x, z, w, d, color }) {
  return <Box pos={[x, 0.05, z]} size={[w, 0.1, d]} color={color} />
}

/* ---------- Dining ---------- */
function Chair({ angle }) {
  const r = 1.05
  const x = Math.sin(angle) * r
  const z = Math.cos(angle) * r
  return (
    <group position={[x, 0, z]} rotation={[0, angle, 0]}>
      <Box pos={[0, 0.4, 0]} size={[0.45, 0.08, 0.45]} color={C.terra} />
      <Box pos={[0, 0.65, 0.2]} size={[0.45, 0.5, 0.06]} color={C.terra} />
      <Box pos={[0, 0.2, 0]} size={[0.08, 0.4, 0.08]} color={C.wood} />
    </group>
  )
}

function Table({ x, z }) {
  return (
    <group position={[x, 0.1, z]}>
      <mesh position={[0, 0.35, 0]} castShadow>
        <cylinderGeometry args={[0.1, 0.18, 0.7, 12]} />
        <meshStandardMaterial color={C.wood} />
      </mesh>
      <mesh position={[0, 0.75, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.7, 0.7, 0.1, 24]} />
        <meshStandardMaterial color={C.cream} />
      </mesh>
      <Chair angle={Math.PI / 2} />
      <Chair angle={(3 * Math.PI) / 2} />
    </group>
  )
}

const tables = [
  [-0.2, 1.5], [3.2, 1.5], [6.6, 1.5],
  [-0.2, 4.5], [3.2, 4.5], [6.6, 4.5],
]

/* ---------- Plant ---------- */
function Plant({ x, z }) {
  return (
    <group position={[x, 0.1, z]}>
      <mesh position={[0, 0.25, 0]} castShadow>
        <cylinderGeometry args={[0.3, 0.22, 0.5, 12]} />
        <meshStandardMaterial color={C.terra} />
      </mesh>
      <mesh position={[0, 0.85, 0]} castShadow>
        <sphereGeometry args={[0.45, 12, 12]} />
        <meshStandardMaterial color={C.oliveDark} />
      </mesh>
      <mesh position={[0.2, 1.2, 0.1]} castShadow>
        <sphereGeometry args={[0.3, 12, 12]} />
        <meshStandardMaterial color={C.oliveDark} />
      </mesh>
    </group>
  )
}

/* ---------- Reception ---------- */
function Reception() {
  return (
    <group>
      {/* desk */}
      <Box pos={[-5.5, 0.55, 4.6]} size={[3, 0.9, 0.7]} color={C.wood} />
      <Box pos={[-5.5, 1.05, 4.6]} size={[3.2, 0.1, 0.9]} color={C.terra} />
      {/* welcome sign on left wall */}
      <Box pos={[-7.92, 2, 3.5]} size={[0.06, 0.7, 2.2]} color={C.terra} />
      <Box pos={[-7.88, 2, 3.5]} size={[0.04, 0.5, 2]} color={C.cream} />
    </group>
  )
}

/* ---------- Kitchen ---------- */
function Kitchen() {
  return (
    <group>
      {/* back counter */}
      <Box pos={[4, 0.6, -5.2]} size={[7, 1, 0.8]} color={C.wood} />
      <Box pos={[4, 1.15, -5.2]} size={[7.1, 0.1, 0.9]} color={C.cream} />
      {/* shelf above */}
      <Box pos={[4, 2, -5.8]} size={[6, 0.1, 0.4]} color={C.woodLight} />
      {/* island */}
      <Box pos={[4, 0.5, -3]} size={[4, 0.9, 1.2]} color={C.woodLight} />
      <Box pos={[4, 1, -3]} size={[4.2, 0.1, 1.4]} color={C.cream} />
      {/* pickup counter (kitchen ane dining vache) */}
      <Box pos={[4, 0.55, -0.5]} size={[5, 1, 0.4]} color={C.wood} />
      <Box pos={[4, 1.08, -0.5]} size={[5.1, 0.08, 0.5]} color={C.terra} />
    </group>
  )
}

/* ---------- Lounge ---------- */
function Lounge() {
  return (
    <group>
      {/* sofa 1 - back wall ni sathe */}
      <Box pos={[-5, 0.35, -5.3]} size={[3, 0.5, 1]} color={C.terra} />
      <Box pos={[-5, 0.9, -5.75]} size={[3, 0.7, 0.25]} color={C.terra} />
      <Box pos={[-6.6, 0.6, -5.3]} size={[0.25, 0.7, 1]} color={C.terra} />
      <Box pos={[-3.4, 0.6, -5.3]} size={[0.25, 0.7, 1]} color={C.terra} />
      <Box pos={[-5, 0.7, -5.2]} size={[2.6, 0.2, 0.7]} color={C.cream} />

      {/* sofa 2 - left wall ni sathe */}
      <Box pos={[-7.3, 0.35, -2.8]} size={[1, 0.5, 2.6]} color={C.terra} />
      <Box pos={[-7.75, 0.9, -2.8]} size={[0.25, 0.7, 2.6]} color={C.terra} />
      <Box pos={[-7.3, 0.7, -2.8]} size={[0.7, 0.2, 2.2]} color={C.cream} />

      {/* coffee table */}
      <mesh position={[-5, 0.3, -3]} castShadow receiveShadow>
        <cylinderGeometry args={[0.6, 0.6, 0.4, 20]} />
        <meshStandardMaterial color={C.wood} />
      </mesh>
    </group>
  )
}

export default function App() {
  const [zone, setZone] = useState('overview')
  const [night, setNight] = useState(false)

  return (
    <div
      style={{
        width: '100vw',
        height: '100vh',
        background: night ? '#1B1410' : C.cream,
      }}
    >
      <Canvas
        flat
        shadows
        orthographic
        camera={{ position: [14, 12, 14], zoom: 50 }}
      >
        <Lights night={night} />
        <Outside night={night} />

        <Box pos={[0, -0.15, -3]} size={[16, 0.3, 18]} color={C.wood} />

        <Zone x={-5.5} z={3.5} w={5} d={5} color={C.cream} />
        <Zone x={3} z={3} w={10} d={6} color={C.woodLight} />
        <Zone x={4} z={-3.5} w={8} d={5} color={C.terra} />
        <Zone x={-4.5} z={-3.5} w={7} d={5} color={C.olive} />
        <Zone x={-4.25} z={-9} w={7.5} d={6} color="#5A3A2A" />
        <Zone x={3.75} z={-9} w={8.5} d={6} color="#E8D3AE" />

        {/* Bahar ni diwalo (building have pachhal sudhi lambu) */}
        <Box pos={[0, 1.5, -12.1]} size={[16.4, 3, 0.2]} color={C.cream} />
        <Box pos={[-8.1, 1.5, -3]} size={[0.2, 3, 18.2]} color={C.cream} />
        <Box pos={[0, 0.15, -11.9]} size={[16, 0.3, 0.2]} color={C.wood} />
        <Box pos={[-7.9, 0.15, -3]} size={[0.2, 0.3, 18]} color={C.wood} />

        {/* Juni pachhal ni diwal have nichi partition (camera ne pachhal na sections dekhay) */}
        <Box pos={[-5.3, 0.6, -6.1]} size={[5.4, 1.2, 0.2]} color={C.cream} />
        <Box pos={[-5.3, 1.24, -6.1]} size={[5.5, 0.08, 0.3]} color={C.wood} />
        <Box pos={[3.4, 0.55, -6.1]} size={[8, 1.1, 0.2]} color={C.cream} />
        <Box pos={[3.4, 1.14, -6.1]} size={[8.1, 0.08, 0.3]} color={C.wood} />
        <mesh position={[3.4, 1.9, -6.1]}>
          <boxGeometry args={[8, 1.45, 0.05]} />
          <meshStandardMaterial color="#CFE3E6" transparent opacity={0.25} depthWrite={false} />
        </mesh>
        <Box pos={[3.4, 2.64, -6.1]} size={[8.1, 0.06, 0.12]} color={C.wood} />

        {tables.map(([x, z], i) => (
          <Table key={i} x={x} z={z} />
        ))}

        <Reception />
        <Kitchen />
        <Lounge />
        <Sections night={night} />

        <Plant x={-7.4} z={5.5} />
        <Plant x={7.4} z={5.5} />
        <Plant x={-1.5} z={-1.5} />

        <Food />
        <Characters />
        <Journey />

        <CameraRig zone={zone} />
      </Canvas>

      <Menu zone={zone} setZone={setZone} />
      <Actions />
      <NightToggle night={night} setNight={setNight} />
      <Intro />
    </div>
  )
}