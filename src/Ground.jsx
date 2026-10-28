import { createRef, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Body } from './Characters'
import { Boxes, Part, Slab } from './Outside'
import { C, G, WALK_Y, WALK_F, FIELD as F, FIELD_FENCE as FF, FIELD_GATE } from './layout'

const SKIN = ['#F1C9A5', '#E8B08A', '#C98B62', '#A8683F']
const CX = (F.x0 + F.x1) / 2
const CZ = (F.z0 + F.z1) / 2
const GOAL = 1.2              // goal ni adhi pahodai (z)
const LINE = G + 0.035
const clamp = (v, a, b) => Math.max(a, Math.min(b, v))

/* ---------- Medan: ghaas na patta, lines, fence (instanced) ---------- */
const STRIPES = [[], []]
{
  const x0 = F.x0 - 0.8
  const n = 10
  const sw = (F.x1 - F.x0 + 1.6) / n
  for (let i = 0; i < n; i++) {
    STRIPES[i % 2].push([[x0 + sw * (i + 0.5), G + 0.01, CZ], [sw, 0.02, F.z1 - F.z0 + 1.6]])
  }
}
const LINES = []
{
  const hl = (xa, xb, z) => LINES.push([[(xa + xb) / 2, LINE, z], [xb - xa + 0.08, 0.01, 0.08]])
  const vl = (x, za, zb) => LINES.push([[x, LINE, (za + zb) / 2], [0.08, 0.01, zb - za]])
  hl(F.x0, F.x1, F.z0)
  hl(F.x0, F.x1, F.z1)
  vl(F.x0, F.z0, F.z1)
  vl(F.x1, F.z0, F.z1)
  vl(CX, F.z0, F.z1)
  // Penalty box banne baju
  ;[[F.x0, 1], [F.x1, -1]].forEach(([gx, s]) => {
    const bx = gx + s * 2.6
    vl(bx, CZ - 2.6, CZ + 2.6)
    hl(Math.min(gx, bx), Math.max(gx, bx), CZ - 2.6)
    hl(Math.min(gx, bx), Math.max(gx, bx), CZ + 2.6)
  })
}

// Fence: thambha, upar-niche patti ane jaali (gate vali jagya khulli)
const POSTS = []
const BARS = []
const NETS = []
const fenceRun = (x0, z0, x1, z1) => {
  const len = Math.hypot(x1 - x0, z1 - z0)
  const n = Math.max(1, Math.round(len / 1.5))
  for (let k = 0; k <= n; k++) {
    POSTS.push([[x0 + ((x1 - x0) * k) / n, G + 0.7, z0 + ((z1 - z0) * k) / n], [0.08, 1.4, 0.08]])
  }
  const mid = [(x0 + x1) / 2, 0, (z0 + z1) / 2]
  const size = (h) => (z0 === z1 ? [len, h, 0.05] : [0.05, h, len])
  ;[0.08, 1.38].forEach((y) => BARS.push([[mid[0], G + y, mid[2]], size(0.05)]))
  NETS.push([[mid[0], G + 0.72, mid[2]], size(1.28)])
}
fenceRun(FF.x0, FF.z0, FIELD_GATE[0], FF.z0)
fenceRun(FIELD_GATE[1], FF.z0, FF.x1, FF.z0)
fenceRun(FF.x0, FF.z1, FF.x1, FF.z1)
fenceRun(FF.x0, FF.z0, FF.x0, FF.z1)
fenceRun(FF.x1, FF.z0, FF.x1, FF.z1)

function Goal({ x, s }) {
  // s = +1 (dabi baju no goal, jaal -x baju), -1 (jamni baju)
  const net = { transparent: true, opacity: 0.35, depthWrite: false }
  return (
    <group position={[x, G, CZ]}>
      {[-GOAL, GOAL].map((z) => (
        <group key={z}>
          <Part pos={[0, 0.55, z]} size={[0.08, 1.1, 0.08]} color={C.rail} />
          <Part pos={[-s * 0.35, 0.03, z]} size={[0.7, 0.05, 0.05]} color={C.rail} />
          <Part pos={[-s * 0.35, 0.55, z]} size={[0.7, 1.1, 0.02]} color={C.rail} {...net} />
        </group>
      ))}
      <Part pos={[0, 1.1, 0]} size={[0.08, 0.08, GOAL * 2 + 0.08]} color={C.rail} />
      <Part pos={[-s * 0.7, 0.55, 0]} size={[0.02, 1.1, GOAL * 2]} color={C.rail} {...net} />
      <Part pos={[-s * 0.35, 1.1, 0]} size={[0.7, 0.02, GOAL * 2]} color={C.rail} {...net} />
    </group>
  )
}

/* ---------- Khelado: 4 + goalkeeper, banne team ---------- */
const TEAMS = [
  { shirt: C.terra, pants: C.cream, keeper: C.gold, atk: 1 },   // -x goal sachve, +x baju humlo
  { shirt: C.teal, pants: C.rail, keeper: '#7A4E7E', atk: -1 },
]
// [team, keeper?, home x, home z]
const SQUAD = [
  [0, true, F.x0 + 0.7, CZ], [0, false, CX - 5, CZ - 2.6], [0, false, CX - 5, CZ + 2.6],
  [0, false, CX - 1.5, CZ - 1.2], [0, false, CX - 1, CZ + 3],
  [1, true, F.x1 - 0.7, CZ], [1, false, CX + 5, CZ + 2.6], [1, false, CX + 5, CZ - 2.6],
  [1, false, CX + 1.5, CZ + 1.2], [1, false, CX + 1, CZ - 3],
]

function createGame() {
  return {
    ball: { x: CX, z: CZ, vx: 0, vz: 0 },
    cool: 1,
    players: SQUAD.map(([team, keeper, hx, hz]) => ({
      team, keeper, hx, hz, x: hx, z: hz, rot: team ? -Math.PI / 2 : Math.PI / 2,
      speed: 0, cool: 0, kick: 0, ph: Math.random() * 6,
    })),
  }
}

function kick(game, p) {
  const b = game.ball
  const atk = TEAMS[p.team].atk
  let tx = atk > 0 ? F.x1 + 0.4 : F.x0 - 0.4
  let tz = CZ + (Math.random() - 0.5) * 3
  // Ghani vaar pass, kyarek seedho goal taraf
  if (p.keeper || Math.random() < 0.55) {
    const mates = game.players.filter((q) => q.team === p.team && q !== p && !q.keeper)
    const m = mates[Math.floor(Math.random() * mates.length)]
    tx = m.x + atk * 1.2
    tz = m.z
  }
  const dx = tx - b.x
  const dz = tz - b.z
  const d = Math.hypot(dx, dz) || 1
  const pow = clamp(d * 1.2 + 1, 3, 10)
  b.vx = (dx / d) * pow
  b.vz = (dz / d) * pow
  p.cool = 0.8
  p.kick = 0.25
  game.cool = 0.3
}

function step(game, dt) {
  const b = game.ball
  const ps = game.players
  game.cool -= dt

  // Dado gabde ane dhimo pade
  b.x += b.vx * dt
  b.z += b.vz * dt
  const f = Math.exp(-1.1 * dt)
  b.vx *= f
  b.vz *= f
  if (b.z < F.z0 + 0.15 || b.z > F.z1 - 0.15) {
    b.z = clamp(b.z, F.z0 + 0.15, F.z1 - 0.15)
    b.vz = -b.vz * 0.6
  }
  if (b.x < F.x0 || b.x > F.x1) {
    if (Math.abs(b.z - CZ) < GOAL && (b.x < F.x0 - 0.3 || b.x > F.x1 + 0.3)) {
      // Goal! vachhe thi pachhu sharu
      b.x = CX
      b.z = CZ
      b.vx = b.vz = 0
      game.cool = 1.5
    } else if (Math.abs(b.z - CZ) >= GOAL) {
      b.x = clamp(b.x, F.x0, F.x1)
      b.vx = -b.vx * 0.6
    }
  }

  // Dar team mathi dada ni sauthi najik no khelado dode
  const chaser = [0, 1].map((t) => {
    let best = null
    let bd = Infinity
    ps.forEach((p) => {
      if (p.team !== t || p.keeper) return
      const d = Math.hypot(p.x - b.x, p.z - b.z)
      if (d < bd) {
        bd = d
        best = p
      }
    })
    return best
  })

  ps.forEach((p) => {
    const atk = TEAMS[p.team].atk
    let tx
    let tz
    let sp
    if (p.keeper) {
      const near = Math.abs(b.x - p.hx) < 2.2 && Math.abs(b.z - CZ) < 2.6
      tx = near ? b.x : p.hx
      tz = near ? b.z : clamp(b.z, CZ - GOAL, CZ + GOAL)
      sp = 2.4
    } else if (p === chaser[p.team]) {
      tx = b.x - atk * 0.3
      tz = b.z
      sp = 3.6
    } else {
      tx = clamp(p.hx + (b.x - CX) * 0.5, F.x0 + 1, F.x1 - 1)
      tz = clamp(p.hz + (b.z - CZ) * 0.3, F.z0 + 0.5, F.z1 - 0.5)
      sp = 2.4
    }
    const dx = tx - p.x
    const dz = tz - p.z
    const d = Math.hypot(dx, dz)
    const v = Math.min(sp, d * 2.5)
    if (d > 0.01) {
      p.x += (dx / d) * v * dt
      p.z += (dz / d) * v * dt
    }
    p.speed = v
    p.cool -= dt
    p.kick -= dt
    const want = v > 0.3 ? Math.atan2(dx, dz) : Math.atan2(b.x - p.x, b.z - p.z)
    p.rot += Math.atan2(Math.sin(want - p.rot), Math.cos(want - p.rot)) * Math.min(1, dt * 8)
    if (game.cool <= 0 && p.cool <= 0 && Math.hypot(b.x - p.x, b.z - p.z) < 0.45) kick(game, p)
  })

  // Khelado ek-bija ma na ghuse
  for (let i = 0; i < ps.length; i++) {
    for (let j = i + 1; j < ps.length; j++) {
      const a = ps[i]
      const c = ps[j]
      const dx = c.x - a.x
      const dz = c.z - a.z
      const d = Math.hypot(dx, dz)
      if (d > 0 && d < 0.55) {
        const push = (0.55 - d) / 2 / d
        a.x -= dx * push
        a.z -= dz * push
        c.x += dx * push
        c.z += dz * push
      }
    }
  }
}

function Player({ rig, team, keeper, skin, hair }) {
  const t = TEAMS[team]
  return (
    <group ref={rig.root}>
      <Body
        shirt={keeper ? t.keeper : t.shirt} pants={t.pants} skin={skin} hair={hair}
        r={{ armL: rig.armL, armR: rig.armR, legL: rig.legL, legR: rig.legR, kneeL: rig.kneeL, kneeR: rig.kneeR }}
      />
    </group>
  )
}

export default function Ground() {
  const game = useRef(null)
  if (!game.current) game.current = createGame()
  const rigs = useMemo(
    () => SQUAD.map(() => ({
      root: createRef(), armL: createRef(), armR: createRef(), legL: createRef(),
      legR: createRef(), kneeL: createRef(), kneeR: createRef(),
    })),
    []
  )
  const ball = useRef()

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.05)
    const gm = game.current
    step(gm, dt)

    gm.players.forEach((p, i) => {
      const r = rigs[i]
      const g = r.root.current
      if (!g) return
      g.position.set(p.x, G + 0.02, p.z)
      g.rotation.y = p.rot
      // Jetlu jaldi dode tetla pag-haath vadhare hale
      const amt = Math.min(1, p.speed / 3)
      p.ph += dt * (5 + p.speed * 2.5)
      const sw = Math.sin(p.ph) * amt
      r.armL.current.rotation.x = -sw * 0.7
      r.armR.current.rotation.x = sw * 0.7
      r.legL.current.rotation.x = sw * 0.9
      r.legR.current.rotation.x = p.kick > 0 ? -1.1 : -sw * 0.9
      r.kneeL.current.rotation.x = Math.max(0, sw) * 1.1
      r.kneeR.current.rotation.x = p.kick > 0 ? 0.2 : Math.max(0, -sw) * 1.1
    })

    const b = gm.ball
    const m = ball.current
    if (m) {
      m.position.set(b.x, G + 0.14, b.z)
      m.rotation.x += (b.vz * dt) / 0.12
      m.rotation.z -= (b.vx * dt) / 0.12
    }
  })

  return (
    <group>
      {/* Footpath thi gate sudhi raasto */}
      <Slab x0={FIELD_GATE[0]} x1={FIELD_GATE[1]} z0={WALK_F[1]} z1={FF.z0 + 0.4} top={WALK_Y} h={0.12} color={C.walk} />

      <Boxes items={STRIPES[0]} color={C.pitch} shadow={false} />
      <Boxes items={STRIPES[1]} color={C.pitch2} shadow={false} />
      <Boxes items={LINES} color={C.rail} shadow={false} />
      <mesh position={[CX, LINE, CZ]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[1.55, 1.63, 40]} />
        <meshStandardMaterial color={C.rail} />
      </mesh>
      <Goal x={F.x0} s={1} />
      <Goal x={F.x1} s={-1} />

      <Boxes items={POSTS} color={C.oliveDark} />
      <Boxes items={BARS} color={C.oliveDark} />
      <Boxes items={NETS} color="#C9D6CF" shadow={false} transparent opacity={0.28} depthWrite={false} />

      {SQUAD.map(([team, keeper], i) => (
        <Player
          key={i} rig={rigs[i]} team={team} keeper={keeper} skin={SKIN[(i * 3) % 4]}
          hair={i % 3 ? C.ink : '#5A3A22'}
        />
      ))}
      <mesh ref={ball} castShadow>
        <icosahedronGeometry args={[0.12, 1]} />
        <meshStandardMaterial color={C.rail} flatShading />
      </mesh>
    </group>
  )
}
