import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Body } from './Characters'

const C = {
  cream: '#F5E6CC',
  terra: '#C8553D',
  olive: '#6B7F3A',
  oliveDark: '#4F6128',
  wood: '#4A3426',
  plate: '#FFF8EC',
  gold: '#D9A441',
  ink: '#2B1D14',
}
const SKIN = ['#F1C9A5', '#E8B08A', '#C98B62', '#A8683F']

/* ---------- Layout ---------- */
// Tables ni ubhi line vachche chalva jevi jagya (lane) rahe te mate x = -0.2, 3.2, 6.6
const TX = [-0.2, 3.2, 6.6]
const TABLES = [
  [TX[0], 1.5], [TX[1], 1.5], [TX[2], 1.5],
  [TX[0], 4.5], [TX[1], 4.5], [TX[2], 4.5],
]
const LANE_W = 2.75          // gali ni upar ni lane: pachhal (west) jata loko mate
const LANE_E = 3.25          // gali ni niche ni lane: aagal (east) jata loko mate
const LANES = [1.5, 4.9]     // tables na vachhe ni ubhi gali
const GATE_IN = -3.3         // reception thi dining ma javano raasto (aavva mate)
const GATE_OUT = -2.6        // dining thi reception taraf pacha javano raasto
const DESK_POST = [-5.5, 3.8]
const SPOTS = [[-4.9, 5.42], [-6.1, 5.42]]   // reception saame ubha rehvani jagya
const DOOR = [[-4.9, 9.3], [-6.1, 9.6]]      // porch par thi aavvani jagya
const WAITER_HOMES = [[2.2, -0.12], [3.4, -0.12], [4.6, -0.12], [5.8, -0.12]]
const MIN_GAP = 0.4          // be loko vachhe ochhi ochhi aatli jagya (safety)
const YIELD_GAP = 0.55       // aatla paas aave to samnevalo ne rasto aapo

const LOOKS = [
  ['#3E5C76', '#2B1D14', 1], ['#8C3B2E', '#5A3A22', 0],
  ['#D9A441', '#1A1A1A', 2], ['#5C6B3A', '#8B5A2B', 3],
  ['#7A4E7E', '#2B1D14', 1], ['#2F6F73', '#5A3A22', 2],
  ['#B5651D', '#1A1A1A', 0], ['#5B6C8F', '#8B5A2B', 3],
  ['#A34A5A', '#2B1D14', 1], ['#4F7942', '#5A3A22', 2],
  ['#6A4C93', '#1A1A1A', 3], ['#E07A5F', '#2B1D14', 0],
]

const seatPos = (ti, s) => {
  const [tx, tz] = TABLES[ti]
  return [tx + s * 0.95, tz]
}
const topRow = (ti) => ti < 3

// Customer: reception thi seat sudhi
const toSeatPath = (ti, s) => {
  const [sx, sz] = seatPos(ti, s)
  return [[GATE_IN, SPOTS[0][1]], [GATE_IN, LANE_E], [sx, LANE_E], [sx, sz]]
}
// Customer: seat thi bahar
const fromSeatPath = (ti, s) => {
  const [sx] = seatPos(ti, s)
  return [[sx, LANE_W], [GATE_OUT, LANE_W], [GATE_OUT, 5.95], [-3.5, 5.95], [-3.5, 9.6]]
}
// Receptionist: table sudhi ane pacho (guests ni aagal chale)
const hostOut = (ti) => {
  const hx = TABLES[ti][0] - 1.8
  return [[GATE_IN, DESK_POST[1]], [GATE_IN, LANE_E], [hx, LANE_E], [hx, LANE_W]]
}
const hostBack = () => [[DESK_POST[0], LANE_W], DESK_POST]
// Waiter: upar ni line na tables ne upar ni side thi, niche ni line ne niche ni side thi serve kare
const nearestLane = (tx) =>
  Math.abs(tx - LANES[0]) <= Math.abs(tx - LANES[1]) ? LANES[0] : LANES[1]
const waiterSpot = (ti) => [TABLES[ti][0], topRow(ti) ? 0.52 : 5.62]
const waiterOut = (ti, home) => {
  const [sx, sz] = waiterSpot(ti)
  const [hx] = home
  if (topRow(ti)) return [[hx, 0.52], [sx, sz]]
  const lane = nearestLane(sx)
  return [[hx, 0.52], [lane, 0.52], [lane, sz], [sx, sz]]
}
const waiterBack = (ti, home) => {
  const [sx, sz] = waiterSpot(ti)
  const [hx, hz] = home
  if (topRow(ti)) return [[hx, 0.52], [hx, hz]]
  const lane = nearestLane(sx)
  return [[lane, sz], [lane, 0.52], [hx, 0.52], [hx, hz]]
}

/* ---------- Task helpers (step by step script) ---------- */
const seq = (...tasks) => {
  let i = 0
  return (dt) => {
    if (i >= tasks.length) return true
    if (tasks[i](dt)) i++
    return i >= tasks.length
  }
}
const par = (...tasks) => {
  const done = tasks.map(() => false)
  return (dt) => {
    tasks.forEach((t, k) => {
      if (!done[k]) done[k] = t(dt)
    })
    return done.every(Boolean)
  }
}
const wait = (s) => {
  let t = 0
  return (dt) => (t += dt) >= s
}
const call = (fn) => () => {
  fn()
  return true
}
const until = (cond) => () => !!cond()
const lazy = (build) => {
  let t = null
  return (dt) => {
    if (!t) t = build()
    return t(dt)
  }
}
let WORLD = null
// Koi ubho hoy to badha ne rokshe. Be chaltavala mathi je "pehla" (pri ochhi) te jashe, bijo rah jove.
const blockedBy = (a, nx, nz) => {
  const w = WORLD
  const all = [w.host, ...w.waiters, ...w.guests]
  for (const o of all) {
    if (o === a || !o.visible || o.sit) continue
    if (a.group && a.group === o.group) continue
    const moving = o.anim === 'walk' || o.yielding
    if (moving && o.pri > a.pri) continue
    const dNew = Math.hypot(nx - o.x, nz - o.z)
    if (dNew < YIELD_GAP && dNew < Math.hypot(a.x - o.x, a.z - o.z)) return true
  }
  return false
}
const walk = (a, x, z, speed = 1.6, face = null) => (dt) => {
  const dx = x - a.x
  const dz = z - a.z
  const d = Math.hypot(dx, dz)
  const step = speed * dt
  if (d <= step) {
    a.x = x
    a.z = z
    a.anim = 'idle'
    a.yielding = false
    if (face !== null) a.rot = face
    return true
  }
  const nx = a.x + (dx / d) * step
  const nz = a.z + (dz / d) * step
  a.rot = Math.atan2(dx, dz)
  if (a.ghost > 0) a.ghost -= dt
  else if (blockedBy(a, nx, nz)) {
    a.waitT = (a.waitT || 0) + dt
    a.anim = 'idle'
    a.yielding = true
    if (a.waitT > 6) {
      a.ghost = 1.2
      a.waitT = 0
    }
    return false
  }
  a.waitT = 0
  a.yielding = false
  a.x = nx
  a.z = nz
  a.anim = 'walk'
  return false
}
const walkPath = (a, pts, speed = 1.6, face = null) =>
  seq(
    ...pts.map(([x, z], k) =>
      walk(a, x, z, speed, k === pts.length - 1 ? face : null)
    )
  )

/* ---------- Safety net: be loko ek bija ma ghuse nahi ---------- */
const separate = (w, dt) => {
  const all = [w.host, ...w.waiters, ...w.guests].filter((a) => a.visible)
  const k = Math.min(1, dt * 10)
  for (let i = 0; i < all.length; i++) {
    for (let j = i + 1; j < all.length; j++) {
      const a = all[i]
      const b = all[j]
      if (a.sit && b.sit) continue
      let dx = a.x - b.x
      let dz = a.z - b.z
      let d = Math.hypot(dx, dz)
      if (d >= MIN_GAP) continue
      if (d < 0.001) {
        dx = 1
        dz = 0
        d = 1
      }
      const nx = dx / d
      const nz = dz / d
      const push = Math.min(0.03, (MIN_GAP - d) * k)
      const wa = a.sit ? 0 : b.sit ? 1 : 0.5
      const wb = b.sit ? 0 : a.sit ? 1 : 0.5
      a.x += (nx - nz * 0.6) * push * wa
      a.z += (nz + nx * 0.6) * push * wa
      b.x -= (nx - nz * 0.6) * push * wb
      b.z -= (nz + nx * 0.6) * push * wb
    }
  }
}

/* ---------- World (badhu data ahi) ---------- */
const mkActor = () => ({
  x: 0, z: 0, rot: 0, anim: 'idle',
  sit: false, carry: false, visible: false, used: false,
})

function createWorld() {
  const w = {
    host: { ...mkActor(), pri: 0, x: DESK_POST[0], z: DESK_POST[1], visible: true, atDesk: true },
    guests: Array.from({ length: 12 }, (_, i) => ({ ...mkActor(), pri: 1 + i })),
    waiters: WAITER_HOMES.map(([x, z], i) => ({
      ...mkActor(), pri: 100 + i, x, z, rot: Math.PI, visible: true, home: [x, z], busy: false,
    })),
    tables: TABLES.map(() => ({ busy: false })),
    foodRefs: TABLES.map(() => ({ current: null })),
    reception: { busy: false },
    jobs: [],
    spawnIn: 3.8,
    seeded: false,
  }
  WORLD = w
  // Aa job kyarey puro thato nathi, dar frame par overlap check kare chhe
  w.jobs.push((dt) => {
    WORLD = w
    separate(w, dt)
    return false
  })
  return w
}

/* ---------- Story steps ---------- */
const sitDown = (a, ti, s) =>
  call(() => {
    const [x, z] = seatPos(ti, s)
    a.x = x
    a.z = z
    a.rot = s > 0 ? -Math.PI / 2 : Math.PI / 2
    a.sit = true
    a.anim = 'idle'
  })

const hostLead = (w, ti, A, B) =>
  seq(
    walkPath(w.host, hostOut(ti), 1.6, topRow(ti) ? Math.PI : 0),
    call(() => { w.host.anim = 'talk' }),
    wait(0.9),
    call(() => { w.host.anim = 'idle' }),
    walkPath(w.host, hostBack(), 1.6, 0),
    call(() => {
      w.host.atDesk = true
      w.host.group = null
      w.reception.busy = false
    })
  )

const serve = (w, ti, A, B) => {
  let wt = null
  const face = topRow(ti) ? 0 : Math.PI
  return seq(
    until(() => {
      wt = w.waiters.find((x) => !x.busy)
      if (wt) wt.busy = true
      return !!wt
    }),
    lazy(() => {
      const out = waiterOut(ti, wt.home)
      const back = waiterBack(ti, wt.home)
      return seq(
        walkPath(wt, out, 1.6, face),
        call(() => { wt.anim = 'write'; A.anim = 'talk'; B.anim = 'talk' }),
        wait(3.4),
        call(() => { wt.anim = 'idle'; A.anim = 'idle'; B.anim = 'idle' }),
        walkPath(wt, back, 1.6, Math.PI),
        wait(3.2),
        call(() => { wt.carry = true }),
        walkPath(wt, out, 1.6, face),
        call(() => {
          wt.carry = false
          w.foodRefs[ti].current.visible = true
          A.anim = 'eat'
          B.anim = 'eat'
        }),
        wait(1.4),
        walkPath(wt, back, 1.6, Math.PI),
        call(() => { wt.busy = false })
      )
    })
  )
}

const leave = (w, ti, A, B) => {
  const exit = (g, s, delay) =>
    seq(
      wait(delay),
      call(() => { g.sit = false; g.anim = 'idle'; g.group = null }),
      walkPath(g, fromSeatPath(ti, s), 1.6),
      call(() => { g.visible = false; g.used = false })
    )
  return seq(
    call(() => {
      w.foodRefs[ti].current.visible = false
      w.tables[ti].busy = false
    }),
    par(exit(B, -1, 0), exit(A, 1, 0.8))
  )
}

const makeParty = (w, ti, A, B) =>
  seq(
    call(() => {
      w.reception.busy = true
      ;[A, B].forEach((g, k) => {
        g.x = DOOR[k][0]
        g.z = DOOR[k][1]
        g.rot = Math.PI
        g.sit = false
        g.carry = false
        g.anim = 'idle'
        g.visible = true
      })
    }),
    par(
      walk(A, SPOTS[0][0], SPOTS[0][1], 1.6, Math.PI),
      seq(wait(0.5), walk(B, SPOTS[1][0], SPOTS[1][1], 1.6, Math.PI))
    ),
    until(() => w.host.atDesk),
    call(() => { w.host.anim = 'talk' }),
    wait(2.2),
    call(() => { w.host.anim = 'idle'; A.anim = 'talk' }),
    wait(1.8),
    call(() => { A.anim = 'idle'; w.host.anim = 'talk' }),
    wait(1.6),
    call(() => {
      w.host.anim = 'idle'
      w.host.atDesk = false
      w.host.group = A.group = B.group = 'p' + ti
    }),
    par(
      hostLead(w, ti, A, B),
      seq(
        par(
          seq(walkPath(A, toSeatPath(ti, 1), 1.6), sitDown(A, ti, 1)),
          seq(wait(0.5), walkPath(B, toSeatPath(ti, -1), 1.6), sitDown(B, ti, -1))
        ),
        wait(1.2),
        serve(w, ti, A, B),
        wait(14 + Math.random() * 8),
        leave(w, ti, A, B)
      )
    )
  )

const seedParty = (w, ti, A, B, stay) =>
  seq(
    call(() => {
      w.tables[ti].busy = true
      const pairs = [[A, 1], [B, -1]]
      pairs.forEach(([g, s]) => {
        const [x, z] = seatPos(ti, s)
        g.x = x
        g.z = z
        g.rot = s > 0 ? -Math.PI / 2 : Math.PI / 2
        g.sit = true
        g.anim = 'eat'
        g.visible = true
      })
      w.foodRefs[ti].current.visible = true
    }),
    wait(stay),
    leave(w, ti, A, B)
  )

/* ---------- 3D nana bhagao ---------- */
function Part({ pos, size, color }) {
  return (
    <mesh position={pos} castShadow>
      <boxGeometry args={size} />
      <meshStandardMaterial color={color} />
    </mesh>
  )
}
function Cyl({ pos, r, h, color, seg = 16 }) {
  return (
    <mesh position={pos} castShadow>
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

function Steam({ pos, count = 2, size = 0.06, rise = 0.5 }) {
  const refs = useRef([])
  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    refs.current.forEach((m, i) => {
      if (!m) return
      const p = (t * 0.35 + i / count) % 1
      m.position.y = p * rise
      m.position.x = Math.sin(t + i * 2) * 0.04
      m.scale.setScalar(0.6 + p * 1.3)
      m.material.opacity = 0.5 * (1 - p)
    })
  })
  return (
    <group position={pos}>
      {Array.from({ length: count }).map((_, i) => (
        <mesh key={i} ref={(el) => (refs.current[i] = el)}>
          <sphereGeometry args={[size, 8, 8]} />
          <meshStandardMaterial color="#FFFFFF" transparent opacity={0.4} depthWrite={false} />
        </mesh>
      ))}
    </group>
  )
}

function Plate({ pos, kind = 0 }) {
  return (
    <group position={pos}>
      <Cyl pos={[0, 0, 0]} r={0.17} h={0.03} color={C.plate} seg={20} />
      {kind === 0 && (
        <>
          <Ball pos={[-0.04, 0.04, 0]} r={0.09} color="#EFE0BF" scale={[1, 0.55, 1]} />
          <Cyl pos={[0.07, 0.035, 0.02]} r={0.07} h={0.04} color={C.terra} />
          <Ball pos={[0.07, 0.065, 0.02]} r={0.025} color={C.oliveDark} />
        </>
      )}
      {kind === 1 && (
        <>
          <Ball pos={[-0.06, 0.05, 0.03]} r={0.06} color={C.olive} />
          <Ball pos={[0.05, 0.05, -0.04]} r={0.06} color={C.oliveDark} />
          <Ball pos={[0.04, 0.06, 0.07]} r={0.045} color={C.terra} />
          <Ball pos={[-0.03, 0.07, -0.06]} r={0.04} color={C.gold} />
        </>
      )}
      {kind === 2 && (
        <>
          <Cyl pos={[-0.03, 0.03, 0]} r={0.12} h={0.02} color={C.gold} />
          <Cyl pos={[-0.03, 0.05, 0]} r={0.12} h={0.02} color="#C9902E" />
          <Cyl pos={[-0.03, 0.07, 0]} r={0.12} h={0.02} color={C.gold} />
          <Cyl pos={[0.1, 0.04, 0.06]} r={0.05} h={0.05} color={C.terra} />
        </>
      )}
    </group>
  )
}

function Glass({ pos }) {
  return (
    <group position={pos}>
      <Cyl pos={[0, 0.07, 0]} r={0.05} h={0.14} color="#E39A3B" seg={12} />
      <Cyl pos={[0, 0.145, 0]} r={0.052} h={0.01} color={C.cream} seg={12} />
    </group>
  )
}

// Table par aavelu khavanu (waiter serve kare tyare dekhay)
function TableFood({ gref, tx, tz, k }) {
  return (
    <group ref={gref} visible={false} position={[tx, 0.9, tz]}>
      <Cyl pos={[0, 0.04, 0]} r={0.14} h={0.08} color={C.plate} seg={20} />
      <Cyl pos={[0, 0.085, 0]} r={0.115} h={0.02} color={C.terra} seg={20} />
      <Steam pos={[0, 0.1, 0]} count={2} size={0.06} rise={0.5} />

      <Cyl pos={[0.05, 0.07, -0.25]} r={0.035} h={0.14} color={C.cream} seg={10} />
      <mesh position={[0.05, 0.17, -0.25]}>
        <sphereGeometry args={[0.03, 8, 8]} />
        <meshStandardMaterial color="#FFB35C" emissive="#FF9A2B" emissiveIntensity={2.5} />
      </mesh>

      <Plate pos={[0.42, 0, 0]} kind={k % 3} />
      <Plate pos={[-0.42, 0, 0]} kind={(k + 1) % 3} />
      <Glass pos={[0.36, 0, 0.3]} />
      <Glass pos={[-0.36, 0, -0.3]} />
    </group>
  )
}

// Entrance (porch) jya thi customers aave
function Porch() {
  return (
    <group>
      <mesh position={[-5.2, -0.15, 7.7]} castShadow receiveShadow>
        <boxGeometry args={[4.4, 0.3, 3.4]} />
        <meshStandardMaterial color={C.wood} />
      </mesh>
      <mesh position={[-5.2, 0.03, 6.8]} receiveShadow>
        <boxGeometry args={[2.4, 0.06, 0.9]} />
        <meshStandardMaterial color={C.terra} />
      </mesh>
      {[-7.2, -3.2].map((x) => (
        <group key={x} position={[x, 0, 6.4]}>
          <Cyl pos={[0, 0.7, 0]} r={0.07} h={1.4} color={C.wood} seg={10} />
          <mesh position={[0, 1.5, 0]}>
            <sphereGeometry args={[0.14, 12, 12]} />
            <meshStandardMaterial color="#FFE2A8" emissive="#FFB35C" emissiveIntensity={1.2} />
          </mesh>
        </group>
      ))}
    </group>
  )
}

/* ---------- Character (code thi control thay) ---------- */
function Actor({ d, gender = 'boy', shirt = C.olive, pants = C.ink, skin = SKIN[1], hair = C.ink, apron = null, phase = 0 }) {
  const root = useRef()
  const upper = useRef()
  const head = useRef()
  const armL = useRef()
  const armR = useRef()
  const legL = useRef()
  const legR = useRef()
  const kneeL = useRef()
  const kneeR = useRef()
  const legsStand = useRef()
  const legsSit = useRef()
  const trayG = useRef()
  const pad = useRef()
  const bubble = useRef()

  useFrame((state, delta) => {
    const g = root.current
    if (!g) return
    g.visible = d.visible
    if (!d.visible) return

    const dt = Math.min(delta, 0.05)
    const t = state.clock.elapsedTime + phase
    const k = Math.min(1, dt * 12)

    g.position.set(d.x, d.sit ? 0.54 : 0.1, d.z)
    const diff = Math.atan2(
      Math.sin(d.rot - g.rotation.y),
      Math.cos(d.rot - g.rotation.y)
    )
    g.rotation.y += diff * k

    legsStand.current.visible = !d.sit
    legsSit.current.visible = d.sit
    upper.current.position.y = d.sit ? 0.05 : 0.5

    let aL = Math.sin(t * 1.5) * 0.05
    let aR = Math.sin(t * 1.5 + 1) * 0.05
    let lL = 0
    let lR = 0
    let kL = 0
    let kR = 0

    if (d.sit) {
      aL = -1.2 + Math.sin(t * 0.7) * 0.05
      aR = -1.2
      if (d.anim === 'eat') aR = -1.2 - Math.max(0, Math.sin(t * 1.6)) * 0.95
      else if (d.anim === 'talk') aR = -1.5 + Math.sin(t * 3) * 0.3
    } else if (d.anim === 'walk') {
      const sw = Math.sin(t * 8)
      aL = -sw * 0.5
      aR = d.carry ? -1.3 : sw * 0.5
      lL = sw * 0.7
      lR = -sw * 0.7
      // Pag pachhal jay tyare ghutan vale
      kL = Math.max(0, sw) * 0.9
      kR = Math.max(0, -sw) * 0.9
    } else if (d.anim === 'talk') {
      aR = -1.6 + Math.sin(t * 3.2) * 0.35
    } else if (d.anim === 'write') {
      aL = -1.0
      aR = -1.15 + Math.sin(t * 9) * 0.07
    } else if (d.carry) {
      aR = -1.3
    }

    armL.current.rotation.x += (aL - armL.current.rotation.x) * k
    armR.current.rotation.x += (aR - armR.current.rotation.x) * k
    legL.current.rotation.x += (lL - legL.current.rotation.x) * k
    legR.current.rotation.x += (lR - legR.current.rotation.x) * k
    kneeL.current.rotation.x += (kL - kneeL.current.rotation.x) * k
    kneeR.current.rotation.x += (kR - kneeR.current.rotation.x) * k

    head.current.rotation.y = Math.sin(t * 0.5) * 0.25
    head.current.rotation.x = Math.sin(t * 0.9) * 0.05

    trayG.current.visible = d.carry
    pad.current.visible = d.anim === 'write'
    bubble.current.visible = d.anim === 'talk'
    bubble.current.position.y = d.sit ? 1.2 : 1.8
    bubble.current.scale.setScalar(1 + Math.sin(t * 6) * 0.06)
  })

  return (
    <group ref={root} visible={false}>
      <Body
        gender={gender}
        shirt={shirt}
        pants={pants}
        skin={skin}
        hair={hair}
        apron={apron}
        phase={phase}
        r={{ upper, head, armL, armR, legL, legR, kneeL, kneeR, legsStand, legsSit }}
        leftHand={
          <group ref={pad} visible={false} position={[0, -0.28, 0.08]}>
            <Part pos={[0, 0, 0]} size={[0.16, 0.2, 0.02]} color={C.cream} />
          </group>
        }
      >
        {/* Tray (waiter carry kare tyare) */}
        <group ref={trayG} visible={false} position={[0.15, 0.38, 0.55]}>
          <Part pos={[0, 0, 0]} size={[0.5, 0.03, 0.4]} color={C.cream} />
          <Cyl pos={[-0.12, 0.04, 0]} r={0.1} h={0.03} color={C.plate} seg={14} />
          <Ball pos={[-0.12, 0.08, 0]} r={0.06} color={C.terra} />
          <Cyl pos={[0.12, 0.04, 0]} r={0.1} h={0.03} color={C.plate} seg={14} />
          <Ball pos={[0.12, 0.08, 0]} r={0.06} color={C.olive} />
          <Glass pos={[0, 0.015, 0.14]} />
        </group>
      </Body>

      {/* Bolvani bubble */}
      <group ref={bubble} visible={false} position={[0.2, 1.8, 0]}>
        <mesh scale={[1.7, 0.8, 1]}>
          <sphereGeometry args={[0.12, 12, 12]} />
          <meshStandardMaterial color="#FFFFFF" />
        </mesh>
        {[-0.09, 0, 0.09].map((x) => (
          <mesh key={x} position={[x, 0.07, 0]}>
            <sphereGeometry args={[0.025, 8, 8]} />
            <meshStandardMaterial color={C.ink} />
          </mesh>
        ))}
      </group>
    </group>
  )
}

/* ---------- Main ---------- */
export default function Journey() {
  const ref = useRef(null)
  if (!ref.current) ref.current = createWorld()
  const w = ref.current

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.05)

    if (!w.seeded) {
      w.seeded = true
      const seeds = [[1, 9], [2, 17], [4, 25]]
      seeds.forEach(([ti, stay], n) => {
        const A = w.guests[n * 2]
        const B = w.guests[n * 2 + 1]
        A.used = true
        B.used = true
        w.jobs.push(seedParty(w, ti, A, B, stay))
      })
    }

    w.spawnIn -= dt
    if (w.spawnIn <= 0 && !w.reception.busy) {
      const freeT = []
      w.tables.forEach((t, i) => {
        if (!t.busy) freeT.push(i)
      })
      const freeG = w.guests.filter((g) => !g.used)
      if (freeT.length > 0 && freeG.length >= 2) {
        const ti = freeT[Math.floor(Math.random() * freeT.length)]
        const A = freeG[0]
        const B = freeG[1]
        A.used = true
        B.used = true
        w.tables[ti].busy = true
        w.jobs.push(makeParty(w, ti, A, B))
        w.spawnIn = 5 + Math.random() * 5
      } else {
        w.spawnIn = 1.5
      }
    }

    w.jobs = w.jobs.filter((job) => !job(dt))
  })

  return (
    <group>
      <Porch />

      {TABLES.map(([tx, tz], i) => (
        <TableFood key={'f' + i} gref={w.foodRefs[i]} tx={tx} tz={tz} k={i} />
      ))}

      <Actor d={w.host} gender="girl" shirt={C.terra} skin={SKIN[0]} hair="#5A3A22" />

      {/* Waiters: ek chhokro, ek chhokri */}
      {w.waiters.map((d, i) => (
        <Actor
          key={'w' + i}
          d={d}
          gender={i % 2 ? 'girl' : 'boy'}
          shirt={C.olive}
          apron={C.cream}
          skin={SKIN[(i + 1) % 4]}
          phase={i * 1.3}
        />
      ))}

      {/* Guests jodi ma aave (A, B): A chhokro, B chhokri */}
      {w.guests.map((d, i) => (
        <Actor
          key={'g' + i}
          d={d}
          gender={i % 2 ? 'girl' : 'boy'}
          shirt={LOOKS[i][0]}
          hair={LOOKS[i][1]}
          skin={SKIN[LOOKS[i][2]]}
          phase={i * 0.7}
        />
      ))}
    </group>
  )
}