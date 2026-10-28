import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { CanvasTexture, SRGBColorSpace } from 'three'
import { Body } from './Characters'
import { Bench, Boxes, Part, Slab } from './Outside'
import {
  C, G, ROAD_Y, WALK_Y, ROAD, BACK, AVE, DRIVE, PLOT, GATE, STORE_H, FLOOR_H, BUILDINGS, TOWER,
  BUS_STOP, PARK_PATH, PLAZA, BENCHES, PALMS,
} from './layout'

const SKIN = ['#F1C9A5', '#E8B08A', '#C98B62', '#A8683F']
const WARM = '#FFD9A0'      // raate bari/kaach no prakash

/* ---------- Bario, safed patti ane railing (badhu instanced) ---------- */
const WIN_LIT = []          // raate chalu thay
const WIN_DARK = []
const TRIM = []             // safed: sill, fin, maal ni patti, railing
let wn = 0

// Building na local (front = +z) bindu ne world ma
const place = (b, lx, ly, lz, ry = 0) => {
  const c = Math.cos(b.rot)
  const s = Math.sin(b.rot)
  return [[b.x + lx * c + lz * s, G + ly, b.z - lx * s + lz * c], b.rot + ry]
}

// Ek diwal par bario ni jaali: face = front / left / right
const addWindows = (b, face, ys, size, gap, sill) => {
  const len = face === 'front' ? b.w : b.d
  const n = Math.floor((len - 0.8) / gap)
  ys.forEach((y) => {
    for (let k = 0; k < n; k++) {
      const t = (k - (n - 1) / 2) * gap
      const [lx, lz, ry] =
        face === 'front' ? [t, 0.02, 0]
          : face === 'left' ? [-b.w / 2 - 0.02, -b.d / 2 + t, -Math.PI / 2]
            : [b.w / 2 + 0.02, -b.d / 2 + t, Math.PI / 2]
      const [p, r] = place(b, lx, y, lz, ry)
      ;((wn++ * 7) % 10 < 6 ? WIN_LIT : WIN_DARK).push([p, size, r])
      if (sill) {
        const [sp] = place(b, lx + Math.sin(ry) * 0.06, y - size[1] / 2 - 0.04, lz + Math.cos(ry) * 0.06)
        TRIM.push([sp, [size[0] + 0.2, 0.07, 0.14], r])
      }
    }
  })
}

BUILDINGS.forEach((b) => {
  const ys = Array.from({ length: b.floors - 1 }, (_, f) => STORE_H + f * FLOOR_H + 1.45)
  ;['front', 'left', 'right'].forEach((face) => addWindows(b, face, ys, [0.9, 1.2, 0.08], 1.5, true))
})

// Tower: moti bario + safed fin ane maal ni patti (curtain wall jevu)
{
  const t = TOWER
  const H = t.floors * t.fh
  const ys = Array.from({ length: t.floors }, (_, f) => f * t.fh + 1.7)
  ;['front', 'left', 'right'].forEach((face) => addWindows(t, face, ys, [1.2, 2.3, 0.06], 1.5, false))
  for (let k = 0; k <= 4; k++) {
    const u = (k - 2) * 1.5
    TRIM.push([place(t, u, H / 2, 0.05)[0], [0.12, H, 0.18]])
    TRIM.push([place(t, -t.w / 2 - 0.05, H / 2, -t.d / 2 + u)[0], [0.18, H, 0.12]])
    TRIM.push([place(t, t.w / 2 + 0.05, H / 2, -t.d / 2 + u)[0], [0.18, H, 0.12]])
  }
  for (let f = 1; f < t.floors; f++) {
    TRIM.push([place(t, 0, f * t.fh, -t.d / 2)[0], [t.w + 0.12, 0.16, t.d + 0.12]])
  }
}

// Plot ni safed railing: patla dandiya + jada thambha + upar-niche patti
const railRun = (x0, z0, x1, z1) => {
  const len = Math.hypot(x1 - x0, z1 - z0)
  const n = Math.max(1, Math.round(len / 0.3))
  for (let k = 0; k <= n; k++) {
    const x = x0 + ((x1 - x0) * k) / n
    const z = z0 + ((z1 - z0) * k) / n
    TRIM.push([[x, G + 0.5, z], k % 8 === 0 || k === n ? [0.1, 1.0, 0.1] : [0.035, 0.9, 0.035]])
  }
  const along = z0 === z1 ? [len, 0.06, 0.06] : [0.06, 0.06, len]
  ;[0.15, 0.95].forEach((y) => TRIM.push([[(x0 + x1) / 2, G + y, (z0 + z1) / 2], along]))
}
{
  const { x0, x1, z0, z1 } = PLOT
  ;[[x0, GATE[0]], [GATE[1], DRIVE[0]], [DRIVE[1], x1]].forEach(([a, b]) => railRun(a, z1, b, z1))
  railRun(x0, z0, x1, z0)
  railRun(x0, z0, x0, z1)
  railRun(x1, z0, x1, z1)
  // Gate na khulla pankha: railing ni baju ma vali ne mukela (porch ane footpath khulla rahe)
  ;[GATE[0] - 0.75, GATE[1] + 0.75].forEach((cx) => {
    const z = z1 + 0.1
    TRIM.push([[cx, G + 0.15, z], [1.3, 0.06, 0.04]], [[cx, G + 0.95, z], [1.3, 0.06, 0.04]])
    for (let k = -2; k <= 2; k++) TRIM.push([[cx + k * 0.25, G + 0.55, z], [0.035, 0.8, 0.035]])
  })
}

/* ---------- Naam nu board (CanvasTexture) ---------- */
function SignBoard({ name, tag, bg, fg, pos, size, rot = 0, night }) {
  const [w, h] = size
  const tex = useMemo(() => {
    const cv = document.createElement('canvas')
    cv.width = 1024
    cv.height = Math.round((1024 * h) / w)
    const H = cv.height
    const g = cv.getContext('2d')
    g.fillStyle = bg
    g.fillRect(0, 0, cv.width, H)
    g.strokeStyle = fg
    g.lineWidth = 6
    g.strokeRect(12, 12, cv.width - 24, H - 24)
    g.fillStyle = fg
    g.textAlign = 'center'
    g.textBaseline = 'middle'
    g.font = `bold ${Math.round(H * 0.44)}px Georgia, serif`
    g.fillText(name, 512, H * 0.42, 940)
    g.font = `600 ${Math.round(H * 0.17)}px Arial, sans-serif`
    g.fillText(tag.toUpperCase(), 512, H * 0.78, 940)
    const t = new CanvasTexture(cv)
    t.colorSpace = SRGBColorSpace
    t.anisotropy = 4
    return t
  }, [name, tag, bg, fg, w, h])
  useEffect(() => () => tex.dispose(), [tex])

  return (
    <mesh position={pos} rotation={[0, rot, 0]}>
      <planeGeometry args={size} />
      <meshStandardMaterial map={tex} emissive="#FFFFFF" emissiveMap={tex} emissiveIntensity={night ? 0.9 : 0} />
    </mesh>
  )
}

/* ---------- Niche ni dukan (building nu local, aagal ni diwal z = 0) ---------- */
function StoreFront({ w, name, tag, accent, night }) {
  const lit = { emissive: WARM, emissiveIntensity: night ? 1.1 : 0, roughness: 0.15, metalness: 0.3 }
  const door = w / 2 - 1.2
  const g0 = -w / 2 + 0.5
  const g1 = door - 0.7
  const gx = (g0 + g1) / 2
  const n = Math.round((g1 - g0) / 1.5)
  const stripes = Math.round((w - 0.4) / 0.6)
  const sw = (w - 0.4) / stripes
  const signW = Math.min(w - 1.4, 5.2)

  return (
    <group>
      {/* Kaach no aagal no bhag */}
      <Part pos={[gx, 1.4, 0.03]} size={[g1 - g0, 1.5, 0.06]} color={C.glass} {...lit} />
      <Part pos={[gx, 0.3, 0.03]} size={[g1 - g0, 0.5, 0.06]} color={accent} />
      <Part pos={[gx, 0.62, 0.06]} size={[g1 - g0 + 0.15, 0.08, 0.1]} color={C.ink} />
      <Part pos={[gx, 2.18, 0.06]} size={[g1 - g0 + 0.15, 0.08, 0.1]} color={C.ink} />
      {Array.from({ length: n + 1 }, (_, k) => (
        <Part key={k} pos={[g0 + ((g1 - g0) * k) / n, 1.4, 0.06]} size={[0.08, 1.6, 0.1]} color={C.ink} />
      ))}

      {/* Darvajo */}
      <Part pos={[door, 1.05, 0.03]} size={[1.05, 2.1, 0.08]} color={C.ink} />
      <Part pos={[door, 1.0, 0.06]} size={[0.85, 1.95, 0.06]} color={C.wood} />
      <Part pos={[door, 1.35, 0.1]} size={[0.55, 0.9, 0.02]} color={C.glass} {...lit} />
      <Part pos={[door + 0.3, 1.0, 0.12]} size={[0.05, 0.25, 0.05]} color={C.gold} />

      {/* Patta vali chhatri (awning) */}
      <group position={[0, 2.55, 0]} rotation={[0.45, 0, 0]}>
        {Array.from({ length: stripes }, (_, i) => (
          <Part
            key={i} pos={[-(w - 0.4) / 2 + sw * (i + 0.5), 0, 0.55]} size={[sw, 0.06, 1.1]}
            color={i % 2 ? C.cream : accent}
          />
        ))}
      </group>

      {/* Naam nu board */}
      <Part pos={[0, 3.0, 0.04]} size={[signW + 0.2, 0.84, 0.08]} color={C.ink} />
      <SignBoard
        name={name} tag={tag} bg={accent} fg={accent === C.gold ? C.ink : C.cream}
        pos={[0, 3.0, 0.09]} size={[signW, 0.66]} night={night}
      />
    </group>
  )
}

// Office block ni lobby (kaach ni diwal + vachhe darvajo)
function Lobby({ w, name, tag, night }) {
  const lit = { emissive: WARM, emissiveIntensity: night ? 0.9 : 0, roughness: 0.15, metalness: 0.3 }
  return (
    <group>
      <Part pos={[0, 1.35, 0.03]} size={[w - 1.2, 2.4, 0.06]} color={C.tealGlass} {...lit} />
      {[-2, -1, 0, 1, 2].map((k) => (
        <Part key={k} pos={[(k * (w - 1.2)) / 4, 1.35, 0.07]} size={[0.08, 2.4, 0.08]} color={C.rail} />
      ))}
      <Part pos={[0, 2.62, 0.6]} size={[2.6, 0.12, 1.2]} color={C.rail} />
      <SignBoard name={name} tag={tag} bg={C.rail} fg={C.teal} pos={[0, 3.05, 0.05]} size={[3.6, 0.55]} night={night} />
    </group>
  )
}

function Building({ b, night }) {
  const { w, d, floors, wall } = b
  const H = STORE_H + (floors - 1) * FLOOR_H
  return (
    <group position={[b.x, G, b.z]} rotation={[0, b.rot, 0]}>
      <Part pos={[0, H / 2, -d / 2]} size={[w, H, d]} color={wall} />
      {/* Dukan ane upar na maal vachhe ni patti */}
      <Part pos={[0, STORE_H + 0.07, -d / 2]} size={[w + 0.12, 0.14, d + 0.12]} color={C.rail} />
      {/* Saphat chhat: parapet, seedhi no kamro, AC */}
      <Part pos={[0, H + 0.15, -d / 2]} size={[w + 0.2, 0.3, d + 0.2]} color={C.roof} />
      <Part pos={[0, H + 0.31, -d / 2]} size={[w - 0.4, 0.03, d - 0.4]} color="#C7C0B2" />
      <Part pos={[-w / 4, H + 0.75, -d * 0.62]} size={[1.5, 0.9, 1.2]} color={C.facade2} />
      <Part pos={[w / 4, H + 0.6, -d * 0.35]} size={[0.9, 0.55, 0.7]} color="#B9C2C0" />
      {b.store && <StoreFront w={w} {...b.store} night={night} />}
      {b.office && <Lobby w={w} {...b.office} night={night} />}
    </group>
  )
}

function Tower() {
  const { x, z, w, d, floors, fh } = TOWER
  const H = floors * fh
  return (
    <group position={[x, G, z]}>
      <Part pos={[0, H / 2, -d / 2]} size={[w, H, d]} color={C.tealGlass} roughness={0.2} metalness={0.35} />
      <Part pos={[0, H + 0.2, -d / 2]} size={[w + 0.2, 0.4, d + 0.2]} color={C.rail} />
      <Part pos={[0, H + 0.9, -d * 0.55]} size={[2.2, 1.0, 2.2]} color={C.roof} />
      <Part pos={[0, 2.7, 0.6]} size={[3, 0.15, 1.2]} color={C.rail} />
    </group>
  )
}

/* ---------- Gate, bus stop, palm ---------- */
function Gate({ night }) {
  const cx = (GATE[0] + GATE[1]) / 2
  const z = PLOT.z1
  return (
    <group>
      {[GATE[0] - 0.1, GATE[1] + 0.1].map((x) => (
        <group key={x}>
          <Part pos={[x, G + 1.15, z]} size={[0.24, 2.3, 0.24]} color={C.rail} />
          <Part pos={[x, G + 2.34, z]} size={[0.32, 0.08, 0.32]} color={C.terra} />
        </group>
      ))}
      <Part pos={[cx, G + 2.15, z]} size={[GATE[1] - GATE[0] + 0.5, 0.12, 0.14]} color={C.rail} />
      <SignBoard
        name="The Food House" tag="Welcome · Open daily" bg={C.terra} fg={C.cream}
        pos={[cx, G + 2.5, z + 0.03]} size={[2.4, 0.5]} night={night}
      />
    </group>
  )
}

function BusStop({ night }) {
  const [x, z] = BUS_STOP
  const glass = { transparent: true, opacity: 0.3, depthWrite: false }
  return (
    <group>
      <Slab x0={x - 2.6} x1={x + 2.6} z0={z - 0.9} z1={z + 1} top={WALK_Y} h={0.12} color={C.walk} />
      <group position={[x, WALK_Y, z]}>
        {[[-1.55, -0.6], [1.55, -0.6], [-1.55, 0.6], [1.55, 0.6]].map(([px, pz]) => (
          <Part key={px + '_' + pz} pos={[px, 1.15, pz]} size={[0.08, 2.3, 0.08]} color={C.ink} />
        ))}
        <Part pos={[0, 2.36, 0]} size={[3.5, 0.12, 1.5]} color={C.teal} />
        <Part pos={[0, 1.2, 0.62]} size={[3.1, 1.6, 0.04]} color="#CFE3E6" {...glass} />
        <Part pos={[-1.55, 1.2, 0]} size={[0.04, 1.6, 1.1]} color="#CFE3E6" {...glass} />
        <Part pos={[0, 0.45, 0.35]} size={[2.4, 0.06, 0.4]} color={C.wood} />
        {[-1, 1].map((s) => (
          <Part key={s} pos={[s * 1.05, 0.22, 0.35]} size={[0.06, 0.44, 0.36]} color={C.ink} />
        ))}
        {/* Upar nu board: rasta taraf ane pachhal banne baju */}
        <SignBoard name="Bus Stop" tag="Route 7 · City Loop" bg={C.teal} fg={C.cream} pos={[0, 2.62, -0.62]} size={[2.4, 0.4]} rot={Math.PI} night={night} />
        <SignBoard name="Bus Stop" tag="Route 7 · City Loop" bg={C.teal} fg={C.cream} pos={[0, 2.62, 0.62]} size={[2.4, 0.4]} night={night} />
        <Part pos={[0, 2.62, 0]} size={[2.5, 0.48, 1.2]} color={C.ink} />
      </group>
    </group>
  )
}

function Palm({ x, z, s }) {
  return (
    <group position={[x, G, z]} scale={s} rotation={[0, x * 1.7, 0]}>
      {[0, 1, 2, 3].map((i) => (
        <mesh key={i} position={[i * 0.07, 0.45 + i * 0.88, 0]} rotation={[0, 0, -0.07]} castShadow>
          <cylinderGeometry args={[0.1 - i * 0.012, 0.13 - i * 0.012, 0.92, 7]} />
          <meshStandardMaterial color="#8B5A2B" flatShading />
        </mesh>
      ))}
      <group position={[0.26, 3.6, 0]}>
        {Array.from({ length: 7 }, (_, i) => (
          <group key={i} rotation={[0, (i / 7) * Math.PI * 2, 0]}>
            <mesh position={[0, -0.22, 0.72]} rotation={[0.45, 0, 0]} castShadow>
              <boxGeometry args={[0.36, 0.04, 1.55]} />
              <meshStandardMaterial color={i % 2 ? C.olive : '#5E7330'} flatShading />
            </mesh>
          </group>
        ))}
        <mesh position={[0, -0.12, 0]} castShadow>
          <icosahedronGeometry args={[0.16, 0]} />
          <meshStandardMaterial color={C.wood} flatShading />
        </mesh>
      </group>
    </group>
  )
}

/* ---------- Footpath par chalta loko (left-hand: samne aavta loko dabi baju thi pasar thay) ---------- */
const track = (pts, loop) => {
  const p = loop ? [...pts, pts[0]] : pts
  const cum = [0]
  for (let i = 1; i < p.length; i++) cum.push(cum[i - 1] + Math.hypot(p[i][0] - p[i - 1][0], p[i][1] - p[i - 1][1]))
  const len = cum[cum.length - 1]
  return { p, cum, len, loop, cycle: loop ? len : 2 * len }
}
// s = chalelu antar; loop na hoy to chheda par pachha phare
const walkAt = (tr, s, o) => {
  let d = ((s % tr.cycle) + tr.cycle) % tr.cycle
  let dir = 1
  if (d > tr.len) {
    d = tr.cycle - d
    dir = -1
  }
  let i = 1
  while (i < tr.cum.length - 1 && tr.cum[i] < d) i++
  const [x0, z0] = tr.p[i - 1]
  const [x1, z1] = tr.p[i]
  const seg = tr.cum[i] - tr.cum[i - 1]
  const u = (d - tr.cum[i - 1]) / seg
  o.x = x0 + (x1 - x0) * u
  o.z = z0 + (z1 - z0) * u
  o.dx = ((x1 - x0) / seg) * dir
  o.dz = ((z1 - z0) / seg) * dir
  return o
}
const onRoad = (x, z) => x > AVE[0] && x < AVE[1] && z > BACK[1] && z < ROAD[0]

const LOOKS = [
  ['boy', '#3E5C76', C.ink, 1, C.ink], ['girl', C.terra, C.ink, 0, '#5A3A22'],
  ['boy', C.gold, '#5A3A22', 2, C.ink], ['girl', C.teal, C.ink, 3, C.ink],
  ['boy', '#7A4E7E', C.ink, 0, '#8B5A2B'], ['girl', C.olive, C.ink, 1, '#5A3A22'],
  ['boy', C.cream, '#3E5C76', 3, C.ink], ['girl', '#A34A5A', C.ink, 2, C.ink],
  ['boy', '#5B6C8F', '#5A3A22', 1, '#5A3A22'], ['girl', '#E07A5F', C.ink, 0, '#8B5A2B'],
  ['boy', C.olive, C.ink, 2, C.ink], ['girl', '#2F6F73', '#5A3A22', 1, C.ink],
]
// Path + loko (u = cycle ma kya thi sharu)
const WALKS = [
  // Avenue farto chakkar (banne zebra parthi)
  { tr: track([[-11.9, 8.3], [-11.9, -12.5], [-16.9, -12.5], [-16.9, 8.3]], true), people: [0, 0.34, 0.68] },
  // Same baju ni footpath (bus stop paasethi), pehla bhai sathe kutro
  { tr: track([[-40, 15.9], [32, 15.9]], false), people: [0.08, 0.42, 0.77], dog: 0 },
  // Pachhal na dukano ni saame
  { tr: track([[-24, -20.1], [24, -20.1]], false), people: [0.2, 0.7] },
  // Restaurant ni saame
  { tr: track([[-11.4, 10.9], [13.4, 10.9]], false), people: [0.15, 0.6] },
  // Restaurant ni pachhal
  { tr: track([[-11.6, -15.1], [24, -15.1]], false), people: [0.35, 0.85] },
]
const PEOPLE = WALKS.flatMap((w, wi) => w.people.map((u, k) => ({ tr: w.tr, u, dog: w.dog === k, wi, k })))

const tmp = { x: 0, z: 0, dx: 0, dz: 1 }
const tmpD = { x: 0, z: 0, dx: 0, dz: 1 }
const DOG = '#B5651D'

function Walker({ tr, u, dog, look, phase }) {
  const [gender, shirt, pants, skin, hair] = look
  const root = useRef()
  const armL = useRef()
  const armR = useRef()
  const legL = useRef()
  const legR = useRef()
  const kneeL = useRef()
  const kneeR = useRef()
  const dogG = useRef()
  const dogLegs = useRef([])
  const tail = useRef()
  const leash = useRef()
  const st = useRef({ s: u * tr.cycle, ox: 0, oz: 0 })

  useFrame((state, delta) => {
    const g = root.current
    if (!g) return
    const dt = Math.min(delta, 0.05)
    const t = state.clock.elapsedTime + phase
    const k = Math.min(1, dt * 5)
    const m = st.current
    m.s += 1.1 * dt

    // Chalvani disha ni dabi baju thodu khasvu (samne vala ne jagya)
    walkAt(tr, m.s, tmp)
    m.ox += (tmp.dz * 0.22 - m.ox) * k
    m.oz += (-tmp.dx * 0.22 - m.oz) * k
    const x = tmp.x + m.ox
    const z = tmp.z + m.oz
    g.position.set(x, onRoad(x, z) ? ROAD_Y : WALK_Y, z)
    const want = Math.atan2(tmp.dx, tmp.dz)
    g.rotation.y += Math.atan2(Math.sin(want - g.rotation.y), Math.cos(want - g.rotation.y)) * Math.min(1, dt * 8)

    const sw = Math.sin(t * 8)
    armL.current.rotation.x = dog ? -0.45 : -sw * 0.5
    armR.current.rotation.x = sw * 0.5
    legL.current.rotation.x = sw * 0.7
    legR.current.rotation.x = -sw * 0.7
    kneeL.current.rotation.x = Math.max(0, sw) * 0.9
    kneeR.current.rotation.x = Math.max(0, -sw) * 0.9

    if (!dog) return
    // Kutro thodo aagal, pattathi bandhelo
    walkAt(tr, m.s + 1.0, tmpD)
    const dx = tmpD.x + m.ox * 1.6
    const dz = tmpD.z + m.oz * 1.6
    const dg = dogG.current
    dg.position.set(dx, onRoad(dx, dz) ? ROAD_Y : WALK_Y, dz)
    dg.rotation.y = Math.atan2(tmpD.dx, tmpD.dz)
    dogLegs.current.forEach((l, i) => l && (l.rotation.x = Math.sin(t * 14 + (i % 3 ? Math.PI : 0)) * 0.6))
    tail.current.rotation.z = Math.sin(t * 16) * 0.5

    const hx = x + Math.sin(g.rotation.y) * 0.3
    const hz = z + Math.cos(g.rotation.y) * 0.3
    const l = leash.current
    const ex = dx + Math.sin(dg.rotation.y) * 0.25
    const ez = dz + Math.cos(dg.rotation.y) * 0.25
    l.position.set((hx + ex) / 2, (g.position.y + 0.75 + dg.position.y + 0.48) / 2, (hz + ez) / 2)
    l.scale.z = Math.hypot(ex - hx, ez - hz, 0.27)
    l.lookAt(ex, dg.position.y + 0.48, ez)
  })

  return (
    <>
      <group ref={root}>
        <Body
          gender={gender} shirt={shirt} pants={pants} skin={SKIN[skin]} hair={hair} phase={phase}
          r={{ armL, armR, legL, legR, kneeL, kneeR }}
        />
      </group>
      {dog && (
        <>
          <group ref={dogG}>
            <Part pos={[0, 0.36, 0]} size={[0.2, 0.18, 0.46]} color={DOG} />
            <Part pos={[0, 0.5, 0.27]} size={[0.17, 0.17, 0.18]} color={DOG} />
            <Part pos={[0, 0.46, 0.39]} size={[0.09, 0.08, 0.1]} color={C.cream} />
            {[-1, 1].map((s) => (
              <Part key={s} pos={[s * 0.065, 0.6, 0.24]} size={[0.04, 0.09, 0.06]} color={C.wood} />
            ))}
            <group ref={tail} position={[0, 0.42, -0.23]}>
              <Part pos={[0, 0.08, -0.03]} size={[0.04, 0.16, 0.04]} color={DOG} />
            </group>
            {[[-0.07, 0.16], [0.07, 0.16], [-0.07, -0.16], [0.07, -0.16]].map(([lx, lz], i) => (
              <group key={i} position={[lx, 0.28, lz]} ref={(el) => (dogLegs.current[i] = el)}>
                <Part pos={[0, -0.13, 0]} size={[0.05, 0.27, 0.05]} color={DOG} />
              </group>
            ))}
          </group>
          <mesh ref={leash}>
            <boxGeometry args={[0.015, 0.015, 1]} />
            <meshStandardMaterial color={C.terra} />
          </mesh>
        </>
      )}
    </>
  )
}

/* ---------- Main ---------- */
export default function Neighbourhood({ night }) {
  const inPlaza = (x, z) => x > PLAZA.x0 && x < PLAZA.x1 && z > PLAZA.z0 && z < PLAZA.z1

  return (
    <group>
      {BUILDINGS.map((b) => (
        <Building key={b.x + '_' + b.z} b={b} night={night} />
      ))}
      <Tower />
      <Boxes items={WIN_DARK} color={C.teal} roughness={0.25} metalness={0.3} shadow={false} />
      <Boxes
        items={WIN_LIT} color={C.teal} roughness={0.25} metalness={0.3} shadow={false}
        emissive={WARM} emissiveIntensity={night ? 1.0 : 0}
      />
      <Boxes items={TRIM} color={C.rail} />

      <Gate night={night} />
      <BusStop night={night} />

      {/* Bagicho: zebra thi plaza sudhi paved raasto */}
      <Slab {...PARK_PATH} top={WALK_Y} h={0.12} color={C.walk} />
      <Slab {...PLAZA} top={WALK_Y} h={0.12} color={C.walk} />
      {BENCHES.map(([x, z, rot]) => (
        <Bench key={x + '_' + z} x={x} z={z} rot={rot} y={inPlaza(x, z) ? WALK_Y : G} />
      ))}
      {PALMS.map(([x, z, s]) => (
        <Palm key={x + '_' + z} x={x} z={z} s={s} />
      ))}

      {PEOPLE.map((p, i) => (
        <Walker
          key={p.wi + '_' + p.k} tr={p.tr} u={p.u} dog={p.dog}
          look={LOOKS[i % LOOKS.length]} phase={i * 0.9}
        />
      ))}
    </group>
  )
}
