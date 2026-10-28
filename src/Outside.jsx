import { createRef, useLayoutEffect, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { CatmullRomCurve3, Object3D, Vector3 } from 'three'
import {
  C, G, ROAD_Y, WALK_Y, END, EDGE, ROAD, LANE_E, LANE_W, WALK_N, WALK_F, BACK, BACK_E, BACK_W, BWALK_N, BWALK_S,
  AVE, AWALK_W, AWALK_E, DRIVE, LOT, AISLE_X, ROW_W, ROW_E, SPOT_Z, CROSS_X, AVE_CROSS, PLOT,
  BUILDINGS, TOWER, FIELD_FENCE, FIELD_GATE, BUS_STOP, PARK_PATH, PLAZA, BENCHES, PALMS,
} from './layout'

const PARKED = [
  [ROW_W, 0, '#3E5C76'], [ROW_W, 1, C.cream], [ROW_W, 3, '#8C3B2E'], [ROW_W, 5, C.olive],
  [ROW_E, 1, C.gold], [ROW_E, 4, '#5B6C8F'], [ROW_E, 5, '#A34A5A'],
]
const FREE_E = [0, 2, 3]     // east line ni khali jagya (animated gadi mate)

// Avenue na kinare ubheli gadio: [x, z, rot] (left-hand: gadi potani dabi baju ubhi)
const CURB = [[-13.3, -4, 0], [-15.5, 0.6, Math.PI], [-15.5, -8.6, Math.PI]]

// Lambo patto, pan [x0, x1] gap vali jagya chhodi ne
const spans = (a, b, gaps) => {
  const out = []
  let s = a
  gaps.forEach(([g0, g1]) => {
    if (g0 > s) out.push([s, g0])
    s = Math.max(s, g1)
  })
  if (s < b) out.push([s, b])
  return out
}

/* ---------- Trees (seed vali random, dar vakhte same jagya) ---------- */
let seed = 7
const rng = () => {
  seed = (seed * 16807) % 2147483647
  return (seed - 1) / 2147483646
}
// Building + aagal ni chhatri/footpath, local [x0, x1, z0, z1] ne world box ma
const footBox = ({ x, z, rot }, [x0, x1, z0, z1]) => {
  const c = Math.cos(rot)
  const s = Math.sin(rot)
  const pts = [[x0, z0], [x1, z0], [x0, z1], [x1, z1]].map(([lx, lz]) => [x + lx * c + lz * s, z - lx * s + lz * c])
  const xs = pts.map((p) => p[0])
  const zs = pts.map((p) => p[1])
  return [Math.min(...xs), Math.max(...xs), Math.min(...zs), Math.max(...zs)]
}
const BLOCK = [
  [-9, 9, -13, 7],                    // restaurant
  [-8, 8, 5.5, 10.2],                 // porch + garden terrace
  [LOT.x0 - 1.2, LOT.x1, LOT.z0, LOT.z1], // parking
  [-EDGE, EDGE, WALK_N[0] - 0.4, WALK_F[1] + 0.6], // rasto + footpath
  [-EDGE, EDGE, BWALK_S[0] - 0.4, BWALK_N[1] + 0.4], // pachhal no rasto
  [AWALK_W[0] - 0.4, AWALK_E[1] + 0.4, BWALK_N[1], WALK_N[0]], // avenue
  [PLOT.x0, PLOT.x1, PLOT.z0, PLOT.z1], // railing vado plot
  ...BUILDINGS.map((b) => footBox(b, [-b.w / 2 - 0.6, b.w / 2 + 0.6, -b.d - 0.6, 1.4])),
  footBox(TOWER, [-TOWER.w / 2 - 0.6, TOWER.w / 2 + 0.6, -TOWER.d - 0.6, 1]),
  [FIELD_FENCE.x0, FIELD_FENCE.x1, FIELD_FENCE.z0, FIELD_FENCE.z1], // medan
  [FIELD_GATE[0], FIELD_GATE[1], WALK_F[1], FIELD_FENCE.z0],
  [BUS_STOP[0] - 2.6, BUS_STOP[0] + 2.6, WALK_F[1], BUS_STOP[1] + 1],
  [PARK_PATH.x0, PARK_PATH.x1, PARK_PATH.z0, PARK_PATH.z1],
  [PLAZA.x0, PLAZA.x1, PLAZA.z0, PLAZA.z1],
  ...BENCHES.map(([x, z]) => [x - 0.8, x + 0.8, z - 0.5, z + 0.5]),
  ...PALMS.map(([x, z]) => [x - 0.6, x + 0.6, z - 0.6, z + 0.6]),
]
const blocked = (x, z, pad) =>
  BLOCK.some(([x0, x1, z0, z1]) => x > x0 - pad && x < x1 + pad && z > z0 - pad && z < z1 + pad)
const AREAS = [
  [-34, 4, 17.2, 32, 16],    // rasta ni same, bagicho (dabi baju)
  [23.5, 34, -13, 9.5, 8],   // parking ni baju
  [30, 36, 17.2, 32, 4],     // medan ni jamni baju
  [4, 34, 32.6, 37, 6],      // medan ni pachhal
  [-16.5, -11.6, -30, -21.5, 2], // be building vachhe
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
export function Slab({ x0, x1, z0, z1, top, h = 0.1, color }) {
  return (
    <mesh position={[(x0 + x1) / 2, top - h / 2, (z0 + z1) / 2]} receiveShadow>
      <boxGeometry args={[x1 - x0, h, z1 - z0]} />
      <meshStandardMaterial color={color} />
    </mesh>
  )
}
export function Part({ pos, size, color, ...mat }) {
  return (
    <mesh position={pos} castShadow>
      <boxGeometry args={size} />
      <meshStandardMaterial color={color} {...mat} />
    </mesh>
  )
}

export function Tree({ x, z, s, kind, rot }) {
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

export function Lamp({ x, z, flip = false, rot = flip ? Math.PI : 0, glow = true, night }) {
  return (
    <group position={[x, G, z]} rotation={[0, rot, 0]}>
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

// Ek j jevi ghani box (bari, railing, patta) ek j instancedMesh ma: items = [[pos, size, rotY]]
export function Boxes({ items, color, shadow = true, ...mat }) {
  const ref = useRef()
  useLayoutEffect(() => {
    const m = ref.current
    const o = new Object3D()
    items.forEach(([p, size, ry = 0], i) => {
      o.position.set(...p)
      o.scale.set(...size)
      o.rotation.set(0, ry, 0)
      o.updateMatrix()
      m.setMatrixAt(i, o.matrix)
    })
    m.instanceMatrix.needsUpdate = true
    m.computeBoundingSphere()
  }, [items])
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, items.length]} castShadow={shadow} receiveShadow>
      <boxGeometry />
      <meshStandardMaterial color={color} {...mat} />
    </instancedMesh>
  )
}

// Bagicha ni bench (pith -z baju)
export function Bench({ x, z, rot = 0, y = G }) {
  return (
    <group position={[x, y, z]} rotation={[0, rot, 0]}>
      <Part pos={[0, 0.42, 0]} size={[1.4, 0.07, 0.42]} color={C.wood} />
      <Part pos={[0, 0.72, -0.19]} size={[1.4, 0.28, 0.06]} color={C.wood} />
      {[-0.6, 0.6].map((dx) => (
        <Part key={dx} pos={[dx, 0.2, 0]} size={[0.07, 0.42, 0.4]} color={C.ink} />
      ))}
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
export function Car({ gref, color, night = false, lights = false, pos = [0, 0, 0], rot = 0 }) {
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
  { x: 45, dir: -1, cruise: 4.4, color: '#5B6C8F' },
  // Pachhal no rasto
  { x: -30, dir: 1, z: BACK_E, cruise: 4.6, color: '#E8D3AE' },
  { x: 25, dir: 1, z: BACK_E, cruise: 5, color: '#A34A5A' },
  { x: 8, dir: -1, z: BACK_W, cruise: 4.8, color: C.olive },
  { x: -50, dir: -1, z: BACK_W, cruise: 4.4, color: '#3E5C76' },
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
  const traffic = TRAFFIC.map((t) => ({ ...t, z: t.z ?? (t.dir > 0 ? LANE_E : LANE_W), on: true }))
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
      const spawnFree = !traffic.some((o) => o.z === LANE_E && o.x < -END + 12)
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
// Navi street lamps: [x, z, rot] (fakt emissive bulb, pointLight nahi)
const STREET_LAMPS = [
  ...[-8, 4, 16].map((x) => [x, BWALK_N[1] - 0.1, Math.PI]),
  ...[-12, -4, 4, 14].map((x) => [x, BWALK_S[0] + 0.1, 0]),
  ...[-6, 3].map((z) => [AWALK_E[1] - 0.1, z, -Math.PI / 2]),
  ...[-6.3, 1.9].map((z) => [AWALK_W[0] + 0.1, z, Math.PI / 2]),
]

// Zebra na patta: rasta ni aarpar (along = 'z' etle patta z disha ma lamba)
function Zebra({ c, from, to, along }) {
  const top = ROAD_Y + 0.015
  return [-1.5, -0.75, 0, 0.75, 1.5].map((d) =>
    along === 'z' ? (
      <Slab key={d} x0={c + d - 0.21} x1={c + d + 0.21} z0={from} z1={to} top={top} h={0.02} color={C.cream} />
    ) : (
      <Slab key={d} x0={from} x1={to} z0={c + d - 0.21} z1={c + d + 0.21} top={top} h={0.02} color={C.cream} />
    )
  )
}

export default function Outside({ night }) {
  const dashes = []
  for (let x = -END - 28; x <= END + 28; x += 4) {
    if (Math.abs(x - CROSS_X) > 2.6 && (x < AVE[0] - 1 || x > AVE[1] + 1)) dashes.push(x)
  }
  const aveDashes = []
  for (let z = BWALK_N[1] + 1; z <= WALK_N[0] - 1; z += 4) {
    if (AVE_CROSS.every((c) => Math.abs(z - c) > 2.6)) aveDashes.push(z)
  }
  const top = ROAD_Y + 0.01
  const aveGap = [[AVE[0], AVE[1]]]
  const aveMid = (AVE[0] + AVE[1]) / 2

  return (
    <group>
      {/* Ghaas */}
      <Slab x0={-EDGE} x1={EDGE} z0={-EDGE} z1={EDGE} top={G} h={0.2} color={C.grass} />

      {/* Aagal no rasto */}
      <Slab x0={-EDGE} x1={EDGE} z0={ROAD[0]} z1={ROAD[1]} top={ROAD_Y} color={C.asphalt} />
      {dashes.map((x) => (
        <Slab key={x} x0={x - 0.8} x1={x + 0.8} z0={13.34} z1={13.46} top={top} h={0.02} color={C.cream} />
      ))}
      {spans(-EDGE, EDGE, aveGap).map(([x0, x1]) => (
        <Slab key={x0} x0={x0} x1={x1} z0={11.55} z1={11.65} top={top} h={0.02} color={C.cream} />
      ))}
      <Slab x0={-EDGE} x1={EDGE} z0={15.15} z1={15.25} top={top} h={0.02} color={C.cream} />
      <Zebra c={CROSS_X} from={11.7} to={15.1} along="z" />

      {/* Pachhal no rasto */}
      <Slab x0={-EDGE} x1={EDGE} z0={BACK[0]} z1={BACK[1]} top={ROAD_Y} color={C.asphalt} />
      {dashes.map((x) => (
        <Slab key={x} x0={x - 0.8} x1={x + 0.8} z0={-17.66} z1={-17.54} top={top} h={0.02} color={C.cream} />
      ))}
      {spans(-EDGE, EDGE, aveGap).map(([x0, x1]) => (
        <Slab key={x0} x0={x0} x1={x1} z0={-15.85} z1={-15.75} top={top} h={0.02} color={C.cream} />
      ))}
      <Slab x0={-EDGE} x1={EDGE} z0={-19.45} z1={-19.35} top={top} h={0.02} color={C.cream} />
      <Zebra c={CROSS_X} from={-19.3} to={-15.9} along="z" />

      {/* Avenue (banne rasta ne jode) */}
      <Slab x0={AVE[0]} x1={AVE[1]} z0={BACK[1]} z1={ROAD[0]} top={ROAD_Y} color={C.asphalt} />
      {aveDashes.map((z) => (
        <Slab key={z} x0={aveMid - 0.06} x1={aveMid + 0.06} z0={z - 0.8} z1={z + 0.8} top={top} h={0.02} color={C.cream} />
      ))}
      {AVE_CROSS.map((c) => (
        <Zebra key={c} c={c} from={AVE[0] + 0.1} to={AVE[1] - 0.1} along="x" />
      ))}
      {CURB.map(([x, z, rot]) => (
        <Car key={z} pos={[x, ROAD_Y, z]} rot={rot} color={z > 0 ? C.gold : z > -5 ? '#2F6F73' : C.cream} />
      ))}

      {/* Footpath + porch sudhi no raasto */}
      {spans(-EDGE, EDGE, [aveGap[0], DRIVE]).map(([x0, x1]) => (
        <Slab key={x0} x0={x0} x1={x1} z0={WALK_N[0]} z1={WALK_N[1]} top={WALK_Y} h={0.15} color={C.walk} />
      ))}
      <Slab x0={-EDGE} x1={EDGE} z0={WALK_F[0]} z1={WALK_F[1]} top={WALK_Y} h={0.15} color={C.walk} />
      {spans(-EDGE, EDGE, aveGap).map(([x0, x1]) => (
        <Slab key={x0} x0={x0} x1={x1} z0={BWALK_N[0]} z1={BWALK_N[1]} top={WALK_Y} h={0.15} color={C.walk} />
      ))}
      <Slab x0={-EDGE} x1={EDGE} z0={BWALK_S[0]} z1={BWALK_S[1]} top={WALK_Y} h={0.15} color={C.walk} />
      {[AWALK_W, AWALK_E].map(([x0, x1]) => (
        <Slab key={x0} x0={x0} x1={x1} z0={BWALK_N[1]} z1={WALK_N[0]} top={WALK_Y} h={0.15} color={C.walk} />
      ))}
      <Slab x0={-6.4} x1={-3.6} z0={9.9} z1={WALK_N[0]} top={WALK_Y} h={0.15} color={C.walk} />

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

      {/* Lamp footpath na bahar na kinare (chalta loko vachhe na aave) */}
      {[-19, -1, 8, 23].map((x) => (
        <Lamp key={'n' + x} x={x} z={WALK_N[0] + 0.1} night={night} />
      ))}
      {[-8, 6, 20].map((x) => (
        <Lamp key={'f' + x} x={x} z={WALK_F[1] - 0.1} flip glow={false} night={night} />
      ))}
      {STREET_LAMPS.map(([x, z, rot]) => (
        <Lamp key={x + '_' + z} x={x} z={z} rot={rot} glow={false} night={night} />
      ))}
    </group>
  )
}
