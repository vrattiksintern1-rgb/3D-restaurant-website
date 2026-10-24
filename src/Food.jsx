import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'

const C = {
  cream: '#F5E6CC',
  terra: '#C8553D',
  olive: '#6B7F3A',
  oliveDark: '#4F6128',
  wood: '#4A3426',
  plate: '#FFF8EC',
  gold: '#D9A441',
  steel: '#9A9A9A',
  ink: '#2B1D14',
}

/* ---------- Nana helpers ---------- */
function Part({ pos, size, color }) {
  return (
    <mesh position={pos}>
      <boxGeometry args={size} />
      <meshStandardMaterial color={color} />
    </mesh>
  )
}

function Cyl({ pos, r, h, color, seg = 16 }) {
  return (
    <mesh position={pos}>
      <cylinderGeometry args={[r, r, h, seg]} />
      <meshStandardMaterial color={color} />
    </mesh>
  )
}

function Ball({ pos, r, color, scale = [1, 1, 1] }) {
  return (
    <mesh position={pos} scale={scale}>
      <sphereGeometry args={[r, 12, 12]} />
      <meshStandardMaterial color={color} />
    </mesh>
  )
}

/* ---------- Dhuvadu (steam) ---------- */
function Steam({ pos, count = 3, size = 0.1, rise = 0.8 }) {
  const refs = useRef([])

  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    refs.current.forEach((m, i) => {
      if (!m) return
      const p = (t * 0.35 + i / count) % 1
      m.position.y = p * rise
      m.position.x = Math.sin(t + i * 2) * 0.05
      m.scale.setScalar(0.6 + p * 1.3)
      m.material.opacity = 0.5 * (1 - p)
    })
  })

  return (
    <group position={pos}>
      {Array.from({ length: count }).map((_, i) => (
        <mesh key={i} ref={(el) => (refs.current[i] = el)}>
          <sphereGeometry args={[size, 8, 8]} />
          <meshStandardMaterial
            color="#FFFFFF"
            transparent
            opacity={0.4}
            depthWrite={false}
          />
        </mesh>
      ))}
    </group>
  )
}

/* ---------- Agni ni jwala (stove) ---------- */
function Burner({ pos }) {
  const g = useRef()

  useFrame(({ clock }) => {
    if (g.current) {
      g.current.scale.y = 0.85 + Math.sin(clock.elapsedTime * 14 + pos[0]) * 0.2
    }
  })

  return (
    <group ref={g} position={pos}>
      {[0, 1, 2, 3, 4].map((i) => {
        const a = (i / 5) * Math.PI * 2
        return (
          <mesh key={i} position={[Math.sin(a) * 0.18, 0, Math.cos(a) * 0.18]}>
            <coneGeometry args={[0.04, 0.12, 6]} />
            <meshStandardMaterial
              color="#FF8A2B"
              emissive="#FF6A00"
              emissiveIntensity={2}
            />
          </mesh>
        )
      })}
    </group>
  )
}

/* ---------- Plate (3 prakar na) ---------- */
function Plate({ pos, kind = 0 }) {
  return (
    <group position={pos}>
      <Cyl pos={[0, 0, 0]} r={0.17} h={0.03} color={C.plate} seg={20} />

      {kind === 0 && (
        <>
          {/* rice + curry */}
          <Ball pos={[-0.04, 0.04, 0]} r={0.09} color="#EFE0BF" scale={[1, 0.55, 1]} />
          <Cyl pos={[0.07, 0.035, 0.02]} r={0.07} h={0.04} color={C.terra} />
          <Ball pos={[0.07, 0.065, 0.02]} r={0.025} color={C.oliveDark} />
        </>
      )}

      {kind === 1 && (
        <>
          {/* salad */}
          <Ball pos={[-0.06, 0.05, 0.03]} r={0.06} color={C.olive} />
          <Ball pos={[0.05, 0.05, -0.04]} r={0.06} color={C.oliveDark} />
          <Ball pos={[0.04, 0.06, 0.07]} r={0.045} color={C.terra} />
          <Ball pos={[-0.03, 0.07, -0.06]} r={0.04} color={C.gold} />
        </>
      )}

      {kind === 2 && (
        <>
          {/* roti + sabji */}
          <Cyl pos={[-0.03, 0.03, 0]} r={0.12} h={0.02} color={C.gold} />
          <Cyl pos={[-0.03, 0.05, 0]} r={0.12} h={0.02} color="#C9902E" />
          <Cyl pos={[-0.03, 0.07, 0]} r={0.12} h={0.02} color={C.gold} />
          <Cyl pos={[0.1, 0.04, 0.06]} r={0.05} h={0.05} color={C.terra} />
        </>
      )}
    </group>
  )
}

/* ---------- Juice no glass ---------- */
function Glass({ pos }) {
  return (
    <group position={pos}>
      <Cyl pos={[0, 0.07, 0]} r={0.05} h={0.14} color="#E39A3B" seg={12} />
      <Cyl pos={[0, 0.145, 0]} r={0.052} h={0.01} color={C.cream} seg={12} />
    </group>
  )
}

/* ---------- Table nu center (bowl + candle) ---------- */
function CenterPiece({ pos }) {
  return (
    <group position={pos}>
      <Cyl pos={[-0.08, 0.04, 0]} r={0.15} h={0.08} color={C.plate} seg={20} />
      <Cyl pos={[-0.08, 0.085, 0]} r={0.12} h={0.02} color={C.terra} seg={20} />
      <Steam pos={[-0.08, 0.1, 0]} count={2} size={0.06} rise={0.5} />

      {/* candle */}
      <Cyl pos={[0.2, 0.07, 0.05]} r={0.035} h={0.14} color={C.cream} seg={10} />
      <mesh position={[0.2, 0.17, 0.05]}>
        <sphereGeometry args={[0.03, 8, 8]} />
        <meshStandardMaterial
          color="#FFB35C"
          emissive="#FF9A2B"
          emissiveIntensity={2.5}
        />
      </mesh>
    </group>
  )
}

/* ---------- Pot ---------- */
function Pot({ pos, color = C.steel, tall = false }) {
  const h = tall ? 0.45 : 0.32
  return (
    <group position={pos}>
      <Cyl pos={[0, 0, 0]} r={0.26} h={h} color={color} />
      <Cyl pos={[0, h / 2 - 0.02, 0]} r={0.23} h={0.02} color={C.terra} />
      <Part pos={[0.3, 0.05, 0]} size={[0.1, 0.04, 0.06]} color={C.ink} />
      <Part pos={[-0.3, 0.05, 0]} size={[0.1, 0.04, 0.06]} color={C.ink} />
      <Steam pos={[0, h / 2, 0]} count={3} size={0.1} rise={0.9} />
    </group>
  )
}

/* ---------- Tables ane customers ---------- */
const tableAt = [
  [0, 1.5], [3, 1.5], [6, 1.5],
  [0, 4.5], [3, 4.5], [6, 4.5],
]

// Characters.jsx ma je guests chhe te j (kon kya table par, kai baju)
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

function DiningFood() {
  const topY = 0.92
  return (
    <group>
      {tableAt.map(([x, z], i) => (
        <CenterPiece key={'c' + i} pos={[x, topY, z]} />
      ))}

      {guests.map((g, i) => {
        const [tx, tz] = tableAt[g.t]
        const s = Math.sin(g.a)
        const c = Math.cos(g.a)
        return (
          <group key={'p' + i}>
            <Plate pos={[tx + s * 0.42, topY, tz + c * 0.42]} kind={i % 3} />
            <Glass pos={[tx + s * 0.5 + c * 0.22, topY, tz + c * 0.5 - s * 0.22]} />
          </group>
        )
      })}
    </group>
  )
}

/* ---------- Kitchen ---------- */
function KitchenFood() {
  return (
    <group>
      {/* Stove (back counter par) */}
      <Part pos={[3.5, 1.23, -5.2]} size={[2.4, 0.06, 0.7]} color={C.ink} />
      <Burner pos={[2.9, 1.32, -5.2]} />
      <Burner pos={[4.1, 1.32, -5.2]} />
      <Pot pos={[2.9, 1.5, -5.2]} color={C.steel} />
      <Pot pos={[4.1, 1.5, -5.2]} color="#B87333" />

      {/* Motu stock pot (jamni baju) */}
      <Pot pos={[5.9, 1.42, -5.2]} color={C.steel} tall />

      {/* Island: cutting board + veggies + knife */}
      <Part pos={[2.8, 1.07, -3.25]} size={[0.7, 0.04, 0.45]} color="#C9A06B" />
      <Ball pos={[2.6, 1.15, -3.25]} r={0.07} color={C.terra} />
      <Ball pos={[2.75, 1.15, -3.15]} r={0.07} color={C.terra} />
      <Ball pos={[2.9, 1.14, -3.3]} r={0.06} color={C.gold} />
      <Cyl pos={[3.0, 1.12, -3.2]} r={0.04} h={0.2} color={C.olive} seg={10} />
      <Part pos={[2.7, 1.1, -3.4]} size={[0.3, 0.01, 0.06]} color="#D8D8D8" />
      <Part pos={[2.5, 1.1, -3.4]} size={[0.14, 0.03, 0.05]} color={C.ink} />

      {/* Island: tava ma sabji (dhuvadu sathe) */}
      <group position={[5.2, 1.08, -3.25]}>
        <Cyl pos={[0, 0, 0]} r={0.3} h={0.06} color={C.ink} seg={20} />
        <Cyl pos={[0, 0.03, 0]} r={0.25} h={0.02} color={C.gold} seg={20} />
        <Ball pos={[-0.08, 0.07, 0.05]} r={0.05} color={C.terra} />
        <Ball pos={[0.1, 0.07, -0.05]} r={0.05} color={C.olive} />
        <Ball pos={[0.0, 0.07, -0.1]} r={0.04} color={C.terra} />
        <Part pos={[0.5, 0.01, 0]} size={[0.4, 0.03, 0.06]} color={C.ink} />
        <Steam pos={[0, 0.1, 0]} count={3} size={0.08} rise={0.7} />
      </group>

      {/* Island: salad bowl */}
      <group position={[4.0, 1.1, -2.75]}>
        <Cyl pos={[0, 0, 0]} r={0.2} h={0.1} color={C.plate} seg={20} />
        <Ball pos={[-0.05, 0.08, 0]} r={0.09} color={C.olive} />
        <Ball pos={[0.06, 0.09, 0.03]} r={0.08} color={C.oliveDark} />
        <Ball pos={[0.0, 0.12, -0.05]} r={0.05} color={C.terra} />
      </group>

      {/* Pickup counter: taiyar plates */}
      <Plate pos={[2.8, 1.15, -0.5]} kind={0} />
      <Plate pos={[3.8, 1.15, -0.5]} kind={1} />
      <Plate pos={[4.8, 1.15, -0.5]} kind={2} />
      <Plate pos={[5.8, 1.15, -0.5]} kind={0} />
      <Steam pos={[2.8, 1.25, -0.5]} count={2} size={0.06} rise={0.5} />
      <Steam pos={[4.8, 1.25, -0.5]} count={2} size={0.06} rise={0.5} />

      {/* Service bell */}
      <Cyl pos={[1.95, 1.14, -0.5]} r={0.1} h={0.03} color={C.gold} seg={16} />
      <Ball pos={[1.95, 1.18, -0.5]} r={0.07} color={C.gold} scale={[1, 0.8, 1]} />

      {/* Shelf par masala jars */}
      {[1.8, 2.6, 3.4, 4.2, 5.0, 5.8].map((x, i) => (
        <group key={i} position={[x, 2.2, -5.8]}>
          <Cyl
            pos={[0, 0, 0]}
            r={0.1}
            h={0.25}
            color={[C.terra, C.olive, C.gold, C.cream, C.terra, C.olive][i]}
            seg={12}
          />
          <Cyl pos={[0, 0.14, 0]} r={0.105} h={0.04} color={C.ink} seg={12} />
        </group>
      ))}
    </group>
  )
}

export default function Food() {
  return (
    <group>
      
      <KitchenFood />
    </group>
  )
}