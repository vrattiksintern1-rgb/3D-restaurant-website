import { useEffect, useRef } from 'react'
import { useThree } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import gsap from 'gsap'

export const ZONES = {
  overview: {
    label: 'Overview',
    desc: 'The whole restaurant, from above.',
    target: [0, 0, 0],
    pos: [14, 12, 14],
    zoom: 50,
  },
  reception: {
    label: 'Reception',
    desc: 'A warm welcome at our front desk.',
    target: [-5.5, 0.6, 4],
    pos: [3.5, 8.3, 13],
    zoom: 105,
  },
  dining: {
    label: 'Dining Hall',
    desc: 'Candle-lit tables for slow evenings.',
    target: [3, 0.6, 3],
    pos: [12, 8.3, 12],
    zoom: 70,
  },
  kitchen: {
    label: 'Open Kitchen',
    desc: 'Watch our chefs cook over fire.',
    target: [4, 0.6, -3.5],
    pos: [13, 8.3, 5.5],
    zoom: 80,
  },
  lounge: {
    label: 'Lounge',
    desc: 'Sink into a sofa before dinner.',
    target: [-4.5, 0.6, -3.5],
    pos: [4.5, 8.3, 5.5],
    zoom: 90,
  },
}

export default function CameraRig({ zone }) {
  const controls = useRef()
  const { camera } = useThree()

  useEffect(() => {
    const z = ZONES[zone]
    const c = controls.current
    if (!z || !c) return

    const tl = gsap.timeline({
      defaults: { duration: 1.6, ease: 'power3.inOut' },
      onUpdate: () => {
        camera.updateProjectionMatrix()
        c.update()
      },
    })
    tl.to(camera.position, { x: z.pos[0], y: z.pos[1], z: z.pos[2] }, 0)
    tl.to(c.target, { x: z.target[0], y: z.target[1], z: z.target[2] }, 0)
    tl.to(camera, { zoom: z.zoom }, 0)

    return () => tl.kill()
  }, [zone, camera])

  return (
    <OrbitControls
      ref={controls}
      makeDefault
      enablePan={false}
      minZoom={30}
      maxZoom={160}
      minPolarAngle={Math.PI / 5}
      maxPolarAngle={Math.PI / 2.6}
    />
  )
}

export function Menu({ zone, setZone }) {
  const items = Object.entries(ZONES)
  const cur = ZONES[zone]

  return (
    <div
      style={{
        position: 'fixed',
        left: 24,
        top: 24,
        width: 250,
        background: 'rgba(245, 230, 204, 0.93)',
        border: '1px solid #4A3426',
        borderRadius: 16,
        padding: '20px 18px',
        fontFamily: 'Georgia, serif',
        color: '#4A3426',
        boxShadow: '0 10px 30px rgba(74, 52, 38, 0.25)',
        zIndex: 10,
      }}
    >
      <div style={{ fontSize: 12, letterSpacing: 3, color: '#C8553D' }}>
        WELCOME TO
      </div>
      <div
        style={{
          fontSize: 28,
          fontWeight: 700,
          lineHeight: 1.1,
          margin: '4px 0 16px',
        }}
      >
        The Food House
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {items.map(([key, v]) => {
          const active = key === zone
          return (
            <button
              key={key}
              onClick={() => setZone(key)}
              style={{
                textAlign: 'left',
                padding: '10px 14px',
                borderRadius: 10,
                border: '1px solid #4A3426',
                background: active ? '#C8553D' : 'transparent',
                color: active ? '#F5E6CC' : '#4A3426',
                fontFamily: 'Georgia, serif',
                fontSize: 15,
                cursor: 'pointer',
              }}
            >
              {v.label}
            </button>
          )
        })}
      </div>

      <div
        style={{
          marginTop: 16,
          fontSize: 13,
          fontStyle: 'italic',
          color: '#6B4A35',
        }}
      >
        {cur.desc}
      </div>
    </div>
  )
}