import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'

const C = {
  cream: '#F5E6CC',
  terra: '#C8553D',
  olive: '#6B7F3A',
  wood: '#4A3426',
  white: '#FFF8EC',
  ink: '#2B1D14',
}
const SKIN = ['#F1C9A5', '#E8B08A', '#C98B62', '#A8683F']

function Part({ pos, size, color }) {
  return (
    <mesh position={pos} castShadow>
      <boxGeometry args={size} />
      <meshStandardMaterial color={color} />
    </mesh>
  )
}

function Person({
  pos = [0, 0.1, 0],
  rot = 0,
  shirt = C.olive,
  pants = C.ink,
  skin = SKIN[1],
  hair = C.ink,
  chef = false,
  apron = null,
  seated = false,
  mode = 'idle',
  path = null,
  speed = 1.3,
  phase = 0,
  tray = false,
}) {
  const root = useRef()
  const head = useRef()
  const armL = useRef()
  const armR = useRef()
  const legL = useRef()
  const legR = useRef()
  const st = useRef({
    i: 0,
    wait: phase,
    x: path ? path[0][0] : 0,
    z: path ? path[0][1] : 0,
  })

  useFrame((state, delta) => {
    const dt = Math.min(delta, 0.05)
    const t = state.clock.elapsedTime + phase * 3
    const s = st.current
    let walking = false

    if (path) {
      if (s.wait > 0) {
        s.wait -= dt
      } else {
        const tgt = path[(s.i + 1) % path.length]
        const dx = tgt[0] - s.x
        const dz = tgt[1] - s.z
        const d = Math.hypot(dx, dz)
        const step = speed * dt
        if (d <= step) {
          s.x = tgt[0]
          s.z = tgt[1]
          s.i = (s.i + 1) % path.length
          s.wait = 1.2
        } else {
          s.x += (dx / d) * step
          s.z += (dz / d) * step
          walking = true
          root.current.rotation.y = Math.atan2(dx, dz)
        }
      }
      root.current.position.set(s.x, pos[1], s.z)
    }

    const aL = armL.current
    const aR = armR.current

    if (path) {
      if (walking) {
        const sw = Math.sin(t * 8)
        aL.rotation.x = -sw * 0.5
        aR.rotation.x = tray ? -1.3 : sw * 0.5
        if (legL.current) {
          legL.current.rotation.x = sw * 0.7
          legR.current.rotation.x = -sw * 0.7
        }
      } else {
        aL.rotation.x = Math.sin(t * 1.5) * 0.05
        aR.rotation.x = tray ? -1.3 : Math.sin(t * 1.5 + 1) * 0.05
        if (legL.current) {
          legL.current.rotation.x *= 0.8
          legR.current.rotation.x *= 0.8
        }
      }
    } else if (mode === 'work') {
      aL.rotation.x = -1.45 + Math.sin(t * 5) * 0.25
      aR.rotation.x = -1.45 + Math.sin(t * 5 + 1.6) * 0.25
    } else if (mode === 'sit') {
      aL.rotation.x = -1.2 + Math.sin(t * 0.7) * 0.05
      aR.rotation.x = -1.2 - Math.max(0, Math.sin(t * 1.1)) * 0.9
    } else if (mode === 'talk') {
      aL.rotation.x = Math.sin(t * 1.2) * 0.05
      aR.rotation.x = -2.0 + Math.sin(t * 2.2) * 0.3
    } else {
      aL.rotation.x = Math.sin(t * 1.5) * 0.05
      aR.rotation.x = tray ? -1.3 : Math.sin(t * 1.5 + 1) * 0.05
    }

    head.current.rotation.y = Math.sin(t * 0.5) * 0.25
    head.current.rotation.x = Math.sin(t * 0.9) * 0.05
  })

  const hip = seated ? 0.05 : 0.5

  return (
    <group
      ref={root}
      position={path ? [path[0][0], pos[1], path[0][1]] : pos}
      rotation={[0, rot, 0]}
    >
      {/* Legs */}
      {seated ? (
        <>
          <Part pos={[-0.1, 0.06, 0.2]} size={[0.14, 0.12, 0.42]} color={pants} />
          <Part pos={[0.1, 0.06, 0.2]} size={[0.14, 0.12, 0.42]} color={pants} />
          <Part pos={[-0.1, -0.2, 0.38]} size={[0.12, 0.42, 0.12]} color={pants} />
          <Part pos={[0.1, -0.2, 0.38]} size={[0.12, 0.42, 0.12]} color={pants} />
        </>
      ) : (
        <>
          <group ref={legL} position={[-0.1, 0.5, 0]}>
            <Part pos={[0, -0.25, 0]} size={[0.14, 0.5, 0.16]} color={pants} />
          </group>
          <group ref={legR} position={[0.1, 0.5, 0]}>
            <Part pos={[0, -0.25, 0]} size={[0.14, 0.5, 0.16]} color={pants} />
          </group>
        </>
      )}

      {/* Upper body */}
      <group position={[0, hip, 0]}>
        <Part pos={[0, 0.28, 0]} size={[0.42, 0.56, 0.26]} color={shirt} />
        {apron && (
          <Part pos={[0, 0.2, 0.14]} size={[0.36, 0.4, 0.03]} color={apron} />
        )}

        <group ref={armL} position={[-0.27, 0.5, 0]}>
          <Part pos={[0, -0.25, 0]} size={[0.11, 0.5, 0.11]} color={shirt} />
          <Part pos={[0, -0.53, 0]} size={[0.1, 0.1, 0.1]} color={skin} />
        </group>
        <group ref={armR} position={[0.27, 0.5, 0]}>
          <Part pos={[0, -0.25, 0]} size={[0.11, 0.5, 0.11]} color={shirt} />
          <Part pos={[0, -0.53, 0]} size={[0.1, 0.1, 0.1]} color={skin} />
        </group>

        {tray && (
          <group position={[0.27, 0.38, 0.55]}>
            <Part pos={[0, 0, 0]} size={[0.4, 0.03, 0.4]} color={C.cream} />
            <mesh position={[0, 0.07, 0]} castShadow>
              <sphereGeometry args={[0.09, 10, 10]} />
              <meshStandardMaterial color={C.terra} />
            </mesh>
          </group>
        )}

        {/* Head */}
        <group ref={head} position={[0, 0.74, 0]}>
          <mesh castShadow>
            <sphereGeometry args={[0.17, 14, 14]} />
            <meshStandardMaterial color={skin} />
          </mesh>
          <Part pos={[-0.06, 0.03, 0.16]} size={[0.035, 0.035, 0.02]} color={C.ink} />
          <Part pos={[0.06, 0.03, 0.16]} size={[0.035, 0.035, 0.02]} color={C.ink} />
          {chef ? (
            <>
              <mesh position={[0, 0.19, 0]} castShadow>
                <cylinderGeometry args={[0.17, 0.17, 0.12, 14]} />
                <meshStandardMaterial color={C.white} />
              </mesh>
              <mesh position={[0, 0.36, 0]} castShadow>
                <sphereGeometry args={[0.21, 12, 12]} />
                <meshStandardMaterial color={C.white} />
              </mesh>
            </>
          ) : (
            <mesh position={[0, 0.07, -0.02]} scale={[1, 0.75, 1]} castShadow>
              <sphereGeometry args={[0.18, 12, 12]} />
              <meshStandardMaterial color={hair} />
            </mesh>
          )}
        </group>
      </group>
    </group>
  )
}

const tableAt = [
  [0, 1.5], [3, 1.5], [6, 1.5],
  [0, 4.5], [3, 4.5], [6, 4.5],
]

const guests = [
  { t: 0, a: Math.PI / 2 },
  { t: 0, a: (3 * Math.PI) / 2 },
  { t: 1, a: 0 },
  { t: 1, a: Math.PI },
  { t: 2, a: Math.PI / 2 },
  { t: 3, a: Math.PI / 2 },
  { t: 3, a: (3 * Math.PI) / 2 },
  { t: 4, a: 0 },
  { t: 4, a: Math.PI },
  { t: 5, a: Math.PI / 2 },
]

const shirts = [
  '#3E5C76', '#8C3B2E', '#D9A441', '#5C6B3A', '#7A4E7E',
  '#2F6F73', '#B5651D', '#5B6C8F', '#A34A5A', '#4F7942',
]
const hairs = ['#2B1D14', '#5A3A22', '#1A1A1A', '#8B5A2B', '#2B1D14']

const waiters = [
  { path: [[4.5, 0.2], [4.5, 3], [7.4, 3], [4.5, 3]], phase: 0 },
  { path: [[1.5, 0.2], [1.5, 3], [-1.4, 3], [1.5, 3]], phase: 1.5 },
  { path: [[4.5, 0.2], [4.5, 5.7], [4.5, 3]], phase: 3 },
  { path: [[1.5, 5.7], [1.5, 3], [7.4, 3], [1.5, 3]], phase: 2.2 },
  { path: [[-2.6, -2], [-4, -2], [-4, -4.2], [-2.6, -4.2]], phase: 0.8 },
]

export default function Characters() {
  return (
    <group>
      {/* 3 Chefs */}
      <Person pos={[2.8, 0.1, -4.2]} chef shirt={C.white} apron={C.wood} skin={SKIN[1]} mode="work" phase={0} />
      <Person pos={[5.2, 0.1, -4.2]} chef shirt={C.white} apron={C.wood} skin={SKIN[3]} mode="work" phase={1} />
      <Person pos={[4, 0.1, -1.5]} chef shirt={C.white} apron={C.wood} skin={SKIN[2]} mode="work" phase={2} />
    </group>
  )
}