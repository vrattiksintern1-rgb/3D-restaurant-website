import { Canvas } from '@react-three/fiber'
import Characters from './Characters'
import Babies from './Babies'
import { useCallback, useEffect, useRef, useState } from 'react'
import CameraRig, { ZONE_KEYS, camState, safeArea, useViewport } from './CameraRig'
import Menu from './Menu'
import Actions from './Actions'
import Intro from './Intro'
import Lights, { BACKDROP, NightToggle } from './Lights'
import { Crossfade, Grabber, Ready, SceneFx, SoundToggle } from './Ambience'
import { CREDIT_URL } from './ui'
import Food from './Food'
import Journey from './Journey'
import BarStory from './BarStory'
import Outside from './Outside'
import Neighbourhood from './Neighbourhood'
import Ground from './Ground'
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

/* ---------- Dining: tables, chairs ane customers have Journey.jsx ma chhe (DINING_HALL config) ---------- */

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
  const [revealed, setRevealed] = useState(false)
  const sceneReady = useRef(false)
  const grab = useRef()
  const fade = useRef()
  const [vw, vh] = useViewport()
  const compact = safeArea(vw, vh).compact

  const onReveal = useCallback(() => setRevealed(true), [])
  const onSceneReady = useCallback(() => (sceneReady.current = true), [])

  const toggleNight = () => {
    fade.current?.play(grab.current?.())
    setNight((n) => !n)
  }

  // Touch swipe on the scene: left = next section, right = previous (zoomed in, one finger pans instead)
  useEffect(() => {
    let start = null
    const onStart = (e) => {
      start = e.touches.length === 1 && e.target.tagName === 'CANVAS' && !camState.zoomedIn
        ? { x: e.touches[0].clientX, y: e.touches[0].clientY, t: performance.now() }
        : null
    }
    const onEnd = (e) => {
      if (!start) return
      const dx = e.changedTouches[0].clientX - start.x
      const dy = e.changedTouches[0].clientY - start.y
      const fast = performance.now() - start.t < 800
      start = null
      if (!fast || Math.abs(dx) < 50 || Math.abs(dx) < Math.abs(dy) * 1.4) return
      setZone((z) => {
        const n = ZONE_KEYS.length
        const i = ZONE_KEYS.indexOf(z) + (dx < 0 ? 1 : -1)
        return ZONE_KEYS[(i + n) % n]
      })
    }
    window.addEventListener('touchstart', onStart, { passive: true })
    window.addEventListener('touchend', onEnd, { passive: true })
    return () => {
      window.removeEventListener('touchstart', onStart)
      window.removeEventListener('touchend', onEnd)
    }
  }, [])

  return (
    <div
      className={`app${revealed ? ' is-revealed' : ''}${compact ? ' is-compact' : ''}${night ? ' is-night' : ''}`}
      style={{
        position: 'fixed',
        inset: 0,
        overflow: 'hidden',
        background: night ? BACKDROP.night : BACKDROP.day,
      }}
    >
      <Canvas
        flat
        shadows="percentage"
        orthographic
        camera={{ position: [230, 200, 230], zoom: 50, far: 4000 }}
      >
        <Lights night={night} />
        <Outside night={night} />
        <Neighbourhood night={night} />
        <Ground />

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

        <Reception />
        <Kitchen />
        <Lounge />
        <Sections night={night} />

        <Plant x={-7.4} z={5.5} />
        <Plant x={7.4} z={5.5} />
        <Plant x={-1.5} z={-1.5} />

        <Food />
        <Characters />
        <Babies />
        <Journey night={night} />
        <BarStory night={night} />

        <Grabber api={grab} />
        <Ready onReady={onSceneReady} />
        <CameraRig zone={zone} started={revealed} />
      </Canvas>

      <Crossfade ref={fade} />
      <SceneFx night={night} />

      <Menu zone={zone} setZone={setZone} compact={compact} />
      <div className="top-actions reveal" style={{ '--i': 1 }}>
        <SoundToggle />
        <NightToggle night={night} onToggle={toggleNight} compact={compact} />
      </div>
      <Actions />
      <a className="credit reveal" style={{ '--i': 3 }} href={CREDIT_URL} target="_blank" rel="noopener noreferrer">
        Crafted by Vrattiks
      </a>
      <Intro sceneReady={sceneReady} onReveal={onReveal} />
    </div>
  )
}