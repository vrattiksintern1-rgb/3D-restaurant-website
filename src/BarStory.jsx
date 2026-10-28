import { useEffect, useRef, useState } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { Body } from './Characters'
import { journeyWorld, seq, par, wait, call, until, lazy } from './Journey'

/* ==========================================================================
   DRINKS: the bar menu. Edit this list to change what the bartender makes.
   Served in this order (see BAR_STORY.order), never the same drink twice in a row.
   name    = the drink's name (used in BAR_STORY.atStart)
   glass   = 'highball' | 'margarita' | 'rocks' | 'martini' | 'hurricane' | 'mug' | 'wine'  (shapes: GLASSES below)
   liquid  = drink colour, top = colour of its surface, head = foam thickness (beer)
   fill    = how full the glass gets (0..1)
   prep    = 'shake' | 'muddle' | 'tap' | 'bottle' | 'stir'  (bartender animation: PREP below)
   tool    = what the right hand holds: 'shaker' | 'rum' | 'whiskey' | 'wine' | 'campari' | null (beer tap)
   garnish = any of 'lime' | 'orange' | 'mint' | 'salt' | 'peel' | 'twist' | 'pineapple' | 'olive' | 'straw'
   fx      = any of 'ice' | 'bubbles'
   ========================================================================== */
export const DRINKS = [
  { name: 'Mojito', glass: 'highball', liquid: '#CFE6A2', top: '#E8F5CF', fill: 0.84,
    prep: 'muddle', tool: 'rum', garnish: ['mint', 'lime', 'straw'], fx: ['ice', 'bubbles'] },
  { name: 'Margarita', glass: 'margarita', liquid: '#E4EA9E', top: '#F2F4C6', fill: 0.8,
    prep: 'shake', tool: 'shaker', garnish: ['salt', 'lime'], fx: [] },
  { name: 'Old Fashioned', glass: 'rocks', liquid: '#A9561D', top: '#C2733A', fill: 0.6,
    prep: 'stir', tool: 'whiskey', garnish: ['peel'], fx: ['ice'] },
  { name: 'Cosmopolitan', glass: 'martini', liquid: '#E66A93', top: '#F29DB8', fill: 0.8,
    prep: 'shake', tool: 'shaker', garnish: ['twist'], fx: [] },
  { name: 'Piña Colada', glass: 'hurricane', liquid: '#F6ECD3', top: '#FFF9EC', fill: 0.86,
    prep: 'shake', tool: 'shaker', garnish: ['pineapple', 'straw'], fx: [] },
  { name: 'Whiskey on the Rocks', glass: 'rocks', liquid: '#C98A2E', top: '#DDA44E', fill: 0.45,
    prep: 'bottle', tool: 'whiskey', garnish: [], fx: ['ice'] },
  { name: 'Draft Beer', glass: 'mug', liquid: '#E2A52B', top: '#FFF6E2', head: 0.028, fill: 0.74,
    prep: 'tap', tool: null, garnish: [], fx: ['bubbles'] },
  { name: 'Red Wine', glass: 'wine', liquid: '#6E1423', top: '#862131', fill: 0.48,
    prep: 'bottle', tool: 'wine', garnish: [], fx: [] },
  { name: 'Martini', glass: 'martini', liquid: '#E9EAD6', top: '#F4F4E8', fill: 0.8,
    prep: 'shake', tool: 'shaker', garnish: ['olive'], fx: [] },
  { name: 'Negroni', glass: 'rocks', liquid: '#D2402A', top: '#E2633F', fill: 0.62,
    prep: 'stir', tool: 'campari', garnish: ['orange'], fx: ['ice'] },
]

/* ==========================================================================
   BAR_STORY: every seat, path, timing and outfit of the bar.
   Positions are world units [x, z]: +x = towards the kitchen, +z = towards the road.
   Walking along x or z reads as an isometric diagonal on screen.
   Times are in seconds; [a, b] means a random value between a and b.
   ========================================================================== */
export const BAR_STORY = {
  speed: 1.7,          // customer walking speed (dining guests walk at 1.6)
  barSpeed: 1.2,       // bartender
  ramp: 0.35,          // seconds to speed up / slow down at the start and end of a walk (easing)
  corner: 0.45,        // waypoint corners are rounded with this radius
  stride: 5,           // leg swing per unit walked (radians)
  bob: 0.035,          // body bounce while walking
  avoid: 0.4,          // walkers wait rather than come closer than this to each other
  ghostAfter: 2.5,     // if two walkers block each other this long, the waiting one slips past

  customers: { min: 4, max: 8 },  // people in the bar at once (seated + arriving + leaving)
  pairChance: 0.5,     // chance a new party is two people (needs two free stools side by side)
  nearWeight: 0.35,    // how strongly people prefer seats close to where they come in
  idleWeight: 15,      // ...and seats that have been empty longer (every N seconds empty doubles the pull)
  entryHub: [-2.3, -6.0],

  path: {
    enter: [[-7.8, 10.8], [-5.6, 10.8], [-5.6, 9.4]],   // footpath -> garden gate -> porch
    queue: [-5.5, 6.75],                 // first person waits here if the desk is busy
    queue2: [-5.5, 7.45],                // second person of a party
    desk: [-5.5, 5.42],                  // in front of the receptionist
    deskBehind: [-5.5, 6.1],             // the partner stands just behind
    // Round the desk, down the passage between the lounge and the kitchen (never through the lounge),
    // then through the gap in the bar partition
    toBar: [[-3.65, 5.42], [-3.65, -0.1], [-0.75, -0.1], [-0.75, -4.9], [-1.95, -5.7], [-1.95, -6.6], [-2.25, -7.78]],
    inLane: -7.78,                       // aisle between tables and stools: walking in (westwards)
    outLane: -8.18,                      //   ... walking out (eastwards), so nobody meets head-on
    barExit: [[-1.75, -8.18], [-1.3, -6.7], [-1.3, -5.7], [-0.25, -4.9], [-0.25, 0.45]],
    exit: [[-2.95, 0.45], [-2.95, 6.3], [-4.4, 7.4], [-4.4, 10.8], [0.5, 10.8]],
  },

  // Every customer seat: bar counter stools only.
  // x/z/y = where the customer sits, rot = facing, stand = where they stand before sitting,
  // drink = where their glass rests
  seats: [
    { id: 'bar1', x: -6.4, z: -8.55, y: 0.92, rot: Math.PI, stand: [-6.4, -7.95], drink: [-6.4, 1.08, -9.2] },
    { id: 'bar2', x: -5.2, z: -8.55, y: 0.92, rot: Math.PI, stand: [-5.2, -7.95], drink: [-5.2, 1.08, -9.2] },
    { id: 'bar3', x: -4.0, z: -8.55, y: 0.92, rot: Math.PI, stand: [-4.0, -7.95], drink: [-4.0, 1.08, -9.2] },
    { id: 'bar4', x: -2.8, z: -8.55, y: 0.92, rot: Math.PI, stand: [-2.8, -7.95], drink: [-2.8, 1.08, -9.2] },
  ],
  // Stools round the two high tables: decoration only, nobody sits there (nor on the lounge sofas)
  decorStools: [[-6.9, -7.1], [-5.7, -7.1], [-3.9, -7.1], [-2.7, -7.1]],

  // Already seated when the page opens (party = same number sit and leave together)
  atStart: [
    { seat: 'bar1', party: 1, drink: 'Negroni', look: { gender: 'boy', shirt: '#3E5C76', hair: '#2B1D14', pants: '#2B1D14', skin: 0 } },
    { seat: 'bar2', party: 2, drink: 'Red Wine', look: { gender: 'girl', shirt: '#8C3B2E', hair: '#5A3A22', pants: '#2B1D14', skin: 3 } },
    { seat: 'bar4', party: 3, drink: 'Draft Beer', look: { gender: 'boy', shirt: '#D9A441', hair: '#1A1A1A', pants: '#2B1D14', skin: 2 } },
  ],

  outfits: {
    shirts: ['#3E5C76', '#8C3B2E', '#D9A441', '#5C6B3A', '#7A4E7E', '#2F6F73', '#B5651D', '#A34A5A', '#4F7942', '#E07A5F', '#6A4C93', '#5B6C8F'],
    hair: ['#2B1D14', '#5A3A22', '#1A1A1A', '#8B5A2B', '#A0522D'],
    pants: ['#2B1D14', '#3B4A5A', '#5A4636'],
  },

  runner: { home: [-1.05, -7.4] },  // waiter standing by at the end of the bar
  bartender: { home: [-4.3, -10.3], z: -10.2, shelf: -10.85 },
  prepZ: -9.8,                   // drinks are made here, then slid to the customer
  tap: [-1.85, -9.8],            // beer tap spout (beer is poured here, then slid down the counter)

  time: {
    start: 2,             // first new arrival after the page loads
    gap: [3, 12],         // between new arrivals (also after someone leaves)
    firstStays: [4, 14, 26], // remaining stay of the parties seated at page load (shuffled, +0..3s each)
    stay: [15, 40],       // drinking time once the whole party has its drinks
    follow: 0.6,          // second person of a party walks this far behind
    deskWait: 5,          // longest wait for the desk before walking straight in
    greet: 1.6,           // pause at reception
    wave: 1.3,            // receptionist's wave + "Welcome!" bubble
    sit: 0.4,             // sit down / stand up
    order: 1.1,           // hand raised to order
    stoolBack: 1.2,       // a pushed-back stool returns this long after its customer walks off
    tidy: 2.5,            // an empty glass is cleared this long after its customer stands up
    happy: 1.3,           // heart when a drink arrives
    notice: 0.5,          // bartender looks up and nods before walking over
    reach: 0.8,           // drink prep
    pour: 2.0,
    shake: 1.8,
    muddle: 1.6,
    tap: 2.6,
    stir: 1.8,
    ice: 1.1,
    garnish: 0.9,
    slide: 0.8,           // + a little more per unit when a beer slides down from the tap
  },

  order: 'sequence',   // drink rotation: 'sequence' or 'random' (random never repeats the previous drink)
  drinks: DRINKS,
}

/* ---------- Shortcuts and fixed scene data ---------- */
const CFG = BAR_STORY
const T = CFG.time
const P = CFG.path
const BT = CFG.bartender
const POOL = CFG.customers.max
const C = {
  cream: '#F5E6CC',
  terra: '#C8553D',
  olive: '#6B7F3A',
  wood: '#4A3426',
  gold: '#D9A441',
  ink: '#2B1D14',
  white: '#FFF8EC',
  steel: '#B9B4AC',
}
const SKIN = ['#F1C9A5', '#E8B08A', '#C98B62', '#A8683F']

const rand = (a, b) => a + Math.random() * (b - a)
const randIn = ([a, b]) => rand(a, b)
const pick = (list) => list[Math.floor(Math.random() * list.length)]
const shuffle = (list) => list.map((v) => [Math.random(), v]).sort((a, b) => a[0] - b[0]).map((p) => p[1])
function weighted(list, weight) {
  const ws = list.map(weight)
  let r = Math.random() * ws.reduce((a, b) => a + b, 0)
  for (let i = 0; i < list.length; i++) if ((r -= ws[i]) <= 0) return list[i]
  return list[list.length - 1]
}

// Glass shapes. bowl = outline [radius, height] from the bottom of the bowl up to the rim,
// stem/foot = stem height and foot radius (none: stands flat), base = thickness of the bottom, handle = beer mug
const GLASSES = {
  highball: { bowl: [[0.044, 0], [0.05, 0.19]], base: 0.012 },
  rocks: { bowl: [[0.054, 0], [0.06, 0.1]], base: 0.016 },
  mug: { bowl: [[0.054, 0], [0.056, 0.165]], base: 0.014, handle: true },
  hurricane: { stem: 0.025, foot: 0.04, bowl: [[0.02, 0], [0.042, 0.02], [0.05, 0.06], [0.04, 0.12], [0.048, 0.18], [0.054, 0.2]], base: 0.006 },
  margarita: { stem: 0.075, foot: 0.042, bowl: [[0.008, 0], [0.028, 0.02], [0.034, 0.03], [0.064, 0.055], [0.076, 0.07]], base: 0 },
  martini: { stem: 0.085, foot: 0.042, bowl: [[0.004, 0], [0.074, 0.075]], base: 0 },
  wine: { stem: 0.075, foot: 0.04, bowl: [[0.008, 0], [0.036, 0.012], [0.05, 0.04], [0.052, 0.07], [0.046, 0.1], [0.04, 0.115]], base: 0 },
}
// What the bartender does for each kind of drink ('ice' and 'garnish' only when the drink has them)
const PREP = {
  shake: ['reach', 'shake', 'pour', 'garnish', 'slide'],
  muddle: ['reach', 'muddle', 'pour', 'ice', 'garnish', 'slide'],
  tap: ['reach', 'tap', 'slide'],
  bottle: ['reach', 'pour', 'ice', 'garnish', 'slide'],
  stir: ['reach', 'pour', 'ice', 'stir', 'garnish', 'slide'],
}
const stepsOf = (dk) =>
  PREP[dk.prep].filter((st) => (st !== 'ice' || dk.fx.includes('ice')) && (st !== 'garnish' || dk.garnish.length))
// Right-hand tools. tilt = how far the tool tips to pour, armZ = how far the right hand moves in over the glass
const TOOLS = {
  shaker: { tilt: 1.9, armZ: -0.12 },
  rum: { tilt: 1.9, armZ: -0.12, bottle: '#E6E1CC', label: C.terra },
  whiskey: { tilt: 1.9, armZ: -0.12, bottle: '#8A4B17', label: C.cream },
  wine: { tilt: 1.75, armZ: -0.12, bottle: '#2A1A1E', label: C.cream },
  campari: { tilt: 1.9, armZ: -0.12, bottle: '#B3261E', label: C.white },
}

// Floor height: the coloured section floors are 0.1, the slab between them 0, the gate path and footpath -0.2
const FLOORS = [[-8, -3, 1, 6], [-2, 8, 0, 6], [0, 8, -6, -1], [-8, -1, -6, -1], [-8, -0.5, -12, -6], [-0.5, 8, -12, -6]]
export const floorAt = (x, z) => {
  for (const [x0, x1, z0, z1] of FLOORS) if (x >= x0 && x <= x1 && z >= z0 && z <= z1) return 0.1
  if (x >= -8.1 && x <= 8.1 && z >= -12 && z <= 6) return 0
  if (x >= -8 && x <= -2.6 && z > 6 && z <= 9.9) return 0 // porch
  return -0.2
}

const G = {
  cyl: new THREE.CylinderGeometry(1, 1, 1, 16),
  base: new THREE.CylinderGeometry(1, 1, 1, 18).translate(0, 0.5, 0),
  wall: new THREE.CylinderGeometry(1, 0.86, 1, 20, 1, true).translate(0, 0.5, 0),
  liquid: new THREE.CylinderGeometry(0.92, 0.8, 1, 20).translate(0, 0.5, 0),
  stream: new THREE.CylinderGeometry(1, 1, 1, 8, 1, true).translate(0, 0.5, 0),
  ball: new THREE.SphereGeometry(1, 12, 10),
  box: new THREE.BoxGeometry(1, 1, 1),
  handle: new THREE.TorusGeometry(1, 0.25, 6, 12, Math.PI),
  ring: new THREE.TorusGeometry(1, 0.09, 5, 24),
  twist: new THREE.TorusGeometry(1, 0.22, 5, 14, Math.PI * 1.5),
}

// Each glass is turned (lathe) from its outline: foot and stem, then the bowl up to the rim
for (const gl of Object.values(GLASSES)) {
  gl.stem ??= 0
  const rim = gl.bowl[gl.bowl.length - 1]
  gl.r = rim[0]
  gl.h = rim[1]
  const pts = gl.stem ? [[0, 0], [gl.foot, 0], [gl.foot, 0.005], [0.006, 0.012], [0.005, gl.stem]] : [[0, 0]]
  for (const [r, y] of gl.bowl) pts.push([r, gl.stem + y])
  gl.geo = new THREE.LatheGeometry(pts.map(([x, y]) => new THREE.Vector2(x, y)), 20)
}
// Radius of the bowl at height y (measured from the foot), and where the drink's surface is
function bowlR(gl, y) {
  const b = gl.bowl
  const yb = y - gl.stem
  if (yb <= b[0][1]) return b[0][0]
  for (let i = 1; i < b.length; i++) {
    const [r0, y0] = b[i - 1]
    const [r1, y1] = b[i]
    if (yb <= y1) return r0 + ((r1 - r0) * (yb - y0)) / (y1 - y0)
  }
  return gl.r
}
const surface = (gl, fill) => gl.stem + gl.base + fill * (gl.h - gl.base)

/* ---------- Easing and tasks (seq/par/wait/call from Journey) ---------- */
export const smooth = (p) => p * p * (3 - 2 * p)
export const linear = (p) => p
const outCubic = (p) => 1 - (1 - p) ** 3
const backOut = (p) => 1 + 2.2 * (p - 1) ** 3 + 1.2 * (p - 1) ** 2
export const tween = (dur, fn, curve = smooth) => {
  let t = 0
  return (dt) => {
    t = Math.min(dur, t + dt)
    fn(curve(dur > 0 ? t / dur : 1))
    return t >= dur
  }
}

/* ---------- Walking along waypoints ---------- */
// Rounds each corner with a short curve, then measures the path so it can be sampled by distance
function buildPath(pts, r) {
  const out = [pts[0]]
  for (let i = 1; i < pts.length - 1; i++) {
    const [ax, az] = pts[i - 1]
    const [bx, bz] = pts[i]
    const [cx, cz] = pts[i + 1]
    const d1 = Math.hypot(bx - ax, bz - az)
    const d2 = Math.hypot(cx - bx, cz - bz)
    const k = Math.min(r, d1 / 2, d2 / 2)
    if (k < 0.01) {
      out.push(pts[i])
      continue
    }
    const p0 = [bx + ((ax - bx) * k) / d1, bz + ((az - bz) * k) / d1]
    const p2 = [bx + ((cx - bx) * k) / d2, bz + ((cz - bz) * k) / d2]
    for (let j = 0; j <= 6; j++) {
      const t = j / 6
      const u = 1 - t
      out.push([u * u * p0[0] + 2 * u * t * bx + t * t * p2[0], u * u * p0[1] + 2 * u * t * bz + t * t * p2[1]])
    }
  }
  out.push(pts[pts.length - 1])
  const len = [0]
  for (let i = 1; i < out.length; i++) {
    len.push(len[i - 1] + Math.hypot(out[i][0] - out[i - 1][0], out[i][1] - out[i - 1][1]))
  }
  return { pts: out, len, total: len[len.length - 1], i: 0 }
}

function sampleAt(path, d, a) {
  const { pts, len } = path
  while (path.i < len.length - 2 && len[path.i + 1] < d) path.i++
  const i = path.i
  const seg = len[i + 1] - len[i]
  const f = seg > 1e-6 ? Math.min(1, (d - len[i]) / seg) : 1
  const [x0, z0] = pts[i]
  const [x1, z1] = pts[i + 1]
  a.x = x0 + (x1 - x0) * f
  a.z = z0 + (z1 - z0) * f
  if (seg > 1e-6) a.rot = Math.atan2(x1 - x0, z1 - z0)
}

// Distance covered after t seconds: speed up over `ramp`, cruise, slow down over `ramp`
function motion(L, v, ramp) {
  const acc = v / ramp
  if (L >= v * ramp) {
    const T = L / v + ramp
    const at = (t) =>
      t <= 0 ? 0
        : t < ramp ? 0.5 * acc * t * t
          : t < L / v ? (v * ramp) / 2 + v * (t - ramp)
            : t < T ? L - 0.5 * acc * (T - t) ** 2 : L
    return { T, at }
  }
  const ta = Math.sqrt(L / acc)
  const T = 2 * ta
  return { T, at: (t) => (t <= 0 ? 0 : t < ta ? 0.5 * acc * t * t : t < T ? L - 0.5 * acc * (T - t) ** 2 : L) }
}

// Would stepping to (nx, nz) bring `a` too close to someone? Lower rank has right of way (like Journey's pri).
function blocked(s, a, nx, nz) {
  for (const o of s.walkers) {
    if (o === a || !o.visible || o.sit || o.hipY != null) continue
    if ((o.walking || o.yielding) && o.rank > a.rank) continue
    const dn = Math.hypot(nx - o.x, nz - o.z)
    if (dn < CFG.avoid && dn < Math.hypot(a.x - o.x, a.z - o.z)) return true
  }
  return false
}

const step = { x: 0, z: 0, rot: 0 }
export const walkPath = (s, a, pts, speed = CFG.speed, avoid = true) => {
  let path = null
  let m = null
  let t = 0
  let last = 0
  let pace = 0   // 0..1: eases back in after waiting for someone
  let stuck = 0
  let ghost = 0
  return (dt) => {
    if (!path) {
      const list = [[a.x, a.z]]
      for (const p of pts) {
        const q = list[list.length - 1]
        if (Math.hypot(p[0] - q[0], p[1] - q[1]) > 0.02) list.push(p)
      }
      if (list.length < 2) return true
      path = buildPath(list, CFG.corner)
      m = motion(path.total, speed, CFG.ramp)
      a.walking = true
      a.anim = 'walk'
    }
    pace = Math.min(1, pace + dt / 0.3)
    const tn = Math.min(m.T, t + dt * pace)
    const d = m.at(tn)
    step.rot = a.rot
    sampleAt(path, d, step)
    if (ghost > 0) ghost -= dt
    else if (avoid && blocked(s, a, step.x, step.z)) {
      pace = 0
      a.yielding = true
      a.amp = Math.max(0, a.amp - dt * 6)
      if ((stuck += dt) > CFG.ghostAfter) {
        ghost = 1
        stuck = 0
      }
      return false
    }
    stuck = 0
    a.yielding = false
    t = tn
    a.x = step.x
    a.z = step.z
    a.rot = step.rot
    a.stride += (d - last) * CFG.stride
    if (dt > 0) a.amp = Math.min(1, (d - last) / dt / speed)
    last = d
    if (t < m.T) return false
    a.walking = false
    a.anim = 'idle'
    a.amp = 0
    return true
  }
}

/* ---------- Story state ---------- */
const mkWalker = () => ({
  x: 0, z: 0, y: 0, rot: 0, visible: false, sit: false, hipY: null,
  // Journey reads these: pri -1 = dining guests and waiters give way to bar people
  pri: -1, group: null, anim: 'idle', yielding: false,
  rank: 0, walking: false, stride: 0, amp: 0, hand: null, obj: null, px: 0, pz: 0, pose: 'idle',
})
const mkCustomer = (i) => ({
  ...mkWalker(), i,
  busy: false, phase: 'gone', party: null, seat: null, glass: null, served: false,
  act: 'idle', actT: 0, actAge: 0, lookYaw: 0, lastSip: 0, phone: null,
})
const mkGlass = () => ({
  visible: false, x: 0, y: 0, z: 0, rot: 0, drink: CFG.drinks[0], fill: 0, garnish: 0,
  ice: [null, null, null], holder: null, home: null, blend: 0, drop: 0, tidyAt: -1, scale: 1,
})

function createStory() {
  const customers = Array.from({ length: POOL }, (_, i) => mkCustomer(i))
  const runner = { ...mkWalker(), visible: true, rank: 0, carry: false }
  const seats = CFG.seats.map((d) => ({ ...d, state: 'free', by: null, push: 0, pushNow: 0 }))
  return {
    time: 0, dt: 0, snap: true, snapFrames: 2, hidden: false, calm: false,
    rank: 0, lastDrink: -1, arrivals: [], recentShirts: [],
    jobs: [], orders: [],
    customers, runner, walkers: [...customers, runner],
    glasses: Array.from({ length: POOL }, mkGlass),
    seats, tapSpout: null,
    bar: {
      x: BT.home[0], z: BT.home[1], rot: 0, pose: 'wipe', toolR: null, toolL: null, tilt: 0, stream: false, tapPull: 0,
      busy: false, look: null, g: null, walking: false, stride: 0, amp: 0, spout: null, handL: null, idle: 0,
    },
    fx: null, setLook: null,
  }
}

/* ---------- Seats and parties ---------- */
const nearEntry = (seat) =>
  1 / (1 + Math.hypot(seat.stand[0] - CFG.entryHub[0], seat.stand[1] - CFG.entryHub[1]) * CFG.nearWeight)
// Close to the way in, and empty for a while, so every seat gets used in turn
const seatPull = (s, seat) => nearEntry(seat) * (1 + Math.max(0, s.time - seat.freeSince) / CFG.idleWeight)

// Pick free stools for a new party: a pair takes two free stools side by side, a single any free stool
function planParty(s, room) {
  const free = s.seats.filter((st) => st.state === 'free')
  if (!free.length) return null
  // West first, so the first one in takes the far stool and the other isn't in the way
  const row = free.slice().sort((a, b) => a.x - b.x)
  const pairs = []
  for (let i = 1; i < row.length; i++) {
    if (s.seats.indexOf(row[i]) - s.seats.indexOf(row[i - 1]) === 1) pairs.push([row[i - 1], row[i]])
  }
  if (room >= 2 && pairs.length && Math.random() < CFG.pairChance) {
    return weighted(pairs, (p) => Math.min(...p.map((st) => seatPull(s, st))))
  }
  return [weighted(free, (x) => seatPull(s, x))]
}

function claimSeat(seat, c) {
  if (seat.state !== 'free') {
    console.warn('BarStory: seat ' + seat.id + ' is already ' + seat.state)
    return false
  }
  seat.state = 'reserved'
  seat.by = c
  return true
}

function randomLook(s) {
  const o = CFG.outfits
  let shirt = pick(o.shirts)
  while (s.recentShirts.includes(shirt)) shirt = pick(o.shirts)
  s.recentShirts = [shirt, ...s.recentShirts].slice(0, 5)
  return { gender: Math.random() < 0.5 ? 'boy' : 'girl', shirt, hair: pick(o.hair), pants: pick(o.pants), skin: Math.floor(Math.random() * 4) }
}

function pickDrink(s) {
  const n = CFG.drinks.length
  let i = (s.lastDrink + 1) % n
  if (CFG.order === 'random' && n > 1) {
    i = Math.floor(Math.random() * (n - 1))
    if (i >= s.lastDrink) i++
  }
  s.lastDrink = i
  return CFG.drinks[i]
}

const newParty = () => ({ members: [], leaveAt: null, desk: null, go: null })

function startParty(s, seats) {
  const party = newParty()
  const rank = ++s.rank
  for (const [k, seat] of seats.entries()) {
    const slot = s.customers.findIndex((c) => !c.busy)
    const c = s.customers[slot]
    if (!claimSeat(seat, c)) continue
    Object.assign(c, {
      busy: true, phase: 'pending', rank: rank + k * 0.5, party, seat, glass: s.glasses[slot], served: false,
      visible: false, sit: false, hipY: null, act: 'idle', actT: 0, pose: 'idle', walking: false, yielding: false, amp: 0,
    })
    s.setLook?.(slot, randomLook(s))
    party.members.push(c)
  }
  party.members.forEach((c, k) => s.jobs.push(customerScript(s, c, k)))
}

// Shared with PrivateDiningStory: while one of its parties is due or checks in, no bar party is started
export const reception = { hold: null }

// Keeps 4..8 people around. Each departure books a new arrival 3-12 s later; while there is
// room, one more arrival is always booked; below the minimum someone comes in straight away.
const spawner = (s) => () => {
  if (reception.hold) return false
  const busy = s.customers.filter((c) => c.busy)
  if (busy.some((c) => c.phase === 'pending' || c.phase === 'enter')) return false // one party at the desk at a time
  const room = CFG.customers.max - busy.length
  if (room <= 0) return false
  const due = s.arrivals.findIndex((t) => t <= s.time)
  if (due < 0 && busy.length >= CFG.customers.min) {
    if (!s.arrivals.length) s.arrivals.push(s.time + randIn(T.gap))
    return false
  }
  const plan = planParty(s, room)
  if (!plan) return false
  startParty(s, plan)
  if (due >= 0) s.arrivals.splice(due, 1)
  return false
}

/* ---------- Reception (shared with Journey's receptionist, never blocks her parties) ---------- */
const deskFree = () => {
  const w = journeyWorld()
  if (!w) return true
  const [dx, dz] = P.desk
  return !w.guests.some((g) => g.visible && !g.sit && Math.hypot(g.x - dx, g.z - dz) < 1.0)
}
const hostHead = () => {
  const h = journeyWorld()?.host
  return h ? [h.x, 1.8, h.z] : [-5.5, 1.8, 3.8]
}

export const checkIn = (s, c) => {
  const party = c.party
  let t = 0
  return seq(
    (dt) => {
      t += dt
      if (deskFree()) party.desk = 'ok'
      else if (t > T.deskWait) party.desk = 'skip'
      return !!party.desk
    },
    lazy(() =>
      party.desk === 'ok'
        ? seq(
          walkPath(s, c, [P.desk]),
          call(() => {
            c.rot = Math.PI
            c.pose = 'nod'
            const w = journeyWorld()
            if (w && w.host.atDesk && w.host.anim === 'idle') {
              w.host.anim = 'wave'
              s.fx?.show('say', hostHead, T.wave + 0.3)
            }
          }),
          wait(T.wave),
          call(() => {
            const w = journeyWorld()
            if (w && w.host.anim === 'wave') w.host.anim = 'idle'
            c.pose = 'idle'
          }),
          wait(Math.max(0, T.greet - T.wave))
        )
        : wait(0.6)
    ),
    call(() => { party.go = s.time })
  )
}

/* ---------- Customer life ---------- */
// Reception -> passage beside the lounge -> bar aisle -> their stool, and back out the same way
const routeIn = (seat) => [...P.toBar, [seat.stand[0], P.inLane], seat.stand]
const routeOut = (seat) => [[seat.stand[0], P.outLane], ...P.barExit, ...P.exit]

// Sit down (or stand up): the hip moves on a small arc, the legs switch pose halfway
const sitMove = (c, seat, down) => {
  const [px, pz] = seat.stand
  return tween(T.sit, (p) => {
    const k = down ? smooth(p) : 1 - smooth(p)
    c.x = px + (seat.x - px) * k
    c.z = pz + (seat.z - pz) * k
    c.sit = k > 0.5
    c.hipY = 0.6 + (seat.y + 0.05 - 0.6) * k + Math.sin(Math.PI * p) * 0.12
  }, linear)
}

// Small things people do while seated, picked at random
function nextAct(s, c) {
  const g = c.glass
  if (c.act === 'sip' && g.holder === c) g.holder = null // put the glass down
  const mate = c.party.members.some((m) => m !== c && m.sit)
  const opts = [
    ['idle', 2, 1.5, 3.5], ['look', 2, 1.2, 2.6], ['nod', 1, 1, 1.6], ['phone', 1, 3, 6],
    ['talk', mate ? 3 : 0.6, 2, 4], ['laugh', mate ? 1.4 : 0.3, 1.2, 1.8],
  ]
  if (c.served && g.fill > 0.08 && s.time - c.lastSip > 2.5) opts.push(['sip', 3.2, 1.7, 2.2])
  const [act, , d0, d1] = weighted(opts.filter((o) => o[0] !== c.act), (o) => o[1])
  c.act = act
  c.actT = rand(d0, d1)
  c.actAge = 0
  c.lookYaw = rand(-0.7, 0.7)
  if (act === 'sip') {
    c.lastSip = s.time
    g.holder = c
    g.blend = 0
  }
}

// Seated until the party's drinking time is over
const seatedLife = (s, c) => (dt) => {
  const p = c.party
  if (p.leaveAt != null && s.time >= p.leaveAt) return true
  c.actT -= dt
  c.actAge += dt
  const g = c.glass
  if (c.act === 'sip') {
    if (c.actAge < 1.2) g.fill = Math.max(0.05, g.fill - dt * 0.045)
    else if (g.holder === c) g.holder = null
  }
  if (c.actT <= 0) nextAct(s, c)
  return false
}

function served(s, o) {
  const { c } = o
  c.served = true
  s.fx?.show('heart', () => [c.x, c.y + (c.sit ? 1.2 : 1.66), c.z], T.happy + 0.2)
  if (c.act === 'sip' && c.glass.holder === c) c.glass.holder = null
  c.act = 'happy'
  c.actT = T.happy
  c.actAge = 0
  const p = c.party
  if (p.leaveAt == null && p.members.every((m) => m.served)) p.leaveAt = s.time + randIn(T.stay)
}

const leave = (s, c) => {
  const seat = c.seat
  const g = c.glass
  // The one nearest the way out gets up first, so nobody is in the other's way
  const order = c.party.members.slice().sort((a, b) => b.seat.stand[0] - a.seat.stand[0]).indexOf(c)
  return seq(
    call(() => { c.act = 'idle'; c.actT = 99 }),
    wait(order * 0.6),
    call(() => {
      if (g.holder === c) g.holder = null
      g.tidyAt = s.time + T.tidy
      c.phase = 'leave'
      seat.push = 1 // stool slides back as they get up
      s.arrivals.push(s.time + randIn(T.gap)) // someone new, a little later
    }),
    sitMove(c, seat, false),
    call(() => { c.sit = false; c.hipY = null; c.served = false }),
    par(
      walkPath(s, c, routeOut(seat)),
      seq(
        wait(T.stoolBack),
        call(() => {
          seat.push = 0
          seat.state = 'free'
          seat.by = null
          seat.freeSince = s.time
        })
      )
    ),
    call(() => { c.visible = false; c.busy = false; c.phase = 'gone' })
  )
}

function customerScript(s, c, k) {
  const party = c.party
  const seat = c.seat
  return seq(
    wait(k * T.follow),
    call(() => {
      const [x, z] = P.enter[0]
      Object.assign(c, { x, z, px: x, pz: z, y: floorAt(x, z), rot: Math.PI / 2, visible: true, phase: 'enter' })
    }),
    walkPath(s, c, [...P.enter.slice(1), k ? P.queue2 : P.queue]),
    k === 0
      ? checkIn(s, c)
      : seq(
        until(() => party.desk),
        lazy(() => (party.desk === 'ok' ? walkPath(s, c, [P.deskBehind]) : seq())),
        call(() => { c.rot = Math.PI })
      ),
    until(() => party.go != null && s.time >= party.go + k * T.follow),
    call(() => { c.phase = 'walk' }),
    walkPath(s, c, routeIn(seat)),
    call(() => { c.rot = seat.rot }),
    wait(0.25),
    sitMove(c, seat, true),
    call(() => {
      seat.state = 'occupied'
      c.phase = 'seated'
      c.pose = 'order'
      c.act = 'idle'
      c.actT = T.order + 0.5
    }),
    wait(T.order),
    call(() => {
      c.pose = 'sit'
      s.orders.push({ c, seat, g: c.glass, dk: pickDrink(s) })
    }),
    seatedLife(s, c),
    leave(s, c)
  )
}

// The customers already sitting there when the page opens: each party gets its own remaining time
function seatInitial(s) {
  const parties = {}
  CFG.atStart.forEach((d, slot) => {
    const seat = s.seats.find((st) => st.id === d.seat)
    const c = s.customers[slot]
    const g = s.glasses[slot]
    const party = (parties[d.party] ??= newParty())
    party.desk = 'ok'
    party.go = 0
    Object.assign(c, {
      busy: true, phase: 'seated', rank: ++s.rank, party, seat, glass: g, served: true, visible: true,
      x: seat.x, z: seat.z, px: seat.x, pz: seat.z, y: seat.y, rot: seat.rot, sit: true, hipY: seat.y + 0.05,
      pose: 'sit', act: 'idle', actT: rand(0.5, 3), lastSip: -9, walking: false, amp: 0,
    })
    seat.state = 'occupied'
    seat.by = c
    s.setLook?.(slot, d.look)
    const dk = CFG.drinks.find((x) => x.name === d.drink) || CFG.drinks[0]
    const [x, y, z] = seat.drink
    Object.assign(g, {
      visible: true, drink: dk, fill: dk.fill * rand(0.55, 0.95), garnish: 1, ice: [-9, -9, -9], drop: 0, scale: 1, tidyAt: -1,
      holder: null, home: [x, y, z], blend: 1, rot: seat.rot, x, y, z,
    })
    party.members.push(c)
  })
  const stays = shuffle(T.firstStays.map((v) => v + rand(0, 3)))
  Object.values(parties).forEach((p, n) => (p.leaveAt = s.time + stays[n % stays.length]))
  return Object.values(parties).flatMap((p) => p.members)
}

/* ---------- Bartender: makes the next drink for each order, in turn ---------- */
// Lower the arm behind the counter, then let go of the tool
const stow = (b) =>
  lazy(() =>
    b.toolR
      ? seq(call(() => { b.pose = 'stow' }), wait(0.3), call(() => { b.toolR = null }))
      : seq()
  )

const pourStep = (pose) => (s, b, g, dk) =>
  seq(
    call(() => { b.pose = pose }),
    wait(0.4),
    tween(0.3, (p) => { b.tilt = p * TOOLS[dk.tool].tilt }),
    call(() => { b.stream = true }),
    lazy(() => {
      const f0 = g.fill
      return tween(T[pose], (p) => { g.fill = f0 + (dk.fill - f0) * p }, linear)
    }),
    call(() => { b.stream = false }),
    tween(0.25, (p) => { b.tilt = (1 - p) * TOOLS[dk.tool].tilt })
  )

// o.x = where along the counter, o.prep = where the glass is made, o.serve = where it is slid to
const STEPS = {
  reach: (s, b, g, dk, o) =>
    seq(
      walkPath(s, b, [[o.x, BT.shelf]], CFG.barSpeed, false),
      call(() => { b.rot = Math.PI; b.pose = 'reach'; b.look = null }),
      wait(T.reach * 0.6),
      call(() => { b.toolR = dk.tool }),
      wait(T.reach * 0.4),
      call(() => { b.pose = 'hold' }),
      walkPath(s, b, [[o.x, BT.z]], CFG.barSpeed, false),
      call(() => { b.rot = 0; b.pose = 'place' }),
      wait(0.3),
      call(() => {
        const [x, y, z] = o.prep
        Object.assign(g, {
          visible: true, x, y, z, rot: 0, drink: dk, fill: 0, garnish: 0, ice: [null, null, null],
          holder: null, home: null, blend: 0, drop: 1, tidyAt: -1, scale: 1,
        })
      }),
      tween(0.25, (p) => { g.drop = 1 - p }, outCubic),
      call(() => { b.pose = 'hold' }),
      wait(0.15)
    ),
  pour: pourStep('pour'),
  // Mojito: press the mint and lime in the glass with the muddler (left hand), bottle still in the right
  muddle: (s, b, g) =>
    seq(
      call(() => { b.toolL = 'muddler'; b.pose = 'muddle' }),
      wait(0.3),
      tween(T.muddle, (p) => { g.fill = 0.1 * p }, linear),
      call(() => { b.toolL = null; b.pose = 'hold' }),
      wait(0.2)
    ),
  shake: (s, b) => seq(call(() => { b.pose = 'shake' }), wait(T.shake), call(() => { b.pose = 'hold' }), wait(0.2)),
  // Beer: pull the tap handle, the glass fills and the head of foam builds
  tap: (s, b, g, dk) =>
    seq(
      call(() => { b.pose = 'tap' }),
      wait(0.35),
      tween(0.25, (p) => { b.tapPull = p }),
      call(() => { b.stream = true }),
      tween(T.tap, (p) => { g.fill = dk.fill * p }, linear),
      call(() => { b.stream = false }),
      tween(0.25, (p) => { b.tapPull = 1 - p }),
      call(() => { b.pose = 'idle' }),
      wait(0.15)
    ),
  // Old Fashioned / Negroni: stir round the glass with the bar spoon
  stir: (s, b) =>
    seq(
      call(() => { b.toolL = 'spoon'; b.pose = 'stir' }),
      wait(T.stir),
      call(() => { b.toolL = null; b.pose = 'idle' }),
      wait(0.2)
    ),
  ice: (s, b, g) =>
    seq(
      stow(b),
      call(() => { b.pose = 'ice' }),
      wait(0.35),
      call(() => { g.ice = [0, 1, 2].map((k) => s.time + k * 0.28) }),
      wait(T.ice),
      call(() => { b.pose = 'idle' })
    ),
  garnish: (s, b, g) =>
    seq(
      stow(b),
      call(() => { b.pose = 'garnish' }),
      wait(0.35),
      tween(0.35, (p) => { g.garnish = p }, backOut),
      wait(Math.max(0, T.garnish - 0.7)),
      call(() => { b.pose = 'idle' })
    ),
  slide: (s, b, g, dk, o) => {
    // A beer poured at the tap first slides down the counter to the customer's stool
    const dx = o.serve[0] - o.prep[0]
    const along = Math.abs(dx) > 0.05 ? 0.4 + Math.abs(dx) * 0.3 : 0
    return seq(
      stow(b),
      call(() => { b.pose = 'slide' }),
      wait(0.25),
      along ? tween(along, (p) => { g.x = o.prep[0] + dx * p }) : seq(),
      tween(T.slide, (p) => { g.z = o.prep[2] + (o.serve[2] - o.prep[2]) * p }, outCubic),
      call(() => { b.pose = 'idle' })
    )
  },
}

function makeDrink(s, o) {
  const b = s.bar
  o.x = o.dk.prep === 'tap' ? CFG.tap[0] : o.seat.drink[0]
  o.prep = [o.x, 1.08, CFG.prepZ]
  o.serve = o.seat.drink
  return seq(
    call(() => { b.look = o.c; b.g = o.g; b.pose = 'nod' }),
    wait(T.notice),
    walkPath(s, b, [[o.x, BT.z]], CFG.barSpeed, false),
    call(() => { b.rot = 0; b.pose = 'idle' }),
    wait(0.3),
    ...stepsOf(o.dk).map((st) => STEPS[st](s, b, o.g, o.dk, o)),
    call(() => {
      o.g.home = [...o.serve]
      served(s, o)
      b.look = null
    }),
    wait(0.4),
    call(() => { b.busy = false; b.idle = 0 })
  )
}

const bartenderLoop = (s) => (dt) => {
  const b = s.bar
  if (b.busy) return false
  const o = s.orders.shift()
  if (o) {
    b.busy = true
    s.jobs.push(makeDrink(s, o))
    return false
  }
  // Nothing to make: back to wiping the counter at his usual spot
  b.idle += dt
  const [hx, hz] = BT.home
  if (b.idle > 1.5 && Math.hypot(b.x - hx, b.z - hz) > 0.05) {
    b.busy = true
    s.jobs.push(seq(walkPath(s, b, [BT.home], CFG.barSpeed, false), call(() => { b.rot = 0; b.pose = 'wipe'; b.busy = false })))
  } else if (b.idle > 1.5) b.pose = 'wipe'
  return false
}

/* ---------- Live / reduced-motion modes ---------- */
function setMode(s, calm) {
  s.calm = calm
  s.jobs = []
  s.orders = []
  const w = journeyWorld()
  if (w) {
    w.extras = []
    if (w.host.anim === 'wave') w.host.anim = 'idle'
  }
  for (const st of s.seats) Object.assign(st, { state: 'free', by: null, push: 0, pushNow: 0, freeSince: s.time - 30 })
  s.customers.forEach((c) =>
    Object.assign(c, { visible: false, busy: false, phase: 'gone', sit: false, hipY: null, pose: 'idle', walking: false, yielding: false, amp: 0 })
  )
  s.glasses.forEach((g) => Object.assign(g, { visible: false, holder: null, home: null, tidyAt: -1, scale: 1 }))
  Object.assign(s.bar, {
    x: BT.home[0], z: BT.home[1], rot: 0, pose: calm ? 'idle' : 'wipe', toolR: null, toolL: null, tilt: 0,
    stream: false, tapPull: 0, busy: false, look: null, g: null, walking: false, amp: 0, idle: 0,
  })
  const [rx, rz] = CFG.runner.home
  Object.assign(s.runner, { x: rx, z: rz, px: rx, pz: rz, rot: -Math.PI / 2, carry: false, pose: 'idle', walking: false, yielding: false, amp: 0 })
  s.lastDrink = -1
  s.snapFrames = 2
  s.fx?.hideAll()

  const seated = seatInitial(s)
  // Reduced motion: the room stays as it is, nobody walks
  if (calm) return
  seated.forEach((c) => s.jobs.push(seq(seatedLife(s, c), leave(s, c))))
  s.arrivals = [s.time + T.start]
  s.jobs.push(spawner(s), bartenderLoop(s))
}

/* ---------- DOM overlays: drink tag, "Welcome!" bubble, hearts ---------- */
const HEART =
  '<svg width="34" height="30" viewBox="0 0 34 30" aria-hidden="true">' +
  '<path d="M17 27s-8.6-5.3-11-10.6C4.3 12.6 6.7 7.6 11.2 7.6c2.4 0 4.2 1.3 5.8 3.4 1.6-2.1 3.4-3.4 5.8-3.4 4.5 0 6.9 5 5.2 8.8C25.6 21.7 17 27 17 27z" fill="#C8553D"/>' +
  '<path d="M4 3l.9 2.1L7 6l-2.1.9L4 9l-.9-2.1L1 6l2.1-.9z" fill="#D9A441"/>' +
  '<path d="M30 1l.7 1.6 1.6.7-1.6.7L30 5.6l-.7-1.6-1.6-.7 1.6-.7z" fill="#D9A441"/>' +
  '</svg>'

export function makeFx(parent, s) {
  const layer = document.createElement('div')
  layer.className = 'bar-fx'
  layer.setAttribute('aria-hidden', 'true')
  const mk = (cls, html) => {
    const el = document.createElement('div')
    el.className = 'bar-fx-item ' + cls
    el.innerHTML = '<span class="bar-anchor"><span class="bar-pop">' + html + '</span></span>'
    layer.append(el)
    return { el, live: false, on: false, offAt: 0, goneAt: 0, anchor: null }
  }
  const kinds = {
    tag: [mk('bar-tag', '<i class="bar-tag-dot"></i><span class="bar-tag-name"></span>')],
    say: [mk('bar-say', 'Welcome!')],
    heart: [mk('bar-heart', HEART), mk('bar-heart', HEART), mk('bar-heart', HEART)],
  }
  parent.append(layer)

  return {
    items: Object.values(kinds).flat(),
    show(kind, anchor, dur, dk) {
      const list = kinds[kind]
      const it = list.find((x) => !x.live) || list.reduce((a, b) => (a.offAt < b.offAt ? a : b))
      if (dk) {
        it.el.querySelector('.bar-tag-name').textContent = dk.name
        it.el.style.setProperty('--drink', dk.liquid)
      }
      it.anchor = anchor
      it.live = true
      it.on = true
      it.offAt = s.time + dur
      it.el.classList.remove('is-on')
      void it.el.offsetWidth // restart the CSS animation
      it.el.classList.add('is-live', 'is-on')
    },
    hideAll() {
      for (const it of this.items) {
        it.live = it.on = false
        it.el.classList.remove('is-live', 'is-on')
      }
    },
    remove: () => layer.remove(),
  }
}

const v = new THREE.Vector3()
export function placeFx(s, camera, size) {
  // Smaller when zoomed out, but never too small to read
  const k = Math.min(1.1, Math.max(0.75, camera.zoom / 90))
  // matrixWorld fakt render ma update thay: atyare j karo, nahi to tag scene thi ek frame paachhal rahe
  camera.updateMatrixWorld()
  for (const it of s.fx.items) {
    if (!it.live) continue
    if (it.on && s.time >= it.offAt) {
      it.on = false
      it.goneAt = s.time + 0.5
      it.el.classList.remove('is-on')
    }
    if (!it.on && s.time >= it.goneAt) {
      it.live = false
      it.el.classList.remove('is-live')
      continue
    }
    v.fromArray(it.anchor()).project(camera)
    // Akha pixel (text dhundhlu/shimmer na thay); same hoy to style na lakho (style recalc nahi)
    const x = Math.round((v.x * 0.5 + 0.5) * size.width)
    const y = Math.round((-v.y * 0.5 + 0.5) * size.height)
    const tf = `translate3d(${x}px, ${y}px, 0) scale(${k.toFixed(3)})`
    if (it.tf !== tf) it.el.style.transform = it.tf = tf
  }
}

/* ---------- 3D: small helpers ---------- */
function M({ geo, pos, rot, scale, color, rough = 0.6, metal = 0, shadow = true, ...mat }) {
  return (
    <mesh geometry={geo} position={pos} rotation={rot} scale={scale} castShadow={shadow}>
      <meshStandardMaterial color={color} roughness={rough} metalness={metal} {...mat} />
    </mesh>
  )
}

// Smoothly turn `obj` towards `target` (shortest way round)
const turn = (obj, target, k) => {
  obj.rotation.y += Math.atan2(Math.sin(target - obj.rotation.y), Math.cos(target - obj.rotation.y)) * k
}
const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a))
const clampYaw = (a) => Math.max(-0.9, Math.min(0.9, wrap(a)))

/* ---------- Customer ---------- */
function Customer({ s, d, look }) {
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

  useFrame(() => {
    const o = root.current
    if (!o) return
    o.visible = d.visible
    if (!d.visible || (!s.dt && !s.snap)) return
    const dt = s.dt
    const t = s.time + d.i * 1.3
    const k = s.snap ? 1 : Math.min(1, dt * 12)
    d.obj = o

    if (d.hipY != null) d.y = d.hipY - (d.sit ? 0.05 : 0.5)
    else d.y += (floorAt(d.x, d.z) - d.y) * (s.snap ? 1 : Math.min(1, dt * 14))
    o.position.set(d.x, d.y + Math.abs(Math.sin(d.stride)) * CFG.bob * d.amp, d.z)
    turn(o, d.rot, s.snap ? 1 : Math.min(1, dt * 10))

    legsStand.current.visible = !d.sit
    legsSit.current.visible = d.sit
    // Breathing, plus a little shake when laughing or cheering
    const act = d.sit ? (d.pose === 'order' ? 'order' : d.act) : d.pose
    const shake = act === 'laugh' || act === 'happy' ? Math.abs(Math.sin(t * 13)) * 0.014 : 0
    upper.current.position.y = (d.sit ? 0.05 : 0.5) + shake
    upper.current.scale.y = 1 + Math.sin(t * 1.8) * 0.012

    const sw = Math.sin(d.stride) * d.amp
    let aL = -sw * 0.5 + Math.sin(t * 1.5) * 0.05 * (1 - d.amp)
    let aR = sw * 0.5 + Math.sin(t * 1.5 + 1) * 0.05 * (1 - d.amp)
    let zL = 0
    let zR = 0
    if (d.sit) {
      aL = -1.2
      aR = -1.15
      if (act === 'order') {
        aL = -2.8 + Math.sin(t * 8) * 0.12
        zL = -0.2
      } else if (act === 'sip') {
        aR = -2.2
        zR = -0.55
      } else if (act === 'talk') {
        aR = -1.5 + Math.sin(t * 3.2) * 0.35
        zR = -0.15
      } else if (act === 'phone') {
        aL = -1.9
        zL = 0.45
      } else if (act === 'laugh') {
        aL = -1.4 + Math.sin(t * 14) * 0.08
      } else if (act === 'happy') {
        aL = -2.6 + Math.sin(t * 12) * 0.2
        zL = -0.25
      }
    }
    armL.current.rotation.x += (aL - armL.current.rotation.x) * k
    armL.current.rotation.z += (zL - armL.current.rotation.z) * k
    armR.current.rotation.x += (aR - armR.current.rotation.x) * k
    armR.current.rotation.z += (zR - armR.current.rotation.z) * k
    if (d.phone) d.phone.visible = d.sit && act === 'phone'

    const lL = d.sit ? 0 : sw * 0.7
    legL.current.rotation.x += (lL - legL.current.rotation.x) * k
    legR.current.rotation.x += (-lL - legR.current.rotation.x) * k
    kneeL.current.rotation.x += (Math.max(0, lL) * 1.3 - kneeL.current.rotation.x) * k
    kneeR.current.rotation.x += (Math.max(0, -lL) * 1.3 - kneeR.current.rotation.x) * k

    // Head: towards the partner while either of them talks, otherwise looks around
    const h = head.current
    let yaw = Math.sin(t * 0.5) * 0.2
    let hx = Math.sin(t * 0.9) * 0.04
    if (d.sit) {
      const mate = d.party?.members.find((m) => m !== d && m.sit)
      const chat = (x) => x === 'talk' || x === 'laugh'
      if (mate && (chat(act) || chat(mate.act))) yaw = clampYaw(Math.atan2(mate.x - d.x, mate.z - d.z) - o.rotation.y)
      else if (act === 'look') yaw = d.lookYaw
      if (act === 'phone') hx = 0.38
      else if (act === 'sip') hx = -0.2
      else if (act === 'laugh') hx = -0.22 + Math.sin(t * 14) * 0.07
    }
    h.rotation.y += (yaw - h.rotation.y) * Math.min(1, k * 0.6)
    if (act === 'nod') h.rotation.x = Math.max(0, Math.sin(t * 6)) * 0.25
    else h.rotation.x += (hx - h.rotation.x) * k
  }, -1)

  return (
    <group ref={root}>
      <Body
        gender={look.gender}
        shirt={look.shirt}
        pants={look.pants}
        hair={look.hair}
        skin={SKIN[look.skin]}
        phase={d.i * 1.1 + 0.4}
        r={{ upper, head, armL, armR, legL, legR, kneeL, kneeR, legsStand, legsSit }}
        rightHand={<group ref={(o) => (d.hand = o)} position={[0, -0.25, 0.03]} />}
        leftHand={
          <group ref={(o) => (d.phone = o)} position={[0.02, -0.24, 0.05]} rotation={[0.9, 0, 0]} visible={false}>
            <M geo={G.box} scale={[0.05, 0.09, 0.012]} color={C.ink} rough={0.3} shadow={false} />
            <M geo={G.box} pos={[0, 0, 0.007]} scale={[0.04, 0.075, 0.002]} color="#7FB7D9" emissive="#7FB7D9" emissiveIntensity={0.4} shadow={false} />
          </group>
        }
      />
    </group>
  )
}

/* ---------- Waiter ---------- */
function Runner({ s }) {
  const r = s.runner
  const root = useRef()
  const head = useRef()
  const armL = useRef()
  const armR = useRef()
  const legL = useRef()
  const legR = useRef()
  const kneeL = useRef()
  const kneeR = useRef()
  const tray = useRef()

  useFrame(() => {
    const o = root.current
    if (!o || (!s.dt && !s.snap)) return
    const dt = s.dt
    const t = s.time + 2.3
    const k = s.snap ? 1 : Math.min(1, dt * 12)
    r.obj = o
    o.position.set(r.x, 0.1 + Math.abs(Math.sin(r.stride)) * CFG.bob * r.amp, r.z)
    turn(o, r.rot, s.snap ? 1 : Math.min(1, dt * 10))

    const sw = Math.sin(r.stride) * r.amp
    let aR = sw * 0.5
    let zR = 0
    if (r.pose === 'reach') {
      aR = -1.55
      zR = -0.15
    } else if (r.carry) aR = -1.3
    armL.current.rotation.x += (-sw * 0.5 - armL.current.rotation.x) * k
    armR.current.rotation.x += (aR - armR.current.rotation.x) * k
    armR.current.rotation.z += (zR - armR.current.rotation.z) * k
    legL.current.rotation.x = sw * 0.7
    legR.current.rotation.x = -sw * 0.7
    kneeL.current.rotation.x = Math.max(0, sw) * 0.9
    kneeR.current.rotation.x = Math.max(0, -sw) * 0.9
    head.current.rotation.y = Math.sin(t * 0.5) * 0.2

    // Tray stays level in the hand
    tray.current.visible = r.carry || r.pose === 'reach'
    qa.copy(armR.current.quaternion).multiply(FORE).invert()
    tray.current.quaternion.copy(qa)
  }, -1)

  return (
    <group ref={root}>
      <Body
        shirt={C.olive}
        apron={C.cream}
        skin={SKIN[1]}
        phase={2.3}
        r={{ head, armL, armR, legL, legR, kneeL, kneeR }}
        rightHand={
          <group ref={tray} position={[0, -0.25, 0.03]}>
            <M geo={G.box} pos={[0, 0, 0.05]} scale={[0.3, 0.018, 0.24]} color={C.cream} />
            <object3D ref={(o) => (r.hand = o)} position={[0, 0.01, 0.05]} />
          </group>
        }
      />
    </group>
  )
}

/* ---------- Bar stools (slide back a little when someone gets up) ---------- */
function Stool() {
  return (
    <>
      <M geo={G.cyl} pos={[0, 0.02, 0]} scale={[0.18, 0.04, 0.18]} color={C.ink} rough={0.75} />
      <M geo={G.cyl} pos={[0, 0.4, 0]} scale={[0.04, 0.76, 0.04]} color={C.gold} rough={0.75} />
      <M geo={G.cyl} pos={[0, 0.78, 0]} scale={[0.22, 0.08, 0.22]} color={C.terra} rough={0.75} />
    </>
  )
}

function Stools({ s }) {
  const refs = useRef([])

  useFrame(() => {
    if (!s.dt && !s.snap) return
    const k = s.snap ? 1 : Math.min(1, s.dt * 6)
    s.seats.forEach((st, n) => {
      const o = refs.current[n]
      if (!o) return
      st.pushNow += (st.push - st.pushNow) * k
      const back = 0.14 * st.pushNow
      o.position.set(st.x - Math.sin(st.rot) * back, 0.1, st.z - Math.cos(st.rot) * back)
    })
  })

  return (
    <>
      {s.seats.map((st, n) => (
        <group key={st.id} ref={(o) => (refs.current[n] = o)} position={[st.x, 0.1, st.z]}>
          <Stool />
        </group>
      ))}
      {CFG.decorStools.map(([x, z]) => (
        <group key={x} position={[x, 0.1, z]}>
          <Stool />
        </group>
      ))}
    </>
  )
}

/* ---------- Bartender and tools ---------- */
// [left arm x, left arm z, right arm x, right arm z]. armZ null = from the tool (hand over the glass)
const POSE = {
  idle: [0, 0, 0, 0],
  nod: [0, 0, 0, 0],
  hold: [0.05, 0, -0.95, -0.1],
  reach: [-0.3, 0, -2.6, -0.1],
  place: [-1.9, 0.4, -0.95, -0.1],
  pour: [-0.15, 0.05, -2.3, null],
  shake: [-1.9, 0.6, -1.9, -0.6],
  muddle: [-2.1, 0.4, -0.95, -0.1],
  stir: [-2.1, 0.4, 0.05, 0.05],
  tap: [0.05, 0, -1.8, -0.15],
  ice: [-2.2, 0.4, 0.05, 0.05],
  garnish: [-2.2, 0.4, 0.05, 0.05],
  stow: [0.05, 0.05, 0.1, 0.06],
  slide: [0.05, 0.05, -1.65, -0.25],
  wipe: [-1.85, 0.3, -1.85, -0.3],
}
const FORE = new THREE.Quaternion().setFromEuler(new THREE.Euler(-0.15, 0, 0)) // forearm bend in Body
const Z = new THREE.Vector3(0, 0, 1)
const qa = new THREE.Quaternion()
const qt = new THREE.Quaternion()

// Tools are drawn in the bartender's own axes with the grip at the origin (the hand)
function Bottle({ part, name, color, label }) {
  return (
    <group ref={part(name)}>
      <M geo={G.cyl} pos={[0, 0.03, 0.03]} scale={[0.035, 0.15, 0.035]} color={color} rough={0.25} />
      <M geo={G.cyl} pos={[0, 0.03, 0.03]} scale={[0.036, 0.05, 0.036]} color={label} />
      <M geo={G.cyl} pos={[0, 0.135, 0.03]} scale={[0.013, 0.06, 0.013]} color={color} rough={0.25} />
      <M geo={G.cyl} pos={[0, 0.167, 0.03]} scale={[0.015, 0.012, 0.015]} color={C.gold} />
      <object3D ref={part('spout:' + name)} position={[0, 0.178, 0.03]} />
    </group>
  )
}
function Shaker({ part }) {
  return (
    <group ref={part('shaker')}>
      <M geo={G.cyl} pos={[0, 0.03, 0.03]} scale={[0.042, 0.16, 0.042]} color={C.steel} metal={0.6} rough={0.3} />
      <M geo={G.cyl} pos={[0, 0.125, 0.03]} scale={[0.032, 0.035, 0.032]} color={C.steel} metal={0.6} rough={0.3} />
      <M geo={G.ball} pos={[0, 0.145, 0.03]} scale={[0.018, 0.012, 0.018]} color={C.steel} metal={0.6} rough={0.3} />
      <object3D ref={part('spout:shaker')} position={[0, 0.155, 0.03]} />
    </group>
  )
}

// Beer tap on the counter: column at the front, spout reaching back over the glass, handle pulled towards the bartender
function Tap({ s }) {
  const handle = useRef()
  useFrame(() => {
    if (handle.current) handle.current.rotation.x = -s.bar.tapPull * 0.6
  })
  const [x, z] = CFG.tap
  return (
    <group position={[x, 1.08, z]}>
      <M geo={G.box} pos={[0, 0.006, 0]} scale={[0.16, 0.012, 0.13]} color={C.ink} rough={0.5} />
      <M geo={G.cyl} pos={[0, 0.006, 0.24]} scale={[0.055, 0.012, 0.055]} color={C.steel} metal={0.6} rough={0.3} />
      <M geo={G.cyl} pos={[0, 0.17, 0.24]} scale={[0.028, 0.34, 0.028]} color={C.steel} metal={0.6} rough={0.3} />
      <M geo={G.box} pos={[0, 0.335, 0.12]} scale={[0.04, 0.035, 0.27]} color={C.steel} metal={0.6} rough={0.3} />
      <M geo={G.cyl} pos={[0, 0.3, 0]} scale={[0.012, 0.05, 0.012]} color={C.steel} metal={0.6} rough={0.3} />
      <object3D ref={(o) => (s.tapSpout = o)} position={[0, 0.272, 0]} />
      <group ref={handle} position={[0, 0.355, 0]}>
        <M geo={G.cyl} pos={[0, 0.06, 0]} scale={[0.014, 0.12, 0.014]} color={C.ink} rough={0.5} />
        <M geo={G.ball} pos={[0, 0.125, 0]} scale={0.02} color={C.gold} />
      </group>
    </group>
  )
}

function Bartender({ s }) {
  const b = s.bar
  const root = useRef()
  const head = useRef()
  const armL = useRef()
  const armR = useRef()
  const legL = useRef()
  const legR = useRef()
  const kneeL = useRef()
  const kneeR = useRef()
  const toolR = useRef()
  const handL = useRef()
  const parts = useRef({})
  const cur = useRef([0, 0, 0, 0])
  const part = (key) => (o) => (parts.current[key] = o)

  useFrame(() => {
    const o = root.current
    if (!o || (!s.dt && !s.snap)) return
    const dt = s.dt
    const t = s.time
    const k = s.snap ? 1 : Math.min(1, dt * 10)

    o.position.set(b.x, 0.1 + Math.abs(Math.sin(b.stride)) * CFG.bob * b.amp, b.z)
    turn(o, b.rot, s.snap ? 1 : Math.min(1, dt * 9))
    const sw = Math.sin(b.stride) * b.amp
    legL.current.rotation.x = sw * 0.6
    legR.current.rotation.x = -sw * 0.6
    kneeL.current.rotation.x = Math.max(0, sw) * 0.8
    kneeR.current.rotation.x = Math.max(0, -sw) * 0.8

    // Arms: ease towards the pose, then add the quick motions on top (lerping them would damp them away)
    const tool = TOOLS[b.toolR]
    const pose = POSE[b.pose] || POSE.idle
    const c = cur.current
    pose.forEach((p, n) => {
      const goal = p ?? tool?.armZ ?? -0.25
      c[n] += (goal - c[n]) * k
    })
    let [lx, lz, rx, rz] = c
    if (b.walking) {
      lx -= sw * 0.4
      if (!b.toolR) rx += sw * 0.4
    }
    if (b.pose === 'wipe') {
      lx += Math.sin(t * 5) * 0.15
      rx += Math.sin(t * 5 + 1.6) * 0.12
      rz += Math.sin(t * 4) * 0.18
    } else if (b.pose === 'shake') {
      const sh = Math.sin(t * 26) * 0.3
      lx += sh
      rx += sh
    } else if (b.pose === 'muddle') {
      lx += Math.abs(Math.sin(t * 12)) * 0.1 // pressing down in the glass
    } else if (b.pose === 'stir') {
      lx += Math.sin(t * 8) * 0.06
      lz += Math.cos(t * 8) * 0.08
    } else if (b.pose === 'tap') {
      rx += b.tapPull * 0.35 // pulling the handle
    } else if (b.pose === 'idle' || b.pose === 'nod') {
      lx += Math.sin(t * 1.5) * 0.05
      rx += Math.sin(t * 1.5 + 1) * 0.05
    }
    armL.current.rotation.set(lx, 0, lz)
    armR.current.rotation.set(rx, 0, rz)

    // Head: nod hello, look at the customer being served, otherwise glance around
    const h = head.current
    if (b.pose === 'nod') {
      h.rotation.x = Math.max(0, Math.sin(t * 6)) * 0.22
    } else {
      h.rotation.x += ((b.pose === 'wipe' ? 0.25 : 0.1) - h.rotation.x) * k
    }
    let yaw = Math.sin(t * 0.5) * 0.2
    if (b.look?.visible) yaw = clampYaw(Math.atan2(b.look.x - b.x, b.look.z - b.z) - o.rotation.y)
    h.rotation.y += (yaw - h.rotation.y) * Math.min(1, k * 0.8)

    // Tools stay upright in the hand (undo the arm and forearm rotation), then tip to pour
    const p = parts.current
    for (const name of Object.keys(TOOLS)) if (p[name]) p[name].visible = b.toolR === name
    qa.copy(armR.current.quaternion).multiply(FORE).invert()
    qt.setFromAxisAngle(Z, b.tilt)
    toolR.current.quaternion.copy(qa).multiply(qt)
    b.spout = b.pose === 'tap' ? s.tapSpout : b.toolR ? p['spout:' + b.toolR] : null
    b.handL = handL.current // the muddler and bar spoon run from here into the glass (see Pour)
  }, -1)

  return (
    <group ref={root}>
      <Body
        shirt={C.ink}
        apron={C.terra}
        skin={SKIN[2]}
        phase={0.4}
        r={{ head, armL, armR, legL, legR, kneeL, kneeR }}
        rightHand={
          <group ref={toolR} position={[0, -0.25, 0.03]}>
            {Object.entries(TOOLS).map(([name, tl]) =>
              tl.bottle ? <Bottle key={name} part={part} name={name} color={tl.bottle} label={tl.label} /> : null
            )}
            <Shaker part={part} />
          </group>
        }
        leftHand={<object3D ref={handL} position={[0, -0.25, 0.03]} />}
      />
    </group>
  )
}

/* ---------- Glass with liquid, garnish and little effects ---------- */
const ICE_AT = [[-0.018, 0.015], [0.02, -0.012], [0.004, 0.024]]
const BUBBLES = Array.from({ length: 6 }, (_, k) => [Math.sin(k * 2.4) * 0.55, Math.cos(k * 2.4) * 0.55, k / 6])
const GARNISHES = ['lime', 'orange', 'mint', 'salt', 'peel', 'twist', 'pineapple', 'olive', 'straw']
const MINT = [[0, 0.012, 0, 0.5, 0, 0.3], [0.01, 0.016, -0.006, -0.4, 0.8, 0], [-0.009, 0.01, 0.008, 0.3, -0.9, 0.4]]

// The drink inside a glass: turned from the glass outline up to the surface, re-shaped as it fills or empties
const SIDES = 20
const LIQ_N = 9
const mkLiquid = () =>
  new THREE.LatheGeometry(Array.from({ length: LIQ_N + 2 }, (_, j) => new THREE.Vector2(0.01, j * 0.01)), SIDES)
function shapeLiquid(geo, gl, top) {
  const y0 = gl.stem + gl.base
  const n = LIQ_N + 2
  const pos = geo.attributes.position
  for (let i = 0; i <= SIDES; i++) {
    const phi = (i / SIDES) * Math.PI * 2
    const sn = Math.sin(phi)
    const cs = Math.cos(phi)
    for (let j = 0; j < n; j++) {
      // first and last points sit on the axis: they close the bottom and the surface
      const y = j === 0 ? y0 : j === n - 1 ? top : y0 + ((top - y0) * (j - 1)) / (LIQ_N - 1)
      const r = j === 0 || j === n - 1 ? 0 : bowlR(gl, y) * 0.92
      pos.setXYZ(i * n + j, r * sn, y, r * cs)
    }
  }
  pos.needsUpdate = true
  geo.computeVertexNormals()
  geo.computeBoundingSphere()
}

function Glass({ s, g, night }) {
  const root = useRef()
  const parts = useRef({ ice: [], spark: [], bub: [] })
  const last = useRef(null)
  const shaped = useRef(-1)
  const [liquid] = useState(mkLiquid)
  useEffect(() => () => liquid.dispose(), [liquid])
  const set = (key, n) => (o) => {
    if (n == null) parts.current[key] = o
    else parts.current[key][n] = o
  }

  useFrame(() => {
    const o = root.current
    if (!o) return
    o.visible = g.visible
    if (!g.visible || (!s.dt && !s.snap)) return
    const p = parts.current
    const dk = g.drink
    const gl = GLASSES[dk.glass]
    const t = s.time

    if (last.current !== dk) {
      last.current = dk
      shaped.current = -1
      p.wall.geometry = gl.geo
      p.handle.visible = !!gl.handle
      p.handle.position.set(gl.r + 0.006, gl.stem + gl.h * 0.5, 0)
      p.handle.scale.setScalar(gl.h * 0.3)
      p.liquid.material.color.set(dk.liquid)
      p.liquid.material.emissive.set(dk.liquid)
      p.top.material.color.set(dk.top)
      p.top.material.emissive.set(dk.top)
    }

    if (g.holder?.hand) {
      // In a hand: follow it (held by the middle, or by the stem), blending in so the glass doesn't jump
      g.holder.hand.getWorldPosition(v)
      v.y -= gl.stem ? gl.stem * 0.7 : gl.h * 0.5
      g.blend = s.snap ? 1 : Math.min(1, g.blend + s.dt / 0.3)
      g.x += (v.x - g.x) * g.blend
      g.y += (v.y - g.y) * g.blend
      g.z += (v.z - g.z) * g.blend
      if (g.holder.obj) g.rot = g.holder.obj.rotation.y
    } else if (g.home) {
      // Set down: ease back to its place on the counter
      const k = s.snap ? 1 : Math.min(1, s.dt * 9)
      g.x += (g.home[0] - g.x) * k
      g.y += (g.home[1] - g.y) * k
      g.z += (g.home[2] - g.z) * k
    }
    // Cleared away once its customer has gone
    if (g.tidyAt > 0 && t > g.tidyAt) {
      g.scale = Math.max(0, g.scale - s.dt / 0.4)
      if (g.scale <= 0) {
        Object.assign(g, { visible: false, tidyAt: -1, holder: null, home: null })
        return
      }
    }
    o.position.set(g.x, g.y + g.drop * 0.08, g.z)
    o.rotation.y = g.rot
    o.scale.setScalar(Math.max(0.001, g.scale))

    // Drink and its surface (a thick head of foam on a beer)
    const top = surface(gl, g.fill)
    if (Math.abs(g.fill - shaped.current) > 0.002) {
      shapeLiquid(liquid, gl, top)
      shaped.current = g.fill
    }
    p.liquid.visible = g.fill > 0.005
    p.liquid.material.emissiveIntensity = night ? 0.45 : 0
    const topR = bowlR(gl, top) * 0.9
    p.top.visible = g.fill > 0.04
    p.top.position.y = top
    p.top.scale.set(topR, dk.head ? dk.head * Math.min(1, g.fill / dk.fill) : 0.004, topR)
    p.top.material.emissiveIntensity = night ? 0.3 : 0

    // Garnish
    const rimY = gl.stem + gl.h
    const gs = Math.max(0.001, g.garnish)
    for (const name of GARNISHES) {
      const m = p[name]
      m.visible = g.garnish > 0 && dk.garnish.includes(name)
      m.scale.setScalar(gs)
    }
    p.lime.position.set(gl.r * 0.92, rimY, 0)
    p.orange.position.set(gl.r * 0.92, rimY, 0)
    p.peel.position.set(gl.r + 0.003, rimY - 0.012, 0)
    p.twist.position.set(gl.r * 0.85, rimY + 0.004, 0)
    p.pineapple.position.set(gl.r * 0.95, rimY, 0)
    p.mint.position.set(-gl.r * 0.25, top, gl.r * 0.15)
    p.olive.position.set(0, Math.max(top - 0.02, gl.stem + 0.014), 0)
    p.salt.position.set(0, rimY - 0.002, 0)
    p.salt.scale.setScalar(gl.r * gs)
    p.straw.position.set(gl.r * 0.25, gl.stem + gl.base, 0.01)
    p.straw.scale.set(0.006, Math.max(0.001, gl.h * 1.25 * gs), 0.006)

    // Ice: drop in, bounce, float; a tiny sparkle on the clink
    const iced = dk.fx.includes('ice')
    const cube = Math.min(0.032, gl.r * 0.55)
    const spread = topR / 0.054
    ICE_AT.forEach(([ix, iz], n) => {
      const c = p.ice[n]
      const spark = p.spark[n]
      const a = t - g.ice[n]
      const on = iced && g.ice[n] != null && a >= 0
      c.visible = on
      spark.visible = on && a > 0.3 && a < 0.55
      if (!on) return
      const rest = top - cube * 0.4
      const y = a < 0.3 ? rest + 0.2 * (1 - (a / 0.3) ** 2) : rest + Math.abs(Math.sin((a - 0.3) * 16)) * 0.025 * Math.exp(-(a - 0.3) * 7)
      c.position.set(ix * spread, y, iz * spread)
      c.rotation.set(0.4 + n, n * 0.9, 0.2)
      c.scale.setScalar(cube)
      if (spark.visible) {
        const u = (a - 0.3) / 0.25
        spark.position.set(ix * spread, rest + 0.03 + u * 0.03, iz * spread)
        spark.scale.setScalar(0.012 * (1 - u) + 0.002)
      }
    })

    // Bubbles rise through soda and beer
    const fizzy = dk.fx.includes('bubbles') && g.fill > 0.2
    const y0 = gl.stem + gl.base
    BUBBLES.forEach(([bx, bz, off], n) => {
      const m = p.bub[n]
      m.visible = fizzy
      if (!fizzy) return
      const q = (t * 0.45 + off) % 1
      const y = y0 + 0.006 + q * (top - y0 - 0.006)
      const br = bowlR(gl, y) * 0.8
      m.position.set(bx * br, y, bz * br)
      m.scale.setScalar(0.005 + q * 0.003)
    })
  })

  return (
    <group ref={root}>
      {/* Clear glass (shape swapped per drink) and the beer mug's handle */}
      <mesh ref={set('wall')} geometry={GLASSES.highball.geo} renderOrder={2}>
        <meshStandardMaterial color="#EAF6F8" transparent opacity={0.3} roughness={0.08} depthWrite={false} side={THREE.DoubleSide} />
      </mesh>
      <mesh ref={set('handle')} geometry={G.handle} rotation={[0, 0, -Math.PI / 2]} renderOrder={2} visible={false}>
        <meshStandardMaterial color="#EAF6F8" transparent opacity={0.45} roughness={0.08} depthWrite={false} />
      </mesh>
      <mesh ref={set('liquid')} geometry={liquid}>
        <meshStandardMaterial roughness={0.35} emissiveIntensity={0} side={THREE.DoubleSide} />
      </mesh>
      <mesh ref={set('top')} geometry={G.base}>
        <meshStandardMaterial roughness={0.6} emissiveIntensity={0} />
      </mesh>

      {/* Garnishes */}
      <group ref={set('lime')}>
        <M geo={G.cyl} rot={[Math.PI / 2, 0, 0]} scale={[0.034, 0.012, 0.034]} color="#6E9F2E" shadow={false} />
        <M geo={G.cyl} rot={[Math.PI / 2, 0, 0]} scale={[0.028, 0.014, 0.028]} color="#D8EE8A" shadow={false} />
      </group>
      <group ref={set('orange')}>
        <M geo={G.cyl} rot={[Math.PI / 2, 0, 0]} scale={[0.038, 0.012, 0.038]} color="#E8862A" shadow={false} />
        <M geo={G.cyl} rot={[Math.PI / 2, 0, 0]} scale={[0.032, 0.014, 0.032]} color="#F8C77E" shadow={false} />
      </group>
      <group ref={set('mint')}>
        {MINT.map(([x, y, z, rx, ry, rz], n) => (
          <M key={n} geo={G.ball} pos={[x, y, z]} rot={[rx, ry, rz]} scale={[0.011, 0.004, 0.02]} color={n % 2 ? '#5DAA45' : '#3E8E3A'} shadow={false} />
        ))}
      </group>
      <mesh ref={set('salt')} geometry={G.ring} rotation={[Math.PI / 2, 0, 0]}>
        <meshStandardMaterial color="#FFFFFF" roughness={0.95} />
      </mesh>
      <group ref={set('peel')}>
        <M geo={G.box} rot={[0, 0, 0.25]} scale={[0.012, 0.05, 0.005]} color="#E8892B" shadow={false} />
      </group>
      <group ref={set('twist')}>
        <M geo={G.twist} rot={[0.4, 0, 0.6]} scale={0.014} color="#7DB33A" shadow={false} />
      </group>
      <group ref={set('pineapple')}>
        <M geo={G.box} pos={[0.012, 0.002, 0]} scale={[0.048, 0.03, 0.012]} color="#F2C94C" shadow={false} />
        <M geo={G.box} pos={[0.012, -0.015, 0]} scale={[0.05, 0.006, 0.014]} color="#B8862E" shadow={false} />
        <M geo={G.box} pos={[0.026, 0.032, 0]} rot={[0, 0, -0.35]} scale={[0.005, 0.035, 0.003]} color="#4F8A2E" shadow={false} />
        <M geo={G.box} pos={[0.034, 0.03, 0]} rot={[0, 0, -0.75]} scale={[0.005, 0.03, 0.003]} color="#4F8A2E" shadow={false} />
      </group>
      <group ref={set('olive')}>
        <M geo={G.ball} scale={[0.012, 0.011, 0.011]} color="#76862C" shadow={false} />
        <M geo={G.ball} pos={[0.011, 0.002, 0]} scale={0.004} color={C.terra} shadow={false} />
        <M geo={G.cyl} pos={[0.025, 0.045, 0]} rot={[0, 0, -0.5]} scale={[0.0018, 0.11, 0.0018]} color="#D9B98A" shadow={false} />
      </group>
      <mesh ref={set('straw')} geometry={G.base} rotation={[0, 0, 0.22]}>
        <meshStandardMaterial color={C.terra} roughness={0.5} />
      </mesh>

      {ICE_AT.map((_, n) => (
        <group key={n}>
          <mesh ref={set('ice', n)} geometry={G.box}>
            <meshStandardMaterial color="#E4F6FF" transparent opacity={0.75} roughness={0.1} />
          </mesh>
          <mesh ref={set('spark', n)} geometry={G.ball}>
            <meshBasicMaterial color="#FFFFFF" />
          </mesh>
        </group>
      ))}
      {BUBBLES.map((_, n) => (
        <mesh key={n} ref={set('bub', n)} geometry={G.ball}>
          <meshBasicMaterial color="#FFFFFF" transparent opacity={0.75} />
        </mesh>
      ))}
    </group>
  )
}

/* ---------- Pouring stream, muddler and bar spoon (between the bartender's hands and the glass) ---------- */
const UP = new THREE.Vector3(0, 1, 0)
const va = new THREE.Vector3()
const vb = new THREE.Vector3()
const STICKS = { muddler: { w: 0.011, color: '#8A5A35', metal: 0 }, spoon: { w: 0.004, color: C.steel, metal: 0.6 } }

function Pour({ s, night }) {
  const stream = useRef()
  const sticks = useRef({})
  const last = useRef(null)

  useFrame(() => {
    if (!s.dt && !s.snap) return
    const b = s.bar
    const g = b.g
    const m = stream.current
    const on = b.stream && b.spout && g?.visible
    m.visible = !!on
    if (g && last.current !== g.drink) {
      last.current = g.drink
      m.material.color.set(g.drink.liquid)
      m.material.emissive.set(g.drink.liquid)
    }
    m.material.emissiveIntensity = night ? 0.5 : 0
    if (on) {
      const dk = g.drink
      const head = dk.head ? dk.head * Math.min(1, g.fill / dk.fill) : 0
      b.spout.getWorldPosition(va)
      vb.set(g.x, g.y + surface(GLASSES[dk.glass], g.fill) + head, g.z)
      va.sub(vb)
      const len = va.length()
      m.position.copy(vb)
      m.quaternion.setFromUnitVectors(UP, va.normalize())
      const w = 0.011 + Math.sin(s.time * 40) * 0.0012
      m.scale.set(w, len, w)
    }

    // The muddler pumps up and down, the bar spoon circles round the glass: both run from the left hand into the drink
    for (const [name, st] of Object.entries(STICKS)) {
      const mesh = sticks.current[name]
      const use = b.toolL === name && b.handL && g?.visible
      mesh.visible = !!use
      if (!use) continue
      const gl = GLASSES[g.drink.glass]
      const y0 = g.y + gl.stem + gl.base
      if (name === 'muddler') vb.set(g.x, y0 + 0.01 + (1 - Math.abs(Math.sin(s.time * 12))) * 0.03, g.z)
      else {
        const rr = bowlR(gl, gl.stem + gl.base + 0.02) * 0.45
        vb.set(g.x + Math.cos(s.time * 8) * rr, y0 + 0.012, g.z + Math.sin(s.time * 8) * rr)
      }
      b.handL.getWorldPosition(va)
      va.sub(vb)
      const len = va.length()
      mesh.position.copy(vb)
      mesh.quaternion.setFromUnitVectors(UP, va.normalize())
      mesh.scale.set(st.w, len + 0.03, st.w)
    }
  })

  return (
    <group>
      <mesh ref={stream} geometry={G.stream} visible={false}>
        <meshStandardMaterial roughness={0.3} emissiveIntensity={0} />
      </mesh>
      {Object.entries(STICKS).map(([name, st]) => (
        <mesh key={name} ref={(o) => (sticks.current[name] = o)} geometry={G.stream} visible={false} castShadow>
          <meshStandardMaterial color={st.color} roughness={0.5} metalness={st.metal} />
        </mesh>
      ))}
    </group>
  )
}

/* ---------- Main ---------- */
// The bar: customers come in through reception, take a free stool at the counter (every stool is used
// in turn), and the bartender makes each order from the DRINKS menu and slides it over.
export default function BarStory({ night }) {
  const ref = useRef(null)
  if (!ref.current) ref.current = createStory()
  const s = ref.current
  const [looks, setLooks] = useState(() =>
    Array.from({ length: POOL }, (_, i) => CFG.atStart[i]?.look ?? { gender: 'boy', shirt: C.olive, hair: C.ink, pants: C.ink, skin: 1 })
  )
  s.setLook = (slot, look) =>
    setLooks((prev) => {
      const next = prev.slice()
      next[slot] = look
      return next
    })
  const gl = useThree((st) => st.gl)

  // DOM overlays, Page Visibility and reduced motion
  useEffect(() => {
    const fx = makeFx(gl.domElement.parentElement, s)
    s.fx = fx
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const onVis = () => (s.hidden = document.hidden)
    const onMotion = () => setMode(s, mq.matches)
    onVis()
    onMotion()
    document.addEventListener('visibilitychange', onVis)
    mq.addEventListener('change', onMotion)
    return () => {
      document.removeEventListener('visibilitychange', onVis)
      mq.removeEventListener('change', onMotion)
      const w = journeyWorld()
      if (w) {
        w.extras = []
        if (w.host.anim === 'wave') w.host.anim = 'idle'
      }
      fx.remove()
      s.fx = null
      s.jobs = []
    }
  }, [gl, s])

  useFrame((state, delta) => {
    // Tab hidden: freeze everything (no catch-up jump when it comes back)
    if (s.hidden) {
      s.dt = 0
      s.snap = false
      for (const a of s.walkers) {
        a.x = a.px
        a.z = a.pz
      }
      return
    }
    s.snap = s.calm || s.snapFrames > 0
    if (s.snapFrames > 0) s.snapFrames--
    if (s.calm) {
      s.dt = 0
      return
    }
    const dt = Math.min(delta, 0.05)
    s.dt = dt
    s.time += dt

    // Journey may nudge our people while separating crowds; we keep our own positions
    for (const a of s.walkers) {
      a.x = a.px
      a.z = a.pz
    }
    const w = journeyWorld()
    if (w) w.extras = s.walkers

    // Jobs may start new jobs (customers, orders): keep those too
    const running = s.jobs
    s.jobs = []
    s.jobs = running.filter((job) => !job(dt)).concat(s.jobs)

    for (const a of s.walkers) {
      a.px = a.x
      a.pz = a.z
    }
  }, -2)

  // Tags camera (CameraRig -3, OrbitControls -1) pachhi muko, etle ae j frame ni camera vapre
  useFrame((state) => {
    if (s.fx && !s.hidden && !s.calm) placeFx(s, state.camera, state.size)
  }, -0.1)

  return (
    <group>
      <Stools s={s} />
      <Tap s={s} />
      <Bartender s={s} />
      <Runner s={s} />
      {s.customers.map((d, i) => (
        <Customer key={i} s={s} d={d} look={looks[i]} />
      ))}
      {s.glasses.map((g, i) => (
        <Glass key={i} s={s} g={g} night={night} />
      ))}
      <Pour s={s} night={night} />

      {/* Night: warm glow along the bar counter */}
      <mesh position={[-4.3, 1.04, -8.993]}>
        <boxGeometry args={[5.8, 0.03, 0.012]} />
        <meshStandardMaterial color="#F2C77A" emissive="#FFB35C" emissiveIntensity={night ? 2.2 : 0} />
      </mesh>
      <mesh position={[-4.3, 0.85, -9.125]}>
        <boxGeometry args={[5.6, 0.04, 0.012]} />
        <meshStandardMaterial color={C.gold} emissive="#FFB35C" emissiveIntensity={night ? 1.8 : 0} />
      </mesh>
      <pointLight position={[-4.3, 0.7, -8.3]} color="#FFB35C" intensity={night ? 4 : 0} distance={4.5} decay={2} />
    </group>
  )
}
