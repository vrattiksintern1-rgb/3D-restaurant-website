import { createRef, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { CatmullRomCurve3, Vector3 } from 'three'

const C = {
  cream: '#F5E6CC',
  terra: '#C8553D',
  olive: '#6B7F3A',
  oliveDark: '#4F6128',
  wood: '#4A3426',
  gold: '#D9A441',
  ink: '#2B1D14',
  grass: '#9DAF6A',
  asphalt: '#4A4542',
  walk: '#D8C4A0',
  glass: '#2F3B42',
  tire: '#2B2523',
}

/* ---------- Layout ---------- */
const G = -0.3               // bahar ni jamin (ground) nu top
const ROAD_Y = -0.27         // rasto ane parking nu top
const END = 70               // rasta na cheda (gadi aahi thi pachhi phare)
const ROAD = [11.4, 15.4]    // restaurant ni saame no rasto (z)
const LANE_E = 12.4          // east (+x) jati gadio
const LANE_W = 14.4          // west (-x) jati gadio
const WALK_N = [10.2, 11.4]  // restaurant baju ni footpath
const WALK_F = [15.4, 16.6]  // same baju ni footpath
const DRIVE = [14, 17]       // parking ma javano raasto (x)
const LOT = { x0: 10, x1: 21.5, z0: -7, z1: 10.2 }
const AISLE_X = 15.5
const ROW_W = 12.1           // parking ni west line (gadi restaurant taraf moh rakhe)
const ROW_E = 18.9           // parking ni east line
const SPOT_Z = [-3.9, -1.6, 0.7, 3.0, 5.3, 7.6]
const CROSS_X = -4.9         // porch ni saame zebra crossing

const PARKED = [
  [ROW_W, 0, '#3E5C76'], [ROW_W, 1, C.cream], [ROW_W, 3, '#8C3B2E'], [ROW_W, 5, C.olive],
  [ROW_E, 1, C.gold], [ROW_E, 4, '#5B6C8F'], [ROW_E, 5, '#A34A5A'],
]
const FREE_E = [0, 2, 3]     // east line ni khali jagya (animated gadi mate)

/* ---------- Trees (seed vali random, dar vakhte same jagya) ---------- */
let seed = 7
const rng = () => {
  seed = (seed * 16807) % 2147483647
  return (seed - 1) / 2147483646
}
const BLOCK = [
  [-9, 9, -13, 7],                    // restaurant
  [-2.5, 9, 5.5, 10.2],               // garden terrace
  [-8, -2.5, 5.5, 10.2],              // porch + walkway
  [LOT.x0 - 1.2, LOT.x1, LOT.z0, LOT.z1], // parking
  [-100, 100, WALK_N[0] - 0.4, WALK_F[1] + 0.6], // rasto + footpath
]
const blocked = (x, z, pad) =>
  BLOCK.some(([x0, x1, z0, z1]) => x > x0 - pad && x < x1 + pad && z > z0 - pad && z < z1 + pad)
const AREAS = [
  [-20, 26, -21, -14, 16],   // pachhal
  [-22, -10, -13, 9.5, 11],  // dabi baju
  [-22, 28, 18, 26, 16],     // rasta ni same
  [22.5, 28, -13, 9.5, 7],   // parking ni baju
]
const TREES = []
AREAS.forEach(([x0, x1, z0, z1, n]) => {
  let made = 0
  for (let tries = 0; made < n && tries < 400; tries++) {
    const x = x0 + rng() * (x1 - x0)
    const z = z0 + rng() * (z1 - z0)
    if (blocked(x, z, 1)) continue
    if (TREES.some((t) => Math.hypot(t.x - x, t.z - z) < 2.2)) continue
    TREES.push({ x, z, s: 0.8 + rng() * 0.5, kind: rng() < 0.45 ? 0 : 1, rot: rng() * 6 })
    made++
  }
})
// Building ni dabi baju nana chhod
const BUSHES = [[-9.2, 8.6], [-9.4, 4.5], [-9.3, -2], [-9.3, -8.5]]

/* ---------- Nana bhagao ---------- */
function Slab({ x0, x1, z0, z1, top, h = 0.1, color }) {
  return (
    <mesh position={[(x0 + x1) / 2, top - h / 2, (z0 + z1) / 2]} receiveShadow>
      <boxGeometry args={[x1 - x0, h, z1 - z0]} />
      <meshStandardMaterial color={color} />
    </mesh>
  )
}
function Part({ pos, size, color, ...mat }) {
  return (
    <mesh position={pos} castShadow>
      <boxGeometry args={size} />
      <meshStandardMaterial color={color} {...mat} />
    </mesh>
  )
}

function Tree({ x, z, s, kind, rot }) {
  return (
    <group position={[x, G, z]} scale={s} rotation={[0, rot, 0]}>
      <mesh position={[0, kind ? 0.6 : 0.4, 0]} castShadow>
        <cylinderGeometry args={[0.1, 0.16, kind ? 1.2 : 0.8, 7]} />
        <meshStandardMaterial color={C.wood} flatShading />
      </mesh>
      {kind === 0 ? (
        [[1.0, 1.4, 1.3, C.oliveDark], [0.75, 1.2, 2.0, '#5E7330'], [0.5, 1.0, 2.6, C.oliveDark]].map(
          ([r, h, y, col]) => (
            <mesh key={y} position={[0, y, 0]} castShadow>
              <coneGeometry args={[r, h, 7]} />
              <meshStandardMaterial color={col} flatShading />
            </mesh>
          )
        )
      ) : (
        [[0.9, [0, 1.8, 0], C.olive], [0.65, [0.4, 2.3, 0.2], '#7A8F45'], [0.6, [-0.35, 2.1, -0.3], C.oliveDark]].map(
          ([r, p, col]) => (
            <mesh key={r} position={p} castShadow>
              <icosahedronGeometry args={[r, 0]} />
              <meshStandardMaterial color={col} flatShading />
            </mesh>
          )
        )
      )}
    </group>
  )
}

function Bush({ x, z }) {
  return (
    <group position={[x, G, z]}>
      <mesh position={[0, 0.3, 0]} castShadow>
        <icosahedronGeometry args={[0.5, 0]} />
        <meshStandardMaterial color={C.olive} flatShading />
      </mesh>
      <mesh position={[0.35, 0.25, 0.15]} castShadow>
        <icosahedronGeometry args={[0.35, 0]} />
        <meshStandardMaterial color={C.oliveDark} flatShading />
      </mesh>
    </group>
  )
}

function Lamp({ x, z, flip = false, glow = true, night }) {
  return (
    <group position={[x, G, z]} rotation={[0, flip ? Math.PI : 0, 0]}>
      <mesh position={[0, 1.5, 0]} castShadow>
        <cylinderGeometry args={[0.05, 0.08, 3, 8]} />
        <meshStandardMaterial color={C.ink} />
      </mesh>
      <Part pos={[0, 2.97, 0.3]} size={[0.06, 0.06, 0.65]} color={C.ink} />
      <Part pos={[0, 2.9, 0.65]} size={[0.3, 0.12, 0.4]} color={C.ink} />
      <mesh position={[0, 2.83, 0.65]}>
        <boxGeometry args={[0.24, 0.03, 0.32]} />
        <meshStandardMaterial color="#FFE2A8" emissive="#FFB35C" emissiveIntensity={night ? 2.5 : 0.1} />
      </mesh>
      {glow && (
        <pointLight position={[0, 2.5, 0.8]} color="#FFB35C" intensity={night ? 10 : 0} distance={9} decay={2} />
      )}
    </group>
  )
}

// "P" parking nu board
function ParkingSign({ x, z }) {
  return (
    <group position={[x, G, z]}>
      <Part pos={[0, 0.9, 0]} size={[0.08, 1.8, 0.08]} color={C.ink} />
      <Part pos={[0, 2, 0.05]} size={[0.7, 0.7, 0.05]} color={C.terra} />
      <Part pos={[-0.12, 2, 0.09]} size={[0.08, 0.46, 0.03]} color={C.cream} />
      <Part pos={[0.02, 2.19, 0.09]} size={[0.24, 0.08, 0.03]} color={C.cream} />
      <Part pos={[0.02, 2.03, 0.09]} size={[0.24, 0.08, 0.03]} color={C.cream} />
      <Part pos={[0.13, 2.11, 0.09]} size={[0.08, 0.2, 0.03]} color={C.cream} />
    </group>
  )
}

/* ---------- Gadi (nose +z taraf) ---------- */
function Car({ gref, color, night = false, lights = false, pos = [0, 0, 0], rot = 0 }) {
  const own = useRef()
  const root = gref || own
  const wheels = useRef([])
  const last = useRef(null)

  // Gadi jetli chale tetla paida phare
  useFrame(() => {
    const g = root.current
    if (!g) return
    const p = g.position
    if (last.current) {
      const dx = p.x - last.current.x
      const dz = p.z - last.current.z
      const fwd = dx * Math.sin(g.rotation.y) + dz * Math.cos(g.rotation.y)
      wheels.current.forEach((w) => w && (w.rotation.x += fwd / 0.3))
      last.current.copy(p)
    } else last.current = p.clone()
  })

  return (
    <group ref={root} position={pos} rotation={[0, rot, 0]}>
      <Part pos={[0, 0.55, 0]} size={[1.6, 0.5, 3.4]} color={color} />
      <Part pos={[0, 1.04, -0.2]} size={[1.4, 0.48, 1.8]} color={C.glass} />
      <Part pos={[0, 1.3, -0.25]} size={[1.46, 0.07, 1.6]} color={color} />
      <Part pos={[0, 0.38, 1.72]} size={[1.62, 0.18, 0.12]} color="#3A3330" />
      <Part pos={[0, 0.38, -1.72]} size={[1.62, 0.18, 0.12]} color="#3A3330" />
      {[-0.55, 0.55].map((x) => (
        <group key={x}>
          <Part
            pos={[x, 0.66, 1.71]} size={[0.32, 0.14, 0.04]} color="#FFE2A8"
            emissive="#FFD58A" emissiveIntensity={night && lights ? 3 : 0.2}
          />
          <Part
            pos={[x, 0.66, -1.71]} size={[0.3, 0.12, 0.04]} color={C.terra}
            emissive="#FF3B1F" emissiveIntensity={night && lights ? 2 : 0.1}
          />
        </group>
      ))}
      {[[-0.8, 1.1], [0.8, 1.1], [-0.8, -1.1], [0.8, -1.1]].map(([x, z], i) => (
        <group key={i} position={[x, 0.3, z]} ref={(el) => (wheels.current[i] = el)}>
          <mesh rotation={[0, 0, Math.PI / 2]} castShadow>
            <cylinderGeometry args={[0.3, 0.3, 0.22, 14]} />
            <meshStandardMaterial color={C.tire} />
          </mesh>
          <Part pos={[x > 0 ? 0.12 : -0.12, 0, 0]} size={[0.02, 0.36, 0.08]} color="#9A8F86" />
        </group>
      ))}
      {/* Raate headlight no prakash rasta par */}
      {lights && night && (
        <mesh position={[0, 0.03, 3.4]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[1.8, 3]} />
          <meshBasicMaterial color="#FFD58A" transparent opacity={0.22} depthWrite={false} />
        </mesh>
      )}
    </group>
  )
}

/* ---------- Gadio ni chaal ---------- */
const P = (x, z) => new Vector3(x, ROAD_Y, z)
const curve = (pts) => new CatmullRomCurve3(pts, false, 'centripetal')
const arrivePath = (zk) =>
  curve([
    P(-END, LANE_E), P(0, LANE_E), P(11, LANE_E), P(13.8, 12.1), P(15.2, 10.6), P(AISLE_X, 9),
    P(AISLE_X, zk + 2.6), P(16.4, zk + 0.9), P(17.7, zk + 0.1), P(ROW_E, zk),
  ])
// Spot mathi reverse ma bahar (gadi nu moh rasta taraf thai jay)
const reversePath = (zk) =>
  curve([P(ROW_E, zk), P(17.4, zk - 0.1), P(16.2, zk - 0.8), P(AISLE_X, zk - 2.2)])
const exitPath = (zk) =>
  curve([
    P(AISLE_X, zk - 2.2), P(AISLE_X, zk), P(AISLE_X, 9), P(15.2, 11.6), P(13.8, 13.9),
    P(11, LANE_W), P(0, LANE_W), P(-END, LANE_W),
  ])

const TRAFFIC = [
  { x: -40, dir: 1, cruise: 5, color: '#7A4E7E' },
  { x: 12, dir: 1, cruise: 4.6, color: C.gold },
  { x: 30, dir: -1, cruise: 4.8, color: '#2F6F73' },
  { x: -22, dir: -1, cruise: 5.2, color: C.cream },
]

// Aagal gadi hoy to dhimi pado (takkar na thay)
const gapAhead = (cars, self, x, z, dir) => {
  let gap = Infinity
  for (const o of cars) {
    if (o === self || !o.on || Math.abs(o.z - z) > 1) continue
    const d = (o.x - x) * dir
    if (d > 0 && d < gap) gap = d
  }
  return gap
}
const follow = (gap, cruise) => Math.max(0, Math.min(cruise, (gap - 4.5) * 1.2))
const laneClear = (cars) =>
  !cars.some(
    (o) =>
      o.on &&
      ((Math.abs(o.z - LANE_W) < 1 && o.x > AISLE_X - 3 && o.x < AISLE_X + 25) ||
        (Math.abs(o.z - LANE_E) < 1 && o.x > AISLE_X - 25 && o.x < AISLE_X + 3))
  )

function createTraffic() {
  const traffic = TRAFFIC.map((t) => ({ ...t, z: t.dir > 0 ? LANE_E : LANE_W, on: true }))
  const zk = SPOT_Z[FREE_E[0]]
  // Shuru ma gadi parking ma ubhi hoy
  const parker = {
    x: ROW_E, z: zk, on: true, phase: 'parked', timer: 6, zk,
    path: null, len: 0, u: 0, merged: false,
  }
  return { traffic, parker, all: [...traffic, parker] }
}

const tmpP = new Vector3()
const tmpT = new Vector3()

function Traffic({ night }) {
  const state = useRef(null)
  if (!state.current) state.current = createTraffic()
  const s = state.current
  const refs = useRef(TRAFFIC.map(() => createRef()))
  const pRef = useRef()

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.05)
    const { traffic, parker: pk, all } = s

    traffic.forEach((c, i) => {
      const v = follow(gapAhead(all, c, c.x, c.z, c.dir), c.cruise)
      c.x += v * c.dir * dt
      if (c.x > END) c.x -= 2 * END
      if (c.x < -END) c.x += 2 * END
      const g = refs.current[i].current
      if (g) {
        g.position.set(c.x, ROAD_Y, c.z)
        g.rotation.y = c.dir > 0 ? Math.PI / 2 : -Math.PI / 2
      }
    })

    const start = (phase, path) => {
      pk.phase = phase
      pk.path = path
      pk.len = path.getLength()
      pk.u = 0
    }

    if (pk.phase === 'wait') {
      pk.timer -= dt
      const spawnFree = !traffic.some((o) => o.dir > 0 && o.x < -END + 12)
      if (pk.timer <= 0 && spawnFree) {
        pk.zk = SPOT_Z[FREE_E[Math.floor(Math.random() * FREE_E.length)]]
        pk.on = true
        start('in', arrivePath(pk.zk))
      }
    } else if (pk.phase === 'parked') {
      pk.timer -= dt
      if (pk.timer <= 0) start('back', reversePath(pk.zk))
    } else {
      const done = pk.u * pk.len
      const rem = pk.len - done
      let v = 1.2
      if (pk.phase === 'in') {
        v = Math.min(5, 0.6 + rem * 0.22)
        if (Math.abs(pk.z - LANE_E) < 0.5) v = Math.min(v, follow(gapAhead(all, pk, pk.x, pk.z, 1), 5))
      } else if (pk.phase === 'out') {
        v = Math.min(5, 1 + done * 0.3)
        if (!pk.merged && pk.z > 8.8 && !laneClear(all)) v = 0
        if (pk.z > 10) pk.merged = true
        if (Math.abs(pk.z - LANE_W) < 0.5) v = Math.min(v, follow(gapAhead(all, pk, pk.x, pk.z, -1), 5))
      }
      pk.u = Math.min(1, pk.u + (v * dt) / pk.len)

      pk.path.getPointAt(pk.u, tmpP)
      pk.path.getTangentAt(pk.u, tmpT)
      pk.x = tmpP.x
      pk.z = tmpP.z
      const back = pk.phase === 'back' ? -1 : 1
      pk.rot = Math.atan2(tmpT.x * back, tmpT.z * back)

      if (pk.u >= 1) {
        if (pk.phase === 'in') {
          pk.phase = 'parked'
          pk.timer = 10 + Math.random() * 8
        } else if (pk.phase === 'back') {
          pk.merged = false
          start('out', exitPath(pk.zk))
        } else {
          pk.phase = 'wait'
          pk.on = false
          pk.timer = 4 + Math.random() * 6
        }
      }
    }

    const g = pRef.current
    if (g) {
      g.visible = pk.on
      g.position.set(pk.x, ROAD_Y, pk.z)
      g.rotation.y = pk.rot ?? Math.PI / 2
    }
  })

  return (
    <group>
      {s.traffic.map((c, i) => (
        <Car
          key={i}
          gref={refs.current[i]}
          color={c.color}
          night={night}
          lights
        />
      ))}
      <Car gref={pRef} color={C.terra} night={night} lights />
    </group>
  )
}

/* ---------- Main ---------- */
export default function Outside({ night }) {
  const dashes = []
  for (let x = -END - 28; x <= END + 28; x += 4) {
    if (Math.abs(x - CROSS_X) > 2.6) dashes.push(x)
  }
  const top = ROAD_Y + 0.01

  return (
    <group>
      {/* Ghaas */}
      <Slab x0={-100} x1={100} z0={-100} z1={100} top={G} h={0.2} color={C.grass} />

      {/* Rasto */}
      <Slab x0={-100} x1={100} z0={ROAD[0]} z1={ROAD[1]} top={ROAD_Y} color={C.asphalt} />
      {dashes.map((x) => (
        <Slab key={x} x0={x - 0.8} x1={x + 0.8} z0={13.34} z1={13.46} top={top} h={0.02} color={C.cream} />
      ))}
      <Slab x0={-100} x1={100} z0={11.55} z1={11.65} top={top} h={0.02} color={C.cream} />
      <Slab x0={-100} x1={100} z0={15.15} z1={15.25} top={top} h={0.02} color={C.cream} />
      {[-1.5, -0.75, 0, 0.75, 1.5].map((dx) => (
        <Slab
          key={dx} x0={CROSS_X + dx - 0.21} x1={CROSS_X + dx + 0.21}
          z0={11.7} z1={15.1} top={top + 0.005} h={0.02} color={C.cream}
        />
      ))}

      {/* Footpath + porch sudhi no raasto */}
      <Slab x0={-100} x1={DRIVE[0]} z0={WALK_N[0]} z1={WALK_N[1]} top={-0.2} h={0.15} color={C.walk} />
      <Slab x0={DRIVE[1]} x1={100} z0={WALK_N[0]} z1={WALK_N[1]} top={-0.2} h={0.15} color={C.walk} />
      <Slab x0={-100} x1={100} z0={WALK_F[0]} z1={WALK_F[1]} top={-0.2} h={0.15} color={C.walk} />
      <Slab x0={-6.4} x1={-3.6} z0={9.3} z1={WALK_N[0]} top={-0.2} h={0.15} color={C.walk} />

      {/* Parking */}
      <Slab x0={LOT.x0} x1={LOT.x1} z0={LOT.z0} z1={LOT.z1} top={ROAD_Y} color={C.asphalt} />
      <Slab x0={DRIVE[0]} x1={DRIVE[1]} z0={WALK_N[0]} z1={ROAD[0]} top={ROAD_Y} color={C.asphalt} />
      {[[LOT.x0, 14.2], [16.8, LOT.x1]].map(([x0, x1]) =>
        SPOT_Z.concat(SPOT_Z[5] + 2.3).map((z) => (
          <Slab
            key={x0 + '_' + z} x0={x0} x1={x1} z0={z - 1.2} z1={z - 1.1}
            top={top} h={0.02} color={C.cream}
          />
        ))
      )}
      {PARKED.map(([x, k, color], i) => (
        <Car key={i} pos={[x, ROAD_Y, SPOT_Z[k]]} rot={x === ROW_E ? Math.PI / 2 : -Math.PI / 2} color={color} />
      ))}
      <ParkingSign x={13.5} z={9.9} />

      {/* Restaurant ane parking vachhe ni vaad */}
      <mesh position={[9.2, G + 0.32, -2.6]} castShadow receiveShadow>
        <boxGeometry args={[0.7, 0.64, 19]} />
        <meshStandardMaterial color={C.oliveDark} flatShading />
      </mesh>

      <Traffic night={night} />

      {TREES.map((t, i) => (
        <Tree key={i} {...t} />
      ))}
      {BUSHES.map(([x, z]) => (
        <Bush key={x + '_' + z} x={x} z={z} />
      ))}

      {[-14, -1, 8, 23].map((x) => (
        <Lamp key={'n' + x} x={x} z={10.6} night={night} />
      ))}
      {[-8, 6, 20].map((x) => (
        <Lamp key={'f' + x} x={x} z={16.2} flip glow={false} night={night} />
      ))}
    </group>
  )
}
