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
  ink: '#2B1D14',
}
const SKIN = ['#F1C9A5', '#E8B08A', '#C98B62', '#A8683F']

/* ---------- Layout ---------- */
const TABLES = [
  [0, 1.5], [3, 1.5], [6, 1.5],
  [0, 4.5], [3, 4.5], [6, 4.5],
]
const DESK_POST = [-5.5, 3.8]
const SPOTS = [[-6.1, 5.5], [-4.9, 5.5]]
const DOOR = [[-5.8, 9.0], [-4.8, 9.5]]
// Waiters ni sankhya vadharva mate ahi navi jagya umero
const WAITER_HOMES = [[2.0, -0.05], [3.4, -0.05], [4.8, -0.05], [6.2, -0.05]]

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
const lanePt = (ti, s) => {
  const [tx, tz] = TABLES[ti]
  return [tx + s * 1.5, tz]
}
const toSeatPath = (ti, s) => {
  const [lx, lz] = lanePt(ti, s)
  const [sx, sz] = seatPos(ti, s)
  return [[-2.6, 5.5], [-2.6, 3.0], [lx, 3.0], [lx, lz], [sx, sz]]
}
const fromSeatPath = (ti, s) => {
  const [lx, lz] = lanePt(ti, s)
  return [[lx, lz], [lx, 3.0], [-2.6, 3.0], [-2.6, 5.9], [-3.6, 5.9], [-3.6, 9.6]]
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
const walk = (a, x, z, speed = 1.6, face = null) => (dt) => {
  const dx = x - a.x
  const dz = z - a.z
  const d = Math.hypot(dx, dz)
  const step = speed * dt
  if (d <= step) {
    a.x = x
    a.z = z
    a.anim = 'idle'
    if (face !== null) a.rot = face
    return true
  }
  a.x += (dx / d) * step
  a.z += (dz / d) * step
  a.rot = Math.atan2(dx, dz)
  a.anim = 'walk'
  return false
}
const walkPath = (a, pts, speed = 1.6, face = null) =>
  seq(
    ...pts.map(([x, z], k) =>
      walk(a, x, z, speed, k === pts.length - 1 ? face : null)
    )
  )

/* ---------- World (badhu data ahi) ---------- */
const mkActor = () => ({
  x: 0, z: 0, rot: 0, anim: 'idle',
  sit: false, carry: false, visible: false, used: false,
})

function createWorld() {
  return {
    host: { ...mkActor(), x: DESK_POST[0], z: DESK_POST[1], visible: true, atDesk: true },
    guests: Array.from({ length: 12 }, mkActor),
    waiters: WAITER_HOMES.map(([x, z]) => ({
      ...mkActor(), x, z, rot: Math.PI, visible: true, home: [x, z], busy: false,
    })),
    tables: TABLES.map(() => ({ busy: false })),
    foodRefs: TABLES.map(() => ({ current: null })),
    reception: { busy: false },
    jobs: [],
    spawnIn: 3.8,
    seeded: false,
  }
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

const hostEscort = (w) =>
  seq(
    walkPath(w.host, [[-2.2, 3.8]], 1.7, Math.PI / 2),
    call(() => { w.host.anim = 'talk' }),
    wait(1.8),
    call(() => { w.host.anim = 'idle' }),
    walkPath(w.host, [DESK_POST], 1.7, 0),
    call(() => { w.host.atDesk = true })
  )

const serve = (w, ti, A, B) => {
  let wt = null
  const lx = TABLES[ti][0] + 1.5
  const tz = TABLES[ti][1]
  return seq(
    until(() => {
      wt = w.waiters.find((x) => !x.busy)
      if (wt) wt.busy = true
      return !!wt
    }),
    lazy(() => {
      const [hx, hz] = wt.home
      const out = [[hx, 0.18], [lx, 0.18], [lx, tz]]
      const back = [[lx, 0.18], [hx, 0.18], [hx, hz]]
      return seq(
        walkPath(wt, out, 1.7, -Math.PI / 2),
        call(() => { wt.anim = 'write'; A.anim = 'talk'; B.anim = 'talk' }),
        wait(3.4),
        call(() => { wt.anim = 'idle'; A.anim = 'idle'; B.anim = 'idle' }),
        walkPath(wt, back, 1.7, Math.PI),
        wait(3.2),
        call(() => { wt.carry = true }),
        walkPath(wt, out, 1.7, -Math.PI / 2),
        call(() => {
          wt.carry = false
          w.foodRefs[ti].current.visible = true
          A.anim = 'eat'
          B.anim = 'eat'
        }),
        wait(1.4),
        walkPath(wt, back, 1.7, Math.PI),
        call(() => { wt.busy = false })
      )
    })
  )
}

const leave = (w, ti, A, B) => {
  const exit = (g, s, delay) =>
    seq(
      wait(delay),
      call(() => { g.sit = false; g.anim = 'idle' }),
      walkPath(g, fromSeatPath(ti, s), 1.6),
      call(() => { g.visible = false; g.used = false })
    )
  return seq(
    call(() => {
      w.foodRefs[ti].current.visible = false
      w.tables[ti].busy = false
    }),
    par(exit(A, 1, 0), exit(B, -1, 0.8))
  )
}

const makeParty = (w, ti, A, B) =>
  seq(
    call(() => {
      w.reception.busy = true
      const pair = [A, B]
      pair.forEach((g, k) => {
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
      walk(A, SPOTS[0][0], SPOTS[0][1], 1.7, Math.PI),
      seq(wait(0.6), walk(B, SPOTS[1][0], SPOTS[1][1], 1.7, Math.PI))
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
      w.reception.busy = false
    }),
    par(
      hostEscort(w),
      seq(wait(0.9), walkPath(A, toSeatPath(ti, 1), 1.6), sitDown(A, ti, 1)),
      seq(wait(1.7), walkPath(B, toSeatPath(ti, -1), 1.6), sitDown(B, ti, -1))
    ),
    wait(1.2),
    serve(w, ti, A, B),
    wait(14 + Math.random() * 8),
    leave(w, ti, A, B)
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
function Actor({ d, shirt = C.olive, pants = C.ink, skin = SKIN[1], hair = C.ink, apron = null, phase = 0 }) {
  const root = useRef()
  const upper = useRef()
  const head = useRef()
  const armL = useRef()
  const armR = useRef()
  const legL = useRef()
  const legR = useRef()
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
      <group ref={legsStand}>
        <group ref={legL} position={[-0.1, 0.5, 0]}>
          <Part pos={[0, -0.25, 0]} size={[0.14, 0.5, 0.16]} color={pants} />
        </group>
        <group ref={legR} position={[0.1, 0.5, 0]}>
          <Part pos={[0, -0.25, 0]} size={[0.14, 0.5, 0.16]} color={pants} />
        </group>
      </group>

      <group ref={legsSit} visible={false}>
        <Part pos={[-0.1, 0.06, 0.2]} size={[0.14, 0.12, 0.42]} color={pants} />
        <Part pos={[0.1, 0.06, 0.2]} size={[0.14, 0.12, 0.42]} color={pants} />
        <Part pos={[-0.1, -0.2, 0.38]} size={[0.12, 0.42, 0.12]} color={pants} />
        <Part pos={[0.1, -0.2, 0.38]} size={[0.12, 0.42, 0.12]} color={pants} />
      </group>

      <group ref={upper} position={[0, 0.5, 0]}>
        <Part pos={[0, 0.28, 0]} size={[0.42, 0.56, 0.26]} color={shirt} />
        {apron && <Part pos={[0, 0.2, 0.14]} size={[0.36, 0.4, 0.03]} color={apron} />}

        <group ref={armL} position={[-0.27, 0.5, 0]}>
          <Part pos={[0, -0.25, 0]} size={[0.11, 0.5, 0.11]} color={shirt} />
          <Part pos={[0, -0.53, 0]} size={[0.1, 0.1, 0.1]} color={skin} />
          <group ref={pad} visible={false} position={[0, -0.55, 0.1]}>
            <Part pos={[0, 0, 0]} size={[0.16, 0.2, 0.02]} color={C.cream} />
          </group>
        </group>
        <group ref={armR} position={[0.27, 0.5, 0]}>
          <Part pos={[0, -0.25, 0]} size={[0.11, 0.5, 0.11]} color={shirt} />
          <Part pos={[0, -0.53, 0]} size={[0.1, 0.1, 0.1]} color={skin} />
        </group>

        {/* Tray (waiter carry kare tyare) */}
        <group ref={trayG} visible={false} position={[0.15, 0.38, 0.55]}>
          <Part pos={[0, 0, 0]} size={[0.5, 0.03, 0.4]} color={C.cream} />
          <Cyl pos={[-0.12, 0.04, 0]} r={0.1} h={0.03} color={C.plate} seg={14} />
          <Ball pos={[-0.12, 0.08, 0]} r={0.06} color={C.terra} />
          <Cyl pos={[0.12, 0.04, 0]} r={0.1} h={0.03} color={C.plate} seg={14} />
          <Ball pos={[0.12, 0.08, 0]} r={0.06} color={C.olive} />
          <Glass pos={[0, 0.015, 0.14]} />
        </group>

        <group ref={head} position={[0, 0.74, 0]}>
          <mesh castShadow>
            <sphereGeometry args={[0.17, 14, 14]} />
            <meshStandardMaterial color={skin} />
          </mesh>
          <Part pos={[-0.06, 0.03, 0.16]} size={[0.035, 0.035, 0.02]} color={C.ink} />
          <Part pos={[0.06, 0.03, 0.16]} size={[0.035, 0.035, 0.02]} color={C.ink} />
          <mesh position={[0, 0.07, -0.02]} scale={[1, 0.75, 1]} castShadow>
            <sphereGeometry args={[0.18, 12, 12]} />
            <meshStandardMaterial color={hair} />
          </mesh>
        </group>
      </group>

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

      <Actor d={w.host} shirt={C.terra} skin={SKIN[0]} />

      {w.waiters.map((d, i) => (
        <Actor
          key={'w' + i}
          d={d}
          shirt={C.olive}
          apron={C.cream}
          skin={SKIN[(i + 1) % 4]}
          phase={i * 1.3}
        />
      ))}

      {w.guests.map((d, i) => (
        <Actor
          key={'g' + i}
          d={d}
          shirt={LOOKS[i][0]}
          hair={LOOKS[i][1]}
          skin={SKIN[LOOKS[i][2]]}
          phase={i * 0.7}
        />
      ))}
    </group>
  )
}