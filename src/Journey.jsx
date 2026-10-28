import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { Body } from './Characters'
import Dish from './Dishes'

const PI = Math.PI

/* ==========================================================================
   DINING_HALL: every table, seat, lane, timing and outfit of the dining hall.
   Positions are world units [x, z]: +x = towards the kitchen side, +z = towards the terrace.
   Walking along x or z reads as an isometric diagonal on screen.
   rot = the way a seated guest faces: 0 = +z, PI/2 = +x, PI = -z, -PI/2 = -x.
   Times are in seconds; [a, b] means a random value between a and b.
   ========================================================================== */
export const DINING_HALL = {
  speed: 1.6,          // guests, receptionist and waiters walk at this pace
  stride: 5,           // leg swing per unit walked (radians)
  tableTop: 0.9,       // height of every table top
  chairPull: 0.15,     // a chair slides back this far when someone sits down or gets up
  tuck: 0.25,          // ...and stays out this much (0..1) while they sit
  heights: { chair: 0.54, booster: 0.64 }, // seat tops: chair, chair + kid's cushion

  // Walking lanes. The two lanes between the rows are one-way, so nobody meets head-on.
  lanes: {
    north: 0.32,          // waiters only: between the kitchen pass and the back row
    in: 3.05,             // between the rows, walking in (towards +x)
    out: 2.6,             // between the rows, walking out (towards -x)
    south: 5.95,          // behind the front row, along the terrace edge: the way out
    gaps: [1.85, 4.95],   // waiters cross between the back-row tables here
    aisles: [2.45, 6.75], // either side of the long table: to the seats on the terrace side
    gateIn: -3.3,         // reception -> hall
    gateOut: -2.6,        // hall -> down to the south lane on the way out
    exitX: -3.5,          // ...then out across the porch
    door: 9.6,
  },

  reception: {
    post: [-5.5, 3.8],                            // receptionist behind the desk
    enter: [[-4.9, 9.3], [-6.1, 9.6]],            // parties walk in from the porch in two columns...
    line: { x: [-4.9, -6.1], z: 5.42, gap: 0.6 }, // ...and wait two by two either side of the desk
    show: [-1.2, 3.75],                           // receptionist walks ahead and points the way from here
  },

  waiters: {
    homes: [[2.2, -0.12], [3.4, -0.12], [4.6, -0.12], [5.8, -0.12]], // standing by at the kitchen pass
    tray: 4,              // plates on one tray: bigger tables take more trips
  },

  // The five tables. capacity = chairs, state = free | reserved | occupied (occupied until cleared).
  // seats: x/z = where the guest sits, rot = facing, stand = where they step in beside the chair,
  //        serve = where the waiter stands to put their plate down (and to clear it).
  // fill  = which chairs a smaller party takes first (one list is picked at random).
  // lamps = brass pendants overhead (drawn in Lights.jsx).
  tables: [
    { id: 'T1', capacity: 2, shape: 'round', x: 0.3, z: 1.6, size: [1.4, 1.4], state: 'free', lamps: [[0.3, 1.6]],
      fill: [['W', 'E'], ['E', 'W']], seats: [
        { id: 'W', x: -0.65, z: 1.6, rot: PI / 2, stand: [-0.65, 2.2], serve: [0.3, 0.72] },
        { id: 'E', x: 1.25, z: 1.6, rot: -PI / 2, stand: [1.25, 2.2], serve: [0.3, 0.72] },
      ] },
    { id: 'T2', capacity: 2, shape: 'round', x: 3.4, z: 1.6, size: [1.4, 1.4], state: 'free', lamps: [[3.4, 1.6]],
      fill: [['W', 'E'], ['E', 'W']], seats: [
        { id: 'W', x: 2.45, z: 1.6, rot: PI / 2, stand: [2.45, 2.2], serve: [3.4, 0.72] },
        { id: 'E', x: 4.35, z: 1.6, rot: -PI / 2, stand: [4.35, 2.2], serve: [3.4, 0.72] },
      ] },
    { id: 'T3', capacity: 2, shape: 'round', x: 6.5, z: 1.6, size: [1.4, 1.4], state: 'free', lamps: [[6.5, 1.6]],
      fill: [['W', 'E'], ['E', 'W']], seats: [
        { id: 'W', x: 5.55, z: 1.6, rot: PI / 2, stand: [5.55, 2.2], serve: [6.5, 0.72] },
        { id: 'E', x: 7.45, z: 1.6, rot: -PI / 2, stand: [7.45, 2.2], serve: [6.5, 0.72] },
      ] },
    { id: 'T4', capacity: 4, shape: 'square', x: 0.75, z: 4.5, size: [1.05, 1.05], state: 'free', lamps: [[0.75, 4.5]],
      fill: [['W', 'E', 'N', 'S'], ['N', 'S', 'E', 'W']], seats: [
        { id: 'N', x: 0.75, z: 3.6, rot: 0, stand: [1.3, 3.5], serve: [1.3, 3.5] },
        { id: 'E', x: 1.65, z: 4.5, rot: -PI / 2, stand: [1.75, 3.95], serve: [1.3, 3.5] },
        { id: 'S', x: 0.75, z: 5.4, rot: PI, stand: [1.3, 5.55], serve: [1.3, 5.55] },
        { id: 'W', x: -0.15, z: 4.5, rot: PI / 2, stand: [-0.25, 3.95], serve: [0.2, 3.5] },
      ] },
    { id: 'T5', capacity: 6, shape: 'long', x: 4.65, z: 4.5, size: [2.1, 1.05], state: 'free', lamps: [[4.05, 4.5], [5.25, 4.5]],
      fill: [['N1', 'S1', 'N2', 'S2', 'W', 'E'], ['N2', 'S2', 'N1', 'S1', 'E', 'W']], seats: [
        { id: 'N1', x: 4.15, z: 3.6, rot: 0, stand: [3.65, 3.5], serve: [3.65, 3.5] },
        { id: 'N2', x: 5.15, z: 3.6, rot: 0, stand: [5.65, 3.5], serve: [5.65, 3.5] },
        { id: 'E', x: 6.05, z: 4.5, rot: -PI / 2, stand: [6.15, 3.95], serve: [5.65, 3.5] },
        { id: 'S2', x: 5.15, z: 5.4, rot: PI, stand: [5.65, 5.55], serve: [5.65, 5.55] },
        { id: 'S1', x: 4.15, z: 5.4, rot: PI, stand: [3.65, 5.55], serve: [3.65, 5.55] },
        { id: 'W', x: 3.25, z: 4.5, rot: PI / 2, stand: [3.15, 3.95], serve: [3.65, 3.5] },
      ] },
  ],

  // Party types, picked by weight among those that come in the size needed.
  // style picks the outfits below; kids = how many children (families: two parents, the rest
  // children and grandparents).
  parties: {
    solo: { weight: 0.5, size: [1, 1], style: 'casual' },
    couple: { weight: 2, size: [2, 2], style: 'date' },
    friends: { weight: 1.4, size: [2, 6], style: 'casual' },
    family: { weight: 1.6, size: [3, 6], style: 'family', kids: [1, 3] },
    colleagues: { weight: 1.1, size: [3, 6], style: 'office' },
  },
  // Party sizes each table is for. A smaller party takes a bigger table only when every table of its
  // own size is in use (and then only with the `upsize` chance); a bigger party never takes a smaller one.
  fits: { 2: [1, 2], 4: [3, 4], 6: [5, 6] },
  upsize: 0.3,
  // Tables in use (reserved or occupied): new parties come quickly below min, and never above max
  occupancy: { min: 3, max: 5, atStart: 4 },
  sizes: { elder: [0.9, 0.97], adult: [0.94, 1.05], kid: [0.6, 0.68] },

  outfits: {
    casual: ['#3E5C76', '#8C3B2E', '#D9A441', '#5C6B3A', '#7A4E7E', '#2F6F73', '#B5651D', '#4F7942', '#E07A5F', '#6A4C93'],
    date: ['#A34A5A', '#8C3B2E', '#2B2F3A', '#6A4C93', '#B5485A', '#3E5C76', '#E07A5F'],
    office: ['#F4F1EA', '#A9C4DE', '#C9D3DC', '#8A8F98', '#3E5C76', '#5B6C8F', '#D8CBB5'],
    ties: ['#8C3B2E', '#2B2F3A', '#3E5C76', '#6B7F3A'],
    kids: ['#F2D46B', '#9CC5D9', '#F4B6C2', '#E8862A', '#7DB33A', '#C8A2E8', '#4FB3BF'],
    elders: ['#8A7F72', '#6E5A4B', '#4B5D6B', '#9C6B4E', '#7B5B6E', '#5F6F52'],
    hair: ['#2B1D14', '#5A3A22', '#1A1A1A', '#8B5A2B', '#A0522D'],
    elderHair: ['#D8D4CC', '#BDB7AE', '#9E9890', '#E9E5DD'],
    pants: ['#2B1D14', '#3B4A5A', '#5A4636'],
    officePants: ['#2B2F3A', '#3B4A5A', '#4A4A4A'],
    flowers: ['#E94F64', '#F2C94C', '#F4B6C2', '#C8A2E8', '#F28C38'], // one bloom per table
  },
  host: { gender: 'girl', shirt: '#C8553D', skin: 0, hair: '#5A3A22' },
  staff: { shirt: '#6B7F3A', apron: '#F5E6CC' },

  time: {
    start: 2,              // first new party after the page opens
    gap: [6, 14],          // between new parties while at least occupancy.min tables are in use...
    rush: [1.5, 3],        // ...and while fewer are
    firstStays: [6, 17, 29, 42], // remaining stays of the parties seated at page load (shuffled, +0..4 s each)
    stay: [24, 42],        // eating: from the last plate served until they get up
    follow: 0.6,           // party members walk this far behind each other
    greet: [1.8, 1.4, 1.0], // at the desk: receptionist speaks, the guest answers, receptionist again
    show: 1.4,             // receptionist shows the way to the table
    sit: 0.4,              // sit down / stand up
    order: 2.6,            // the waiter takes the order
    pickup: 1.2,           // plates handed over at the kitchen pass
    place: 0.45,           // a plate moving between the tray and the table
    bow: 0.7,
    clearDelay: 1,         // the waiter comes to clear this long after the party has got up
    wipe: 0.9,             // wiping each place
    chairBack: 1.2,        // a pushed-back chair returns this long after its guest walks off
    bite: 1.7,             // one forkful: plate -> mouth -> plate
    moment: [7, 14],       // a joke the whole table laughs at, this often
  },
  eatShare: 0.55,          // roughly how much of their stay guests spend eating (sets the size of a bite)
  crumbs: 0.06,            // what is left on a finished plate
  water: 0.85,             // water glasses are filled this far
  dishes: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14], // Dishes.jsx kinds the kitchen sends out
}

/* ---------- Shortcuts ---------- */
const CFG = DINING_HALL
const T = CFG.time
const L = CFG.lanes
const RC = CFG.reception
const POOL = 22             // guests: every seat, plus room for a party arriving while another walks out
const SLOTS = CFG.waiters.tray
const TRAY_SCALE = 0.62
const MIN_GAP = 0.4         // be loko vachhe ochhi ochhi aatli jagya (safety)
const YIELD_GAP = 0.55      // aatla paas aave to samnevalo ne rasto aapo
const STILL_GAP = 0.32      // walking past someone standing still
const PATH_GAP = 0.42       // giving way: keep this far from the path of the one with right of way...
const LOOK_AHEAD = 1.6      // ...over the next this-many units they walk
const BOB = 0.035
const C = {
  cream: '#F5E6CC',
  terra: '#C8553D',
  olive: '#6B7F3A',
  oliveDark: '#4F6128',
  wood: '#4A3426',
  woodLight: '#6B4A35',
  plate: '#FFF8EC',
  gold: '#D9A441',
  ink: '#2B1D14',
  silver: '#C9CDD2',
  cloth: '#E8EEF2',
}
const SKIN = ['#F1C9A5', '#E8B08A', '#C98B62', '#A8683F']

const rand = (a, b) => a + Math.random() * (b - a)
const randIn = ([a, b]) => rand(a, b)
const randInt = ([a, b]) => a + Math.floor(Math.random() * (b - a + 1))
const pick = (list) => list[Math.floor(Math.random() * list.length)]
const shuffle = (list) => list.map((v) => [Math.random(), v]).sort((a, b) => a[0] - b[0]).map((p) => p[1])
const chunk = (list, n) => Array.from({ length: Math.ceil(list.length / n) }, (_, i) => list.slice(i * n, i * n + n))
function weighted(list, weight) {
  const ws = list.map(weight)
  let r = Math.random() * ws.reduce((a, b) => a + b, 0)
  for (let i = 0; i < list.length; i++) if ((r -= ws[i]) <= 0) return list[i]
  return list[list.length - 1]
}
const clamp = (v, a, b) => Math.max(a, Math.min(b, v))
const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a))
const clampYaw = (a) => Math.max(-0.9, Math.min(0.9, wrap(a)))
const pathLen = (pts) => pts.reduce((n, p, i) => (i ? n + Math.hypot(p[0] - pts[i - 1][0], p[1] - pts[i - 1][1]) : 0), 0)
const faceTo = (a, x, z) => Math.atan2(x - a.x, z - a.z)
const atSpot = (a, [x, z], r = 0.15) => Math.hypot(a.x - x, a.z - z) < r

/* ---------- Task helpers (step by step script, BarStory pan vapre) ---------- */
export const seq = (...tasks) => {
  let i = 0
  return (dt) => {
    if (i >= tasks.length) return true
    if (tasks[i](dt)) i++
    return i >= tasks.length
  }
}
export const par = (...tasks) => {
  const done = tasks.map(() => false)
  return (dt) => {
    tasks.forEach((t, k) => {
      if (!done[k]) done[k] = t(dt)
    })
    return done.every(Boolean)
  }
}
export const wait = (s) => {
  let t = 0
  return (dt) => (t += dt) >= s
}
export const call = (fn) => () => {
  fn()
  return true
}
export const until = (cond) => () => !!cond()
export const lazy = (build) => {
  let t = null
  return (dt) => {
    if (!t) t = build()
    return t(dt)
  }
}
const smooth = (p) => p * p * (3 - 2 * p)
const linear = (p) => p
const tween = (dur, fn, curve = smooth) => {
  let t = 0
  return (dt) => {
    t = Math.min(dur, t + dt)
    fn(curve(dur > 0 ? t / dur : 1))
    return t >= dur
  }
}

let WORLD = null
// BarStory reception/host vapre ane potana customers w.extras ma muke
export const journeyWorld = () => WORLD

/* ---------- Floor and routes ---------- */
// Floor height: the coloured section floors are 0.1, the slab between them and the porch 0 (as in BarStory)
const FLOORS = [[-8, -3, 1, 6], [-2, 8, 0, 6], [0, 8, -6, -1], [-8, -1, -6, -1], [-8, -0.5, -12, -6], [-0.5, 8, -12, -6]]
const floorY = (x, z) => {
  for (const [x0, x1, z0, z1] of FLOORS) if (x >= x0 && x <= x1 && z >= z0 && z <= z1) return 0.1
  return 0
}

// Which band of the hall a spot is in: 0 = by the kitchen pass, 1 = between the rows, 2 = terrace side
const band = (p) => (p[1] < 1.1 ? 0 : p[1] > 5.2 ? 2 : 1)
const laneZ = (b, fromX, toX) => (b === 0 ? L.north : b === 2 ? L.south : toX >= fromX ? L.in : L.out)
// Any spot in the hall to any other: out to the lane of its band, along it to the nearest crossing
// (waiter gaps between bands 0-1, aisles between 1-2), and so on, then in to the spot
function hallRoute(a, b, aisles = L.aisles) {
  const pts = []
  let x = a[0]
  let at = band(a)
  const goal = band(b)
  while (at !== goal) {
    const next = at + Math.sign(goal - at)
    const links = Math.min(at, next) === 0 ? L.gaps : aisles
    const cost = (c) => Math.abs(x - c) + Math.abs(c - b[0])
    const cx = links.reduce((u, c) => (cost(c) < cost(u) ? c : u))
    const z = laneZ(at, x, cx)
    pts.push([x, z], [cx, z])
    x = cx
    at = next
  }
  const z = laneZ(at, x, b[0])
  pts.push([x, z], [b[0], z], b)
  return pts
}

const GATE = [L.gateIn, L.in]
const lineSpot = (k) => [RC.line.x[k % 2], RC.line.z + Math.floor(k / 2) * RC.line.gap]
// Reception -> into the hall on the in-lane -> beside the chair
const routeIn = (k, seat) => [[lineSpot(k)[0], RC.line.z], [L.gateIn, RC.line.z], GATE, ...hallRoute(GATE, seat.stand)]
// Beside the chair -> out-lane (or the terrace-side lane) -> down past reception -> out across the porch
const routeOut = (seat) => [
  ...hallRoute(seat.stand, [L.gateOut, L.south], [L.gateOut]),
  [L.exitX, L.south],
  [L.exitX, L.door],
]

/* ---------- World (badhu data ahi) ---------- */
const mkActor = (pri) => ({
  x: 0, z: 0, y: 0.1, rot: 0, visible: false, sit: false, hip: null, size: 1, kid: false,
  anim: 'idle', pose: 'idle', yielding: false, waitT: 0, ghost: 0, stride: 0, amp: 0,
  group: null, pri, obj: null, hand: null, fork: null, phase: 0,
})
const mkGuest = (i) => ({
  ...mkActor(1 + i), i, phase: i * 0.7,
  busy: false, step: 'gone', party: null, seat: null, order: 0, served: false, away: false,
  bite: 0.1, act: 'idle', actT: 0, actAge: 0, lookYaw: 0, lastSip: -9, focus: null,
})

function mkSeat(t, d) {
  const fx = Math.sin(d.rot)
  const fz = Math.cos(d.rot)
  // The guest's eating hand (Body's right arm, local +x)
  const rx = Math.cos(d.rot)
  const rz = -Math.sin(d.rot)
  const top = CFG.tableTop
  const px = d.x + fx * 0.5
  const pz = d.z + fz * 0.5
  return {
    ...d, key: t.id + '-' + d.id, table: t, n: 0, fx, fz, rx, rz,
    plate: [px, top + 0.015, pz],
    glass: [px + fx * 0.12 + rx * 0.24, top, pz + fz * 0.12 + rz * 0.24],
    state: 'free', by: null, push: 0, pushNow: 0, booster: false,
  }
}

function createWorld() {
  const tables = CFG.tables.map((d) => {
    const t = { ...d, party: null, freeSince: -30 }
    t.seats = d.seats.map((sd) => mkSeat(t, sd))
    return t
  })
  const seats = tables.flatMap((t) => t.seats)
  seats.forEach((st, n) => (st.n = n))
  const [px, pz] = RC.post
  const w = {
    time: 0, dt: 0, snap: true, snapFrames: 2, hidden: false, calm: false,
    host: { ...mkActor(0), x: px, z: pz, visible: true, atDesk: true, phase: 0.4 },
    waiters: CFG.waiters.homes.map(([x, z], i) => ({
      ...mkActor(100 + i), x, z, visible: true, home: [x, z], phase: i * 1.3,
      busy: false, tray: false, cloth: false, look: null, slots: [],
    })),
    guests: Array.from({ length: POOL }, (_, i) => mkGuest(i)),
    tables, seats,
    plates: seats.map(() => ({ visible: false, x: 0, y: 0, z: 0, rot: 0, scale: 1, left: 1, holder: null, carrier: null })),
    glasses: seats.map((st) => ({ x: st.glass[0], y: st.glass[1], z: st.glass[2], home: st.glass, fill: CFG.water, holder: null, blend: 0 })),
    reception: { busy: false },
    extras: [],  // bija scripts na manas (BarStory, PrivateDiningStory): aa loko emne rasto aape
    all: [],
    jobs: [], orders: [], toClear: [],
    nextAt: T.start, partyN: 0, lastDish: -1,
    setLooks: null, setKinds: null,
  }
  WORLD = w
  return w
}

/* ---------- Walking along waypoints ---------- */
// Narrow passages (one person wide): the waiters' gaps between the back-row tables and the aisles
// beside the long table, from the lane at one end to the lane at the other. Nobody steps in off the
// lane while someone inside is coming the other way, and whoever is inside keeps going.
const NARROW = [
  ...L.gaps.map((x) => [x, L.north + 0.08, L.out - 0.05]),
  ...L.aisles.map((x) => [x, L.in + 0.05, L.south - 0.05]),
]
const narrowAt = (x, z) => NARROW.find(([cx, z0, z1]) => Math.abs(x - cx) < 0.3 && z > z0 && z < z1)

// Koi ubho hoy to badha ne rokshe. Be chaltavala mathi je "pehla" (pri ochhi) te jashe, bijo rah jove.
// Someone standing still (serving, showing the way) only stops you if you would walk into them.
// The one giving way waits before stepping into the other's path; the one with right of way still
// follows behind anyone just ahead going the same way.
const blockedBy = (w, a, nx, nz) => {
  const sx = nx - a.x
  const sz = nz - a.z
  const into = narrowAt(nx, nz)
  const inside = narrowAt(a.x, a.z)
  const entering = into && inside !== into
  for (const o of w.all) {
    if (o === a || !o.visible || o.sit) continue
    if (a.group && a.group === o.group) continue
    const moving = o.anim === 'walk' || o.yielding
    const there = narrowAt(o.x, o.z)
    if (entering && there === into && (!moving || Math.cos(o.rot - a.rot) < 0)) return true
    const dNew = Math.hypot(nx - o.x, nz - o.z)
    const dCur = Math.hypot(a.x - o.x, a.z - o.z)
    // In a passage, someone waiting outside it is waiting for us
    if (inside && o.yielding && there !== inside) {
      if (dNew < STILL_GAP && dNew < dCur) return true
      continue
    }
    if (!moving) {
      if (dNew < STILL_GAP && dNew < dCur) return true
      continue
    }
    if (o.pri > a.pri) {
      // They give way to us, unless they are just ahead going our way: then we follow
      const ahead = (o.x - a.x) * sx + (o.z - a.z) * sz > 0
      if (ahead && Math.cos(o.rot - a.rot) > 0.5 && dNew < YIELD_GAP && dNew < dCur) return true
      continue
    }
    // We give way: while they are close, and before stepping into the path just ahead of them
    if (dNew < YIELD_GAP && dNew < dCur) return true
    if (o.anim === 'walk') {
      const fx = Math.sin(o.rot)
      const fz = Math.cos(o.rot)
      const toPath = (x, z) => {
        const k = clamp((x - o.x) * fx + (z - o.z) * fz, 0, LOOK_AHEAD)
        return Math.hypot(x - o.x - fx * k, z - o.z - fz * k)
      }
      // (already in their path: carry on across rather than stop in front of them)
      const pNew = toPath(nx, nz)
      const pCur = toPath(a.x, a.z)
      if (pNew < PATH_GAP && pNew < pCur - 1e-4 && pCur > 0.2) return true
    }
  }
  return false
}

const arrive = (a, face) => {
  a.anim = 'idle'
  a.yielding = false
  a.waitT = 0
  if (face !== null) a.rot = face
  return true
}
const walkPath = (w, a, pts, speed = CFG.speed, face = null) => {
  let i = 0
  return (dt) => {
    while (i < pts.length && Math.hypot(pts[i][0] - a.x, pts[i][1] - a.z) < 1e-3) i++
    if (i >= pts.length) return arrive(a, face)
    const [x, z] = pts[i]
    const dx = x - a.x
    const dz = z - a.z
    const d = Math.hypot(dx, dz)
    const step = speed * dt
    const nx = d <= step ? x : a.x + (dx / d) * step
    const nz = d <= step ? z : a.z + (dz / d) * step
    a.rot = Math.atan2(dx, dz)
    if (a.ghost > 0) a.ghost -= dt
    else if (blockedBy(w, a, nx, nz)) {
      a.waitT += dt
      a.anim = 'idle'
      a.yielding = true
      a.amp = Math.max(0, a.amp - dt * 6)
      // Two people waiting for each other: the one waiting slips past
      if (a.waitT > 6) {
        a.ghost = 1.2
        a.waitT = 0
      }
      return false
    }
    a.waitT = 0
    a.yielding = false
    a.stride += Math.hypot(nx - a.x, nz - a.z) * CFG.stride
    a.x = nx
    a.z = nz
    a.anim = 'walk'
    a.amp = Math.min(1, a.amp + dt * 6)
    if (d <= step) i++
    return i >= pts.length ? arrive(a, face) : false
  }
}

/* ---------- Safety net: be loko ek bija ma ghuse nahi ---------- */
const separate = (w, dt) => {
  const all = w.all
  const k = Math.min(1, dt * 10)
  for (let i = 0; i < all.length; i++) {
    const a = all[i]
    if (!a.visible) continue
    for (let j = i + 1; j < all.length; j++) {
      const b = all[j]
      if (!b.visible || (a.sit && b.sit)) continue
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
      const wa = a.sit || a.hip != null ? 0 : b.sit ? 1 : 0.5
      const wb = b.sit || b.hip != null ? 0 : a.sit ? 1 : 0.5
      a.x += (nx - nz * 0.6) * push * wa
      a.z += (nz + nx * 0.6) * push * wa
      b.x -= (nx - nz * 0.6) * push * wb
      b.z -= (nz + nx * 0.6) * push * wb
    }
  }
}

/* ---------- Parties ---------- */
const skinTone = () => Math.floor(Math.random() * SKIN.length)
// Half boys, half girls (one more of either when odd), in random order
const mixed = (n) => {
  const first = Math.random() < 0.5 ? 'boy' : 'girl'
  const other = first === 'boy' ? 'girl' : 'boy'
  return shuffle(Array.from({ length: n }, (_, i) => (i % 2 ? other : first)))
}

// Who comes (a party type that comes in a size in range), how many, what they wear,
// and which chair each one takes
function planParty(table, [lo, hi]) {
  const types = Object.entries(CFG.parties).filter(([, p]) => p.size[0] <= hi && p.size[1] >= lo)
  const [type, def] = weighted(types, ([, p]) => p.weight)
  const size = randInt([Math.max(lo, def.size[0]), Math.min(hi, def.size[1])])
  const o = CFG.outfits
  let kids = 0
  let elders = 0
  if (def.kids) {
    kids = clamp(randInt(def.kids), 1, size - 2)
    elders = Math.min(2, size - 2 - kids)
    kids = size - 2 - elders
  }
  const adults = size - kids - elders
  const office = def.style === 'office'
  const shirts = shuffle(office ? o.office : def.style === 'date' ? o.date : o.casual)
  const elderShirts = shuffle(o.elders)
  const kidShirts = shuffle(o.kids)
  const genders = mixed(adults)
  const elderG = mixed(elders)
  const members = []
  for (let k = 0; k < adults; k++) {
    const gender = genders[k]
    members.push({
      kid: false, size: randIn(CFG.sizes.adult),
      look: {
        gender, shirt: shirts[k % shirts.length], hair: pick(o.hair), pants: pick(office ? o.officePants : o.pants), skin: skinTone(),
        tie: office && gender === 'boy' && Math.random() < 0.75 ? pick(o.ties) : null,
      },
    })
  }
  for (let k = 0; k < elders; k++) {
    members.push({
      kid: false, size: randIn(CFG.sizes.elder),
      look: { gender: elderG[k], shirt: elderShirts[k], hair: pick(o.elderHair), pants: pick(o.pants), skin: skinTone() },
    })
  }
  for (let k = 0; k < kids; k++) {
    // Kids take after one of the parents (hair and skin)
    const parent = members[k % adults].look
    members.push({
      kid: true, size: randIn(CFG.sizes.kid),
      look: { gender: Math.random() < 0.5 ? 'boy' : 'girl', shirt: kidShirts[k], hair: parent.hair, pants: pick(o.pants), skin: parent.skin },
    })
  }
  // A grown-up walks in first and checks in; whoever walks in first takes the chair furthest in,
  // so nobody has to squeeze past someone sitting down
  const order = [members[0], ...shuffle(members.slice(1))]
  const seats = pick(table.fill)
    .slice(0, size)
    .map((id) => table.seats.find((st) => st.id === id))
    .sort((a, b) => pathLen(routeIn(0, b)) - pathLen(routeIn(0, a)))
  order.forEach((m, k) => (m.seat = seats[k]))
  return { type, members: order }
}

function pickDish(w) {
  const n = CFG.dishes.length
  let i = Math.floor(Math.random() * (w.lastDish < 0 ? n : n - 1))
  if (w.lastDish >= 0 && i >= w.lastDish) i++
  w.lastDish = i
  return CFG.dishes[i]
}

const mkParty = (w, table, type) => ({ id: 'p' + ++w.partyN, type, table, members: [], go: null, leaveAt: null })

function startParty(w, table, plan) {
  const party = mkParty(w, table, plan.type)
  const looks = []
  for (const m of plan.members) {
    const slot = w.guests.findIndex((c) => !c.busy)
    const c = w.guests[slot]
    Object.assign(m.seat, { state: 'reserved', by: c, booster: m.kid })
    Object.assign(c, {
      busy: true, step: 'pending', party, seat: m.seat, size: m.size, kid: m.kid, served: false, away: false, group: party.id,
      visible: false, sit: false, hip: null, anim: 'idle', yielding: false, waitT: 0, ghost: 0, amp: 0,
      act: 'idle', actT: 0, actAge: 0, focus: null, lastSip: -9,
    })
    looks.push([slot, m.look])
    party.members.push(c)
  }
  w.setLooks?.(looks)
  Object.assign(table, { state: 'reserved', party })
  w.reception.busy = true
  party.members.forEach((c, k) => w.jobs.push(guestScript(w, c, k)))
  w.jobs.push(partyScript(w, party, true))
}

// The parties already eating when the page opens: each gets its own remaining stay,
// so the tables free up at different moments
function seatInitial(w) {
  const stays = shuffle(T.firstStays.map((v) => v + rand(0, 4)))
  const looks = []
  const kinds = []
  let slot = 0
  const parties = shuffle(w.tables)
    .slice(0, CFG.occupancy.atStart)
    .map((table, n) => {
      const plan = planParty(table, CFG.fits[table.capacity])
      const party = mkParty(w, table, plan.type)
      party.go = 0
      for (const m of plan.members) {
        const c = w.guests[slot]
        const seat = m.seat
        const hip = (m.kid ? CFG.heights.booster : CFG.heights.chair) + 0.05 * m.size
        Object.assign(seat, { state: 'occupied', by: c, booster: m.kid, push: CFG.tuck, pushNow: CFG.tuck })
        Object.assign(c, {
          busy: true, step: 'seated', party, seat, size: m.size, kid: m.kid, served: true, away: false, group: party.id,
          visible: true, x: seat.x, z: seat.z, rot: seat.rot, sit: true, hip, y: hip - 0.05 * m.size,
          anim: 'idle', act: 'idle', actT: rand(0.3, 2), actAge: 0, lastSip: -9, focus: null, amp: 0,
        })
        const [x, y, z] = seat.plate
        Object.assign(w.plates[seat.n], { visible: true, left: rand(0.3, 0.85), holder: null, carrier: null, scale: 1, x, y, z, rot: seat.rot })
        w.glasses[seat.n].fill = rand(0.3, CFG.water)
        looks.push([slot, m.look])
        kinds.push([seat.n, pickDish(w)])
        party.members.push(c)
        slot++
      }
      Object.assign(table, { state: 'occupied', party })
      planMeal(w, party, stays[n % stays.length])
      return party
    })
  w.setLooks?.(looks)
  w.setKinds?.(kinds)
  return parties
}

// One party at the desk at a time. Below occupancy.min tables in use the next one comes quickly,
// at occupancy.max nobody new comes in. Each table is picked in turn (longer empty = likelier).
const spawner = (w) => () => {
  if (w.reception.busy || w.time < w.nextAt) return false
  const busy = w.tables.filter((t) => t.state !== 'free').length
  if (busy >= CFG.occupancy.max) return false
  const free = w.tables.filter((t) => t.state === 'free')
  if (!free.length) return false
  const table = weighted(free, (t) => 1 + Math.max(0, w.time - t.freeSince) / 15)
  let range = CFG.fits[table.capacity]
  // A smaller party at this table: only when every table of its own size is taken
  const smaller = Object.keys(CFG.fits)
    .map(Number)
    .filter((cap) => cap < table.capacity && !w.tables.some((o) => o.capacity === cap && o.state === 'free'))
  if (smaller.length && Math.random() < CFG.upsize) range = CFG.fits[pick(smaller)]
  if (w.guests.filter((c) => !c.busy).length < range[1]) return false
  startParty(w, table, planParty(table, range))
  w.nextAt = w.time + randIn(busy + 1 < CFG.occupancy.min ? T.rush : T.gap)
  return false
}

/* ---------- Guests ---------- */
// Sit down (or stand up), about 400 ms: the hip moves on a small arc, the legs switch pose halfway
const sitMove = (c, seat, down) => {
  const [px, pz] = seat.stand
  const standHip = 0.1 + 0.5 * c.size
  const sitHip = (c.kid ? CFG.heights.booster : CFG.heights.chair) + 0.05 * c.size
  return tween(T.sit, (p) => {
    const k = down ? smooth(p) : 1 - smooth(p)
    c.x = px + (seat.x - px) * k
    c.z = pz + (seat.z - pz) * k
    c.sit = k > 0.5
    c.hip = standHip + (sitHip - standHip) * k + Math.sin(PI * p) * 0.12
  }, linear)
}

// What a seated guest does now (a glass being sipped goes back down first)
function setAct(w, c, act, dur, focus = null) {
  const g = w.glasses[c.seat.n]
  if (g.holder === c && act !== 'sip') g.holder = null
  Object.assign(c, { act, actT: dur, actAge: 0, focus })
  if (act === 'sip') {
    c.lastSip = w.time
    g.holder = c
    g.blend = 0
  }
}

// Small things people do while seated, picked at random
function nextAct(w, c) {
  const mates = c.party.members.filter((m) => m !== c && m.sit)
  const chat = mates.length ? 1 : 0.15
  const opts = [
    ['idle', 1, 1.2, 2.4], ['look', 1.3, 1.2, 2.6], ['nod', 0.6, 1, 1.5],
    ['talk', 2.6 * chat, 2, 4], ['laugh', 1.2 * chat, 1.2, 1.8],
  ]
  if (c.served && w.plates[c.seat.n].left > CFG.crumbs + 0.04) opts.push(['eat', c.kid ? 3.5 : 5, 2, 4])
  if (w.glasses[c.seat.n].fill > 0.15 && w.time - c.lastSip > 3.5) opts.push(['sip', 1.3, 1.8, 2.3])
  if (c.kid) opts.push(['swing', 2, 2, 4], ['wave', 1.2, 1.5, 2.6])
  const [act, , d0, d1] = weighted(opts.filter((o) => o[0] !== c.act || o[0] === 'eat'), (o) => o[1])
  // Eating goes on for a whole number of forkfuls, so the hand ends back at the plate.
  // Talking and laughing are to someone at the table.
  const to = (act === 'talk' || act === 'laugh') && mates.length ? pick(mates) : null
  setAct(w, c, act, act === 'eat' ? T.bite * Math.round(rand(d0, d1)) : rand(d0, d1), to)
  c.lookYaw = rand(-0.7, 0.7)
}

// Seated until the party's meal is over
const seatedLife = (w, c) => (dt) => {
  const p = c.party
  if (p.leaveAt != null && w.time >= p.leaveAt) return true
  const age = c.actAge
  c.actT -= dt
  c.actAge += dt
  const g = w.glasses[c.seat.n]
  if (c.act === 'sip') {
    if (c.actAge < 1.2) g.fill = Math.max(0.1, g.fill - dt * 0.05)
    else if (g.holder === c) g.holder = null
  }
  if (c.act === 'eat') {
    // A bite each time the fork reaches the mouth (62% through a forkful)
    const pl = w.plates[c.seat.n]
    if (Math.floor(c.actAge / T.bite + 0.38) > Math.floor(age / T.bite + 0.38)) pl.left = Math.max(CFG.crumbs, pl.left - c.bite)
    if (pl.left <= CFG.crumbs) c.actT = Math.min(c.actT, T.bite - (c.actAge % T.bite))
  }
  if (c.actT <= 0) nextAct(w, c)
  return false
}

// Food is shared out in bites so a plate is mostly finished by the time the party gets up
function planMeal(w, party, stay) {
  party.leaveAt = w.time + stay
  const bites = Math.max(4, Math.round((stay * CFG.eatShare) / T.bite))
  for (const c of party.members) c.bite = Math.max(0.02, (w.plates[c.seat.n].left - CFG.crumbs) / bites)
}

function served(w, c) {
  c.served = true
  // Bite size for an average stay until the whole party is served (planMeal then sets the real one)
  c.bite = (1 - CFG.crumbs) / Math.max(4, Math.round((((T.stay[0] + T.stay[1]) / 2) * CFG.eatShare) / T.bite))
  setAct(w, c, 'nod', 1.2) // thank you
}

// Every so often someone tells a story and the whole table laughs
const groupLife = (w, party) => {
  let next = rand(3, 6)
  return (dt) => {
    if (party.leaveAt == null || w.time >= party.leaveAt - 3) return true
    if ((next -= dt) > 0) return false
    next = randIn(T.moment)
    const sat = party.members.filter((c) => c.step === 'seated' && c.sit)
    if (sat.length < 2) return false
    const grown = sat.filter((c) => !c.kid)
    const teller = pick(grown.length ? grown : sat)
    for (const c of sat) setAct(w, c, c === teller ? 'talk' : 'idle', 1.8, c === teller ? pick(sat.filter((m) => m !== c)) : teller)
    w.jobs.push(
      seq(
        wait(1.8),
        call(() => {
          if (w.time >= party.leaveAt) return
          for (const c of sat) if (c.step === 'seated' && c.sit) setAct(w, c, 'laugh', rand(1.2, 1.8))
        })
      )
    )
    return false
  }
}

const leave = (w, c) => {
  const seat = c.seat
  return seq(
    call(() => {
      setAct(w, c, 'idle', 99)
      // The one nearest the way out gets up first
      c.order = c.party.members
        .slice()
        .sort((a, b) => pathLen(routeOut(a.seat)) - pathLen(routeOut(b.seat)))
        .indexOf(c)
    }),
    lazy(() => wait(c.order * T.follow)),
    call(() => {
      c.step = 'leave'
      seat.push = 1
    }),
    sitMove(c, seat, false),
    call(() => {
      c.sit = false
      c.hip = null
      c.served = false
      seat.by = null
      w.jobs.push(seq(wait(T.chairBack), call(() => { seat.push = 0 })))
    }),
    lazy(() => {
      const r = routeOut(seat)
      return seq(walkPath(w, c, r.slice(0, 1)), call(() => { c.away = true }), walkPath(w, c, r.slice(1)))
    }),
    call(() => Object.assign(c, { visible: false, busy: false, step: 'gone', party: null, group: null, anim: 'idle' }))
  )
}

function guestScript(w, c, k) {
  const party = c.party
  const seat = c.seat
  return seq(
    wait(k * T.follow),
    call(() => {
      const [x, z] = RC.enter[k % 2]
      Object.assign(c, { x, z, y: floorY(x, z), rot: PI, visible: true, step: 'enter' })
    }),
    walkPath(w, c, [lineSpot(k)], CFG.speed, PI),
    call(() => { c.step = 'line' }),
    until(() => party.go != null && w.time >= party.go + k * T.follow),
    call(() => { c.step = 'walk' }),
    walkPath(w, c, routeIn(k, seat)),
    call(() => {
      c.rot = seat.rot
      seat.push = 1 // pull the chair out
    }),
    wait(0.25),
    sitMove(c, seat, true),
    call(() => {
      seat.state = 'occupied'
      seat.push = CFG.tuck
      Object.assign(c, { step: 'seated', act: 'idle', actT: rand(0.6, 1.4), actAge: 0 })
    }),
    seatedLife(w, c),
    leave(w, c)
  )
}

// Receptionist: walks ahead of the party into the hall, steps aside (clear of both lanes) and points
// them to their table, then back to the desk
function hostLead(w, party) {
  const h = w.host
  const t = party.table
  const [sx] = RC.show
  return seq(
    walkPath(w, h, [[L.gateIn, RC.post[1]], GATE, [sx, L.in], RC.show]),
    call(() => {
      h.rot = faceTo(h, t.x, t.z)
      h.anim = 'show'
    }),
    wait(T.show),
    call(() => {
      h.anim = 'idle'
      w.reception.busy = false // the next party may walk up to the desk
    }),
    walkPath(w, h, [RC.post], CFG.speed, 0), // straight back along the front of the reception
    call(() => {
      h.atDesk = true
      h.group = null
    })
  )
}

// Check in, follow the receptionist, order once everyone sits, eat once everyone is served,
// and the table goes to a waiter to clear once they have got up
function partyScript(w, party, fresh) {
  const all = (f) => () => party.members.every(f)
  const lead = party.members[0]
  const h = w.host
  return seq(
    fresh
      ? seq(
        until(all((m) => m.step === 'line')),
        until(() => h.atDesk && h.anim !== 'walk'),
        call(() => {
          h.rot = 0
          h.anim = 'talk'
          h.group = party.id
        }),
        wait(T.greet[0]),
        call(() => {
          h.anim = 'idle'
          lead.act = 'talk'
        }),
        wait(T.greet[1]),
        call(() => {
          lead.act = 'idle'
          h.anim = 'talk'
        }),
        wait(T.greet[2]),
        call(() => {
          h.anim = 'idle'
          h.atDesk = false
          party.go = w.time + 0.4
        }),
        par(
          hostLead(w, party),
          seq(
            until(all((m) => m.step === 'seated')),
            call(() => { party.table.state = 'occupied' }),
            wait(0.6),
            call(() => setAct(w, lead, 'order', 1.6)),
            wait(0.8),
            call(() => w.orders.push(party)),
            until(all((m) => m.served)),
            call(() => {
              planMeal(w, party, randIn(T.stay))
              w.jobs.push(groupLife(w, party))
            })
          )
        )
      )
      : seq(),
    until(all((m) => m.away)),
    call(() => w.toClear.push({ table: party.table, at: w.time + T.clearDelay }))
  )
}

/* ---------- Waiters ---------- */
const v = new THREE.Vector3()
const wGo = (w, wt, to, face = null) => lazy(() => walkPath(w, wt, hallRoute([wt.x, wt.z], to), CFG.speed, face))
// Nearest place first; places served from the same spot come one after the other
const byService = (wt, seats) => {
  const len = new Map(seats.map((st) => [st, pathLen([wt.home, ...hallRoute(wt.home, st.serve)])]))
  return seats.slice().sort((a, b) => len.get(a) - len.get(b) || a.serve[0] - b.serve[0] || a.serve[1] - b.serve[1] || a.key.localeCompare(b.key))
}

// A plate moves from the tray to the table (or back) in a small arc
function movePlate(p, to, scale, rot, slot, carrier) {
  return lazy(() => {
    const from = [p.x, p.y, p.z]
    const s0 = p.scale
    const r0 = p.rot
    p.holder = null
    p.carrier = null
    return seq(
      tween(T.place, (k) => {
        p.x = from[0] + (to[0] - from[0]) * k
        p.y = from[1] + (to[1] - from[1]) * k + Math.sin(PI * k) * 0.12
        p.z = from[2] + (to[2] - from[2]) * k
        p.scale = s0 + (scale - s0) * k
        p.rot = r0 + wrap(rot - r0) * k
      }),
      call(() => {
        p.holder = slot
        p.carrier = carrier
      })
    )
  })
}

// Take the order, then a tray-load at a time from the kitchen pass (a tray holds four plates,
// so the long table takes two trips), a plate at every place, a small bow and back
function serveParty(w, wt, party) {
  const seats = byService(wt, party.members.map((m) => m.seat))
  const first = seats[0]
  const lead = party.members[0]
  const t = party.table
  return seq(
    wGo(w, wt, first.serve),
    call(() => {
      wt.rot = faceTo(wt, t.x, t.z)
      wt.pose = 'write'
      wt.look = lead
      for (const c of party.members) if (c.sit) setAct(w, c, c === lead ? 'talk' : 'look', T.order, wt)
    }),
    wait(T.order),
    call(() => {
      wt.pose = 'nod'
      if (lead.sit) setAct(w, lead, 'nod', 1)
    }),
    wait(0.5),
    call(() => {
      wt.pose = 'idle'
      wt.look = null
    }),
    ...chunk(seats, SLOTS).map((trip) =>
      seq(
        wGo(w, wt, wt.home, PI),
        call(() => {
          wt.rot = PI
          wt.pose = 'reach'
        }),
        wait(T.pickup * 0.6),
        call(() => {
          const kinds = []
          trip.forEach((st, k) => {
            Object.assign(w.plates[st.n], { visible: true, left: 1, holder: wt.slots[k], carrier: wt, scale: TRAY_SCALE })
            kinds.push([st.n, pickDish(w)])
          })
          w.setKinds?.(kinds)
          wt.tray = true
        }),
        wait(T.pickup * 0.4),
        call(() => { wt.pose = 'carry' }),
        ...trip.map((st) =>
          seq(
            lazy(() => (atSpot(wt, st.serve) ? seq() : wGo(w, wt, st.serve))),
            call(() => {
              wt.rot = faceTo(wt, st.plate[0], st.plate[2])
              wt.pose = 'serve'
              wt.look = st.by
            }),
            wait(0.2),
            movePlate(w.plates[st.n], st.plate, 1, st.rot, null, null),
            call(() => {
              if (st.by) served(w, st.by)
              wt.pose = 'nod'
            }),
            wait(0.35),
            call(() => { wt.pose = 'carry' })
          )
        ),
        call(() => {
          wt.tray = false
          wt.pose = 'idle'
          wt.look = null
        })
      )
    ),
    call(() => {
      wt.rot = faceTo(wt, t.x, t.z)
      wt.pose = 'bow'
    }),
    wait(T.bow),
    call(() => { wt.pose = 'idle' }),
    wGo(w, wt, wt.home, 0),
    call(() => { wt.busy = false })
  )
}

// After the party has got up: plates onto the tray a place at a time, a wipe at every place,
// the load back to the pass (more trips if needed), then the table is free again
function clearTable(w, wt, table) {
  const seats = byService(wt, table.seats.filter((st) => w.plates[st.n].visible))
  return seq(
    ...chunk(seats, SLOTS).map((trip) =>
      seq(
        ...trip.map((st, k) =>
          seq(
            lazy(() => (atSpot(wt, st.serve) ? seq() : wGo(w, wt, st.serve))),
            call(() => {
              wt.rot = faceTo(wt, st.plate[0], st.plate[2])
              wt.pose = 'serve'
              wt.tray = true
            }),
            wait(0.25),
            lazy(() => {
              wt.slots[k].getWorldPosition(v)
              return movePlate(w.plates[st.n], [v.x, v.y, v.z], TRAY_SCALE, wt.rot, wt.slots[k], wt)
            }),
            call(() => {
              wt.pose = 'wipe'
              wt.cloth = true
            }),
            wait(T.wipe),
            call(() => {
              wt.cloth = false
              wt.pose = 'carry'
              w.glasses[st.n].fill = CFG.water // and a fresh glass of water
            })
          )
        ),
        wGo(w, wt, wt.home, PI),
        call(() => {
          wt.rot = PI
          wt.pose = 'reach'
        }),
        wait(0.6),
        call(() => {
          for (const st of trip) Object.assign(w.plates[st.n], { visible: false, holder: null, carrier: null })
          wt.tray = false
          wt.pose = 'idle'
        })
      )
    ),
    call(() => {
      for (const st of table.seats) Object.assign(st, { state: 'free', by: null, booster: false })
      Object.assign(table, { state: 'free', party: null, freeSince: w.time })
    }),
    wait(0.3),
    call(() => {
      wt.rot = 0
      wt.busy = false
    })
  )
}

const nearestFree = (w, [x, z]) => {
  let best = null
  let bd = Infinity
  for (const wt of w.waiters) {
    if (wt.busy) continue
    const d = Math.hypot(wt.x - x, wt.z - z)
    if (d < bd) {
      bd = d
      best = wt
    }
  }
  return best
}

// Orders first, then tables to clear, each to the nearest free waiter; the rest stand by at the pass
const staffLoop = (w) => () => {
  while (w.orders.length) {
    const party = w.orders[0]
    const wt = nearestFree(w, party.members[0].seat.serve)
    if (!wt) break
    w.orders.shift()
    wt.busy = true
    w.jobs.push(serveParty(w, wt, party))
  }
  for (let i = 0; i < w.toClear.length; i++) {
    const job = w.toClear[i]
    if (w.time < job.at) continue
    const wt = nearestFree(w, job.table.seats[0].serve)
    if (!wt) break
    w.toClear.splice(i--, 1)
    wt.busy = true
    w.jobs.push(clearTable(w, wt, job.table))
  }
  for (const wt of w.waiters) {
    if (wt.busy) continue
    if (!atSpot(wt, wt.home)) {
      wt.busy = true
      w.jobs.push(seq(wGo(w, wt, wt.home, 0), call(() => { wt.busy = false })))
    } else if (wt.anim !== 'walk') {
      wt.rot = 0
      wt.pose = 'idle'
      wt.look = null
    }
  }
  return false
}

/* ---------- Live / reduced-motion modes ---------- */
function setMode(w, calm) {
  w.calm = calm
  w.jobs = []
  w.orders = []
  w.toClear = []
  w.reception.busy = false
  for (const t of w.tables) Object.assign(t, { state: 'free', party: null, freeSince: w.time - 30 })
  for (const st of w.seats) Object.assign(st, { state: 'free', by: null, push: 0, pushNow: 0, booster: false })
  w.guests.forEach((c) =>
    Object.assign(c, {
      visible: false, busy: false, step: 'gone', party: null, seat: null, sit: false, hip: null,
      anim: 'idle', yielding: false, amp: 0, group: null, focus: null,
    })
  )
  w.plates.forEach((p) => Object.assign(p, { visible: false, holder: null, carrier: null }))
  w.glasses.forEach((g) => Object.assign(g, { holder: null, fill: CFG.water, x: g.home[0], y: g.home[1], z: g.home[2] }))
  const [px, pz] = RC.post
  Object.assign(w.host, { x: px, z: pz, rot: 0, anim: 'idle', pose: 'idle', atDesk: true, group: null, yielding: false, amp: 0 })
  w.waiters.forEach((wt) =>
    Object.assign(wt, {
      x: wt.home[0], z: wt.home[1], rot: 0, anim: 'idle', pose: 'idle', busy: false, tray: false, cloth: false, look: null,
      yielding: false, amp: 0,
    })
  )
  w.lastDish = -1
  w.snapFrames = 2

  const parties = seatInitial(w)
  // Reduced motion: the room stays as it is, nobody walks
  if (calm) return
  for (const party of parties) {
    party.members.forEach((c) => w.jobs.push(seq(seatedLife(w, c), leave(w, c))))
    w.jobs.push(partyScript(w, party, false), groupLife(w, party))
  }
  w.nextAt = w.time + T.start
  w.jobs.push(spawner(w), staffLoop(w))
}

/* ---------- 3D: shared shapes ---------- */
const G = {
  cyl: new THREE.CylinderGeometry(1, 1, 1, 16),
  base: new THREE.CylinderGeometry(1, 1, 1, 14).translate(0, 0.5, 0),
  ball: new THREE.SphereGeometry(1, 12, 10),
  box: new THREE.BoxGeometry(1, 1, 1),
}

function M({ geo, pos, rot, scale, color, rough = 0.7, shadow = true, ...mat }) {
  return (
    <mesh geometry={geo} position={pos} rotation={rot} scale={scale} castShadow={shadow}>
      <meshStandardMaterial color={color} roughness={rough} {...mat} />
    </mesh>
  )
}

const turn = (obj, target, k) => {
  obj.rotation.y += Math.atan2(Math.sin(target - obj.rotation.y), Math.cos(target - obj.rotation.y)) * k
}

/* ---------- Tables (same cream tops on a wooden pedestal as before) ---------- */
function Table({ t }) {
  const [sx, sz] = t.size
  if (t.shape === 'round') {
    return (
      <group position={[t.x, 0.1, t.z]}>
        <mesh position={[0, 0.35, 0]} castShadow>
          <cylinderGeometry args={[0.1, 0.18, 0.7, 12]} />
          <meshStandardMaterial color={C.wood} />
        </mesh>
        <mesh position={[0, 0.75, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[sx / 2, sx / 2, 0.1, 24]} />
          <meshStandardMaterial color={C.cream} />
        </mesh>
      </group>
    )
  }
  // Square and long tables: one or two pedestals; the long one has a runner down the middle
  const feet = t.shape === 'long' ? [-sx * 0.28, sx * 0.28] : [0]
  return (
    <group position={[t.x, 0.1, t.z]}>
      {feet.map((dx) => (
        <group key={dx} position={[dx, 0, 0]}>
          <mesh position={[0, 0.35, 0]} castShadow>
            <cylinderGeometry args={[0.1, 0.18, 0.7, 12]} />
            <meshStandardMaterial color={C.wood} />
          </mesh>
          <mesh position={[0, 0.02, 0]} receiveShadow>
            <cylinderGeometry args={[0.3, 0.3, 0.04, 16]} />
            <meshStandardMaterial color={C.wood} />
          </mesh>
        </group>
      ))}
      <mesh position={[0, 0.75, 0]} castShadow receiveShadow>
        <boxGeometry args={[sx, 0.1, sz]} />
        <meshStandardMaterial color={C.cream} />
      </mesh>
      {t.shape === 'long' && (
        <mesh position={[0, 0.802, 0]} receiveShadow>
          <boxGeometry args={[sx - 0.3, 0.004, 0.34]} />
          <meshStandardMaterial color={C.terra} />
        </mesh>
      )}
    </group>
  )
}

/* ---------- Instanced parts: one draw call for every chair seat, every knife... ---------- */
const UP = new THREE.Vector3(0, 1, 0)
const NO_TURN = new THREE.Quaternion()
const _m = new THREE.Matrix4()
const _part = new THREE.Matrix4()
const _q = new THREE.Quaternion()
const _p = new THREE.Vector3()
const _s = new THREE.Vector3()
// Instance i of `mesh`: a part at local pos/scale on something standing at (x, y, z) turned by rot
function placePart(mesh, i, x, y, z, rot, pos, scale) {
  _m.compose(_p.set(x, y, z), _q.setFromAxisAngle(UP, rot), _s.set(1, 1, 1))
  _part.compose(_p.set(pos[0], pos[1], pos[2]), NO_TURN, _s.set(scale[0], scale[1], scale[2]))
  mesh.setMatrixAt(i, _m.multiply(_part))
}

function Parts({ count, color, rough = 0.7, shadow = false, meshRef, ...mat }) {
  return (
    <instancedMesh ref={meshRef} args={[G.box, undefined, count]} castShadow={shadow} frustumCulled={false}>
      <meshStandardMaterial color={color} roughness={rough} {...mat} />
    </instancedMesh>
  )
}

/* ---------- Chairs (slide back when someone sits down or gets up) ---------- */
// [local pos, size, colour]; the last is the cushion a child sits on (only shown then)
const CHAIR = [
  [[0, 0.4, 0], [0.45, 0.08, 0.45], C.terra],
  [[0, 0.65, -0.2], [0.45, 0.5, 0.06], C.terra],
  [[0, 0.2, 0], [0.08, 0.4, 0.08], C.wood],
  [[0, 0.49, 0.02], [0.36, 0.1, 0.34], C.cream],
]
const NONE = [0, 0, 0]

function Chairs({ w }) {
  const parts = useRef([])

  useFrame(() => {
    if (!w.dt && !w.snap) return
    const k = w.snap ? 1 : Math.min(1, w.dt * 6)
    w.seats.forEach((st, n) => {
      st.pushNow += (st.push - st.pushNow) * k
      const back = 0.1 + CFG.chairPull * st.pushNow
      const x = st.x - st.fx * back
      const z = st.z - st.fz * back
      CHAIR.forEach(([pos, size], j) => placePart(parts.current[j], n, x, 0.1, z, st.rot, pos, j === 3 && !st.booster ? NONE : size))
    })
    for (const m of parts.current) m.instanceMatrix.needsUpdate = true
  })

  return CHAIR.map(([, , color], j) => (
    <Parts key={j} count={w.seats.length} color={color} rough={j === 3 ? 0.95 : 0.7} shadow meshRef={(o) => (parts.current[j] = o)} />
  ))
}

/* ---------- Place settings: napkin + fork on one side, knife on the other ---------- */
const NAPKIN = [[-0.215, 0.003, 0], [0.09, 0.006, 0.16]]
const SILVER = [
  [[-0.215, 0.008, -0.01], [0.014, 0.004, 0.12]], // fork
  [[-0.215, 0.008, 0.06], [0.026, 0.004, 0.035]], // its tines
  [[0.2, 0.004, -0.03], [0.016, 0.004, 0.15]],    // knife
]

function PlaceSettings({ w }) {
  const napkins = useRef()
  const silver = useRef()
  useLayoutEffect(() => {
    w.seats.forEach((st, n) => {
      const [x, , z] = st.plate
      placePart(napkins.current, n, x, CFG.tableTop, z, st.rot, ...NAPKIN)
      SILVER.forEach(([pos, size], j) => placePart(silver.current, n * SILVER.length + j, x, CFG.tableTop, z, st.rot, pos, size))
    })
    napkins.current.instanceMatrix.needsUpdate = true
    silver.current.instanceMatrix.needsUpdate = true
  }, [w])
  return (
    <>
      <Parts count={w.seats.length} color={C.plate} meshRef={napkins} />
      <Parts count={w.seats.length * SILVER.length} color={C.silver} rough={0.3} meshRef={silver} />
    </>
  )
}

/* ---------- Centrepieces: a small flower and candles (warm glow at night) ---------- */
// Spots on each table top (local), clear of every plate and glass
const DECOR = {
  round: { candles: [[-0.06, 0.1]], flower: [0.06, -0.1] },
  square: { candles: [[-0.07, 0.06]], flower: [0.07, -0.06] },
  long: { candles: [[-0.32, 0], [0.32, 0]], flower: [0, 0] },
}

function Candle({ pos, night, flames, halos }) {
  return (
    <group position={pos}>
      <mesh geometry={G.base} scale={[0.04, 0.06, 0.04]} renderOrder={2}>
        <meshStandardMaterial color="#F3E7D0" transparent opacity={0.45} roughness={0.1} depthWrite={false} />
      </mesh>
      <M geo={G.base} pos={[0, 0.004, 0]} scale={[0.026, 0.07, 0.026]} color={C.cream} shadow={false} />
      <mesh ref={(o) => o && flames.push(o)} geometry={G.ball} position={[0, 0.092, 0]} scale={[0.012, 0.022, 0.012]}>
        <meshStandardMaterial color="#FFB35C" emissive="#FF9A2B" emissiveIntensity={night ? 3.2 : 1.2} />
      </mesh>
      <mesh ref={(o) => o && halos.push(o)} geometry={G.ball} position={[0, 0.09, 0]} scale={0.09} visible={night}>
        <meshBasicMaterial color="#FFB35C" transparent opacity={0.22} depthWrite={false} blending={THREE.AdditiveBlending} />
      </mesh>
    </group>
  )
}

function Flower({ pos, color }) {
  return (
    <group position={pos}>
      <M geo={G.base} scale={[0.028, 0.09, 0.028]} color={C.terra} rough={0.4} />
      <M geo={G.base} pos={[0, 0.09, 0]} scale={[0.004, 0.11, 0.004]} color={C.oliveDark} shadow={false} />
      <M geo={G.ball} pos={[0.02, 0.15, 0]} rot={[0, 0, -0.6]} scale={[0.024, 0.008, 0.012]} color={C.olive} shadow={false} />
      <M geo={G.ball} pos={[0, 0.215, 0]} scale={[0.034, 0.028, 0.034]} color={color} rough={0.5} />
      <M geo={G.ball} pos={[0, 0.235, 0]} scale={[0.012, 0.01, 0.012]} color={C.gold} shadow={false} />
    </group>
  )
}

function Furniture({ w, night }) {
  const flames = useRef([])
  const halos = useRef([])
  flames.current = []
  halos.current = []

  // Candle flames flicker (frozen while paused or with reduced motion)
  useFrame(() => {
    if (!w.dt) return
    flames.current.forEach((f, i) => {
      const q = 1 + Math.sin(w.time * 17 + i * 2.3) * 0.15 + Math.sin(w.time * 7.3 + i) * 0.08
      f.scale.set(0.012, 0.022 * q, 0.012)
    })
    halos.current.forEach((h, i) => h.scale.setScalar(0.09 * (1 + Math.sin(w.time * 11 + i * 1.7) * 0.06)))
  })

  return (
    <group>
      {w.tables.map((t, i) => {
        const d = DECOR[t.shape]
        return (
          <group key={t.id}>
            <Table t={t} />
            <group position={[t.x, CFG.tableTop + (t.shape === 'long' ? 0.004 : 0), t.z]}>
              {d.candles.map(([x, z]) => (
                <Candle key={x + '_' + z} pos={[x, 0, z]} night={night} flames={flames.current} halos={halos.current} />
              ))}
              <Flower pos={[d.flower[0], 0, d.flower[1]]} color={CFG.outfits.flowers[i % CFG.outfits.flowers.length]} />
            </group>
          </group>
        )
      })}
      <Chairs w={w} />
      <PlaceSettings w={w} />
    </group>
  )
}

/* ---------- Plate: the dish while there is food, an empty plate once it is eaten ---------- */
const PUFFS = [0, 1]

function PlateFood({ w, p, kind }) {
  const root = useRef()
  const full = useRef()
  const empty = useRef()
  const puffs = useRef([])

  useFrame(() => {
    const o = root.current
    if (!o) return
    o.visible = p.visible
    if (!p.visible || (!w.dt && !w.snap)) return
    if (p.holder) {
      // On the tray: ride along with the waiter's hand
      p.holder.getWorldPosition(v)
      p.x = v.x
      p.y = v.y
      p.z = v.z
      if (p.carrier?.obj) p.rot = p.carrier.obj.rotation.y
    }
    o.position.set(p.x, p.y, p.z)
    o.rotation.y = p.rot
    o.scale.setScalar(Math.max(0.001, p.scale))
    const done = p.left <= 0.2
    full.current.visible = !done
    empty.current.visible = done
    // Light steam over food that has just come out
    const warm = w.calm ? 0 : clamp((p.left - 0.55) / 0.3, 0, 1)
    PUFFS.forEach((i) => {
      const m = puffs.current[i]
      m.visible = warm > 0
      if (!warm) return
      const q = (w.time * 0.35 + i / 2) % 1
      m.position.set(Math.sin(w.time + i * 2) * 0.03, 0.08 + q * 0.4, 0)
      m.scale.setScalar(0.04 * (0.6 + q * 1.3))
      m.material.opacity = 0.4 * (1 - q) * warm
    })
  }, -0.5)

  return (
    <group ref={root} visible={false}>
      <group ref={full}>
        <Dish pos={[0, 0, 0]} kind={kind} />
      </group>
      <group ref={empty} visible={false}>
        <M geo={G.cyl} scale={[0.17, 0.03, 0.17]} color={C.plate} shadow={false} />
        <M geo={G.ball} pos={[0.05, 0.018, 0.03]} scale={[0.012, 0.006, 0.012]} color={C.gold} shadow={false} />
        <M geo={G.ball} pos={[-0.04, 0.018, -0.05]} scale={[0.01, 0.005, 0.01]} color={C.terra} shadow={false} />
        <M geo={G.box} pos={[0.02, 0.02, 0]} rot={[0, 0.6, 0]} scale={[0.014, 0.004, 0.2]} color={C.silver} rough={0.3} shadow={false} />
        <M geo={G.box} pos={[0.05, 0.022, 0]} rot={[0, 0.5, 0]} scale={[0.016, 0.004, 0.2]} color={C.silver} rough={0.3} shadow={false} />
      </group>
      {PUFFS.map((i) => (
        <mesh key={i} ref={(o) => (puffs.current[i] = o)} geometry={G.ball} visible={false}>
          <meshBasicMaterial color="#FFFFFF" transparent opacity={0} depthWrite={false} />
        </mesh>
      ))}
    </group>
  )
}

/* ---------- Water glasses: lifted to the mouth for a sip (all glasses in two draw calls) ---------- */
const ORIGIN = [0, 0, 0]
const SHELL = [0.032, 0.1, 0.032]
const WATER_AT = [0, 0.006, 0]
const water = [0.027, 0, 0.027]

function WaterGlasses({ w }) {
  const shells = useRef()
  const fills = useRef()

  useFrame(() => {
    if (!w.dt && !w.snap) return
    w.glasses.forEach((g, n) => {
      if (g.holder?.hand && g.holder.visible && g.holder.sit) {
        g.holder.hand.getWorldPosition(v)
        v.y -= 0.05
        g.blend = w.snap ? 1 : Math.min(1, g.blend + w.dt / 0.3)
        g.x += (v.x - g.x) * g.blend
        g.y += (v.y - g.y) * g.blend
        g.z += (v.z - g.z) * g.blend
      } else {
        const k = w.snap ? 1 : Math.min(1, w.dt * 9)
        g.x += (g.home[0] - g.x) * k
        g.y += (g.home[1] - g.y) * k
        g.z += (g.home[2] - g.z) * k
      }
      placePart(shells.current, n, g.x, g.y, g.z, 0, ORIGIN, SHELL)
      water[1] = Math.max(0.001, g.fill * 0.088)
      placePart(fills.current, n, g.x, g.y, g.z, 0, WATER_AT, water)
    })
    shells.current.instanceMatrix.needsUpdate = true
    fills.current.instanceMatrix.needsUpdate = true
  }, -0.5)

  return (
    <>
      <instancedMesh ref={shells} args={[G.base, undefined, w.glasses.length]} renderOrder={2} frustumCulled={false}>
        <meshStandardMaterial color="#EAF6F8" transparent opacity={0.35} roughness={0.08} depthWrite={false} />
      </instancedMesh>
      <instancedMesh ref={fills} args={[G.base, undefined, w.glasses.length]} frustumCulled={false}>
        <meshStandardMaterial color="#CFE8F0" transparent opacity={0.8} roughness={0.2} />
      </instancedMesh>
    </>
  )
}

/* ---------- Guest (adults and kids: kids are smaller, with a bigger head) ---------- */
function Tie({ color }) {
  return (
    <group position={[0, 0, 0]}>
      <M geo={G.box} pos={[0, 0.535, 0.088]} rot={[-0.35, 0, 0]} scale={[0.04, 0.035, 0.02]} color={color} shadow={false} />
      <M geo={G.box} pos={[0, 0.41, 0.122]} rot={[-0.12, 0, 0]} scale={[0.045, 0.2, 0.012]} color={color} shadow={false} />
    </group>
  )
}

function Diner({ w, d, look }) {
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
  const shinL = useRef()
  const shinR = useRef()

  useFrame(() => {
    const o = root.current
    if (!o) return
    o.visible = d.visible
    if (!d.visible || (!w.dt && !w.snap)) return
    const dt = w.dt
    const t = w.time + d.phase
    const k = w.snap ? 1 : Math.min(1, dt * 12)
    d.obj = o
    o.scale.setScalar(d.size)
    head.current.scale.setScalar(d.kid ? 1.2 : 1)

    if (d.hip != null) d.y = d.hip - (d.sit ? 0.05 : 0.5) * d.size
    else d.y += (floorY(d.x, d.z) - d.y) * (w.snap ? 1 : Math.min(1, dt * 14))
    // Shorter legs take quicker steps
    const sw = Math.sin(d.stride / d.size) * d.amp
    o.position.set(d.x, d.y + Math.abs(Math.sin(d.stride / d.size)) * BOB * d.amp * d.size, d.z)
    turn(o, d.rot, w.snap ? 1 : Math.min(1, dt * 10))

    legsStand.current.visible = !d.sit
    legsSit.current.visible = d.sit
    const act = d.act
    const shake = act === 'laugh' ? Math.abs(Math.sin(t * 13)) * 0.014 : 0
    const fo = d.focus?.visible ? d.focus : null
    upper.current.position.y = (d.sit ? 0.05 : 0.5) + shake
    upper.current.scale.y = 1 + Math.sin(t * 1.8) * 0.012

    let aL = -sw * 0.5 + Math.sin(t * 1.5) * 0.05 * (1 - d.amp)
    let aR = sw * 0.5 + Math.sin(t * 1.5 + 1) * 0.05 * (1 - d.amp)
    let zL = 0
    let zR = 0
    let hx = Math.sin(t * 0.9) * 0.04
    let swing = 0
    let fork = false
    if (d.sit) {
      aL = -1.2
      aR = -1.15
      if (act === 'order') {
        // Hand up for the waiter
        aL = -2.8 + Math.sin(t * 8) * 0.12
        zL = -0.2
      } else if (act === 'eat') {
        // Fork from the plate up to the mouth and back; eyes on the plate while scooping
        const u = (d.actAge % T.bite) / T.bite
        const lift = u < 0.35 || u > 0.9 ? 0 : Math.sin((PI * (u - 0.35)) / 0.55) ** 2
        aR = -1.0 - 1.2 * lift
        zR = -0.45 * lift
        aL = -1.1
        hx = 0.2 * (1 - lift)
        fork = true
      } else if (act === 'sip') {
        aR = -2.2
        zR = -0.55
        hx = -0.2
      } else if (act === 'talk') {
        aR = -1.5 + Math.sin(t * 3.2) * 0.35
        zR = -0.15
      } else if (act === 'laugh') {
        aL = -1.4 + Math.sin(t * 14) * 0.08
        hx = -0.22 + Math.sin(t * 14) * 0.07
      } else if (act === 'wave') {
        aR = -2.7
        zR = 0.3 + Math.sin(t * 9) * 0.35
      }
      if (d.kid) swing = act === 'swing' ? 0.55 : 0.12 // feet don't reach the floor
    } else if (act === 'talk') {
      // At the desk: the one checking in talks with their hands
      aR = -1.5 + Math.sin(t * 3.2) * 0.35
      zR = -0.15
    }
    armL.current.rotation.x += (aL - armL.current.rotation.x) * k
    armL.current.rotation.z += (zL - armL.current.rotation.z) * k
    armR.current.rotation.x += (aR - armR.current.rotation.x) * k
    armR.current.rotation.z += (zR - armR.current.rotation.z) * k
    if (d.fork) d.fork.visible = fork

    const lL = d.sit ? 0 : sw * 0.7
    legL.current.rotation.x += (lL - legL.current.rotation.x) * k
    legR.current.rotation.x += (-lL - legR.current.rotation.x) * k
    kneeL.current.rotation.x += (Math.max(0, lL) * 1.3 - kneeL.current.rotation.x) * k
    kneeR.current.rotation.x += (Math.max(0, -lL) * 1.3 - kneeR.current.rotation.x) * k
    const sg = Math.sin(t * 6.5) * swing
    shinL.current.rotation.x = sg
    shinR.current.rotation.x = -sg

    // Head: towards whoever they talk to (or whoever is talking), otherwise looks around
    const h = head.current
    let yaw = Math.sin(t * 0.5) * 0.2
    if (d.sit) {
      const chat = (x) => x === 'talk' || x === 'laugh'
      const to = fo || d.party?.members.find((m) => m !== d && m.sit && chat(m.act))
      if (to?.visible) yaw = clampYaw(Math.atan2(to.x - d.x, to.z - d.z) - o.rotation.y)
      else if (act === 'look' || act === 'wave') yaw = d.lookYaw
      if (act === 'eat') yaw *= 0.3
    }
    h.rotation.y += (yaw - h.rotation.y) * Math.min(1, k * 0.6)
    if (act === 'nod') h.rotation.x = Math.max(0, Math.sin(t * 6)) * 0.25
    else h.rotation.x += (hx - h.rotation.x) * k
  }, -1)

  return (
    <group ref={root} visible={false}>
      <Body
        gender={look.gender}
        shirt={look.shirt}
        pants={look.pants}
        hair={look.hair}
        skin={SKIN[look.skin]}
        phase={d.phase}
        r={{ upper, head, armL, armR, legL, legR, kneeL, kneeR, legsStand, legsSit, shinL, shinR }}
        rightHand={
          <group ref={(o) => (d.hand = o)} position={[0, -0.25, 0.03]}>
            {/* Fork, only while eating */}
            <group ref={(o) => (d.fork = o)} rotation={[0.9, 0, 0]} visible={false}>
              <M geo={G.box} pos={[0, -0.05, 0]} scale={[0.012, 0.1, 0.006]} color={C.silver} rough={0.3} shadow={false} />
              <M geo={G.box} pos={[0, -0.11, 0]} scale={[0.022, 0.03, 0.004]} color={C.silver} rough={0.3} shadow={false} />
            </group>
          </group>
        }
      >
        {look.tie && <Tie color={look.tie} />}
      </Body>
    </group>
  )
}

/* ---------- Receptionist and waiters: order pad, tray of plates, wiping cloth, a bow ---------- */
// [left arm x, left arm z, right arm x, right arm z, lean forward]
const POSE = {
  idle: [0, 0, 0, 0, 0],
  nod: [0, 0, 0, 0, 0],
  talk: [0, 0, -1.6, 0, 0],
  show: [0, 0, -1.45, 0.5, 0],
  wave: [0, 0, -2.6, 0.3, 0],
  write: [-1.0, 0, -1.15, 0, 0.08],
  carry: [0, 0, -1.3, 0, 0],
  serve: [0, 0, -1.55, -0.15, 0.12],
  reach: [-1.4, 0.1, -1.45, -0.1, 0.12],
  wipe: [-1.45, 0.25, -1.3, 0, 0.25],
  bow: [0, 0, 0, 0, 0.42],
}
const FORE = new THREE.Quaternion().setFromEuler(new THREE.Euler(-0.15, 0, 0)) // forearm bend in Body
const qa = new THREE.Quaternion()
const TRAY_AT = [[-0.13, 0.08], [0.13, 0.08], [-0.13, 0.27], [0.13, 0.27]]

function Staff({ w, d, look, tray = false }) {
  const root = useRef()
  const upper = useRef()
  const head = useRef()
  const armL = useRef()
  const armR = useRef()
  const legL = useRef()
  const legR = useRef()
  const kneeL = useRef()
  const kneeR = useRef()
  const trayG = useRef()
  const cloth = useRef()
  const pad = useRef()
  const bubble = useRef()
  const cur = useRef([0, 0, 0, 0, 0])

  useFrame(() => {
    const o = root.current
    if (!o || (!w.dt && !w.snap)) return
    const dt = w.dt
    const t = w.time + d.phase
    const k = w.snap ? 1 : Math.min(1, dt * 10)
    d.obj = o
    d.y += (floorY(d.x, d.z) - d.y) * (w.snap ? 1 : Math.min(1, dt * 14))
    o.position.set(d.x, d.y + Math.abs(Math.sin(d.stride)) * BOB * d.amp, d.z)
    turn(o, d.rot, w.snap ? 1 : Math.min(1, dt * 10))

    const sw = Math.sin(d.stride) * d.amp
    legL.current.rotation.x += (sw * 0.7 - legL.current.rotation.x) * k
    legR.current.rotation.x += (-sw * 0.7 - legR.current.rotation.x) * k
    kneeL.current.rotation.x = Math.max(0, legL.current.rotation.x) * 1.3
    kneeR.current.rotation.x = Math.max(0, legR.current.rotation.x) * 1.3

    // Arms ease towards the pose; a loaded tray stays up whatever else they do
    const walking = d.anim === 'walk'
    const pose = walking ? 'idle' : d.pose !== 'idle' ? d.pose : d.anim
    const c = cur.current
    ;(POSE[pose] || POSE.idle).forEach((p, n) => {
      const goal = n === 2 && d.tray ? Math.min(p, -1.3) : p
      c[n] += (goal - c[n]) * k
    })
    let [lx, lz, rx, rz] = c
    lx -= sw * 0.5
    if (!d.tray) rx += sw * 0.5
    if (pose === 'wipe') {
      lx += Math.sin(t * 6) * 0.18
      lz += Math.cos(t * 6) * 0.2
    } else if (pose === 'talk') rx += Math.sin(t * 3.2) * 0.35
    else if (pose === 'wave') rz += Math.sin(t * 9) * 0.3
    else if (pose === 'write') rx += Math.sin(t * 9) * 0.07
    else if (!walking) lx += Math.sin(t * 1.5) * 0.04
    armL.current.rotation.set(lx, 0, lz)
    armR.current.rotation.set(rx, 0, rz)
    upper.current.rotation.x = c[4]

    // Head: nod, bow, eyes on the table while wiping or writing, otherwise towards the guest
    const h = head.current
    if (pose === 'nod') h.rotation.x = Math.max(0, Math.sin(t * 6)) * 0.22
    else h.rotation.x += ((pose === 'wipe' || pose === 'write' ? 0.3 : pose === 'bow' ? 0.25 : 0.05) - h.rotation.x) * k
    let yaw = Math.sin(t * 0.5) * 0.2
    if (d.look?.visible) yaw = clampYaw(Math.atan2(d.look.x - d.x, d.look.z - d.z) - o.rotation.y)
    h.rotation.y += (yaw - h.rotation.y) * Math.min(1, k * 0.8)

    if (trayG.current) {
      // Tray stays level in the hand (undo the lean, the arm and the forearm bend)
      trayG.current.visible = d.tray
      qa.copy(upper.current.quaternion).multiply(armR.current.quaternion).multiply(FORE).invert()
      trayG.current.quaternion.copy(qa)
      cloth.current.visible = d.cloth
    }
    pad.current.visible = pose === 'write'
    bubble.current.visible = pose === 'talk'
    bubble.current.scale.setScalar(1 + Math.sin(t * 6) * 0.06)
  }, -1)

  return (
    <group ref={root}>
      <Body
        gender={look.gender}
        shirt={look.shirt}
        apron={look.apron}
        hair={look.hair}
        skin={SKIN[look.skin]}
        phase={d.phase}
        r={{ upper, head, armL, armR, legL, legR, kneeL, kneeR }}
        rightHand={
          tray ? (
            <group ref={trayG} position={[0, -0.25, 0.03]} visible={false}>
              <M geo={G.box} pos={[0, 0, 0.17]} scale={[0.56, 0.018, 0.46]} color={C.wood} />
              <M geo={G.box} pos={[0, 0.012, 0.17]} scale={[0.52, 0.008, 0.42]} color="#E9DFC9" shadow={false} />
              {TRAY_AT.map(([x, z], n) => (
                <object3D key={n} ref={(o) => (d.slots[n] = o)} position={[x, 0.016, z]} />
              ))}
            </group>
          ) : null
        }
        leftHand={
          <>
            <group ref={pad} visible={false} position={[0, -0.28, 0.08]}>
              <M geo={G.box} scale={[0.16, 0.2, 0.02]} color={C.cream} shadow={false} />
            </group>
            {tray && (
              <group ref={cloth} position={[0, -0.26, 0.03]} visible={false}>
                <M geo={G.box} scale={[0.09, 0.014, 0.07]} color={C.cloth} rough={0.95} shadow={false} />
              </group>
            )}
          </>
        }
      />

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

// Entrance (porch) jya thi customers aave
function Porch() {
  return (
    <group>
      <mesh position={[-5.3, -0.15, 7.95]} castShadow receiveShadow>
        <boxGeometry args={[5.4, 0.3, 3.9]} />
        <meshStandardMaterial color={C.wood} />
      </mesh>
      <mesh position={[-5.2, 0.03, 6.8]} receiveShadow>
        <boxGeometry args={[2.4, 0.06, 0.9]} />
        <meshStandardMaterial color={C.terra} />
      </mesh>
      {[-7.2, -3.2].map((x) => (
        <group key={x} position={[x, 0, 6.4]}>
          <mesh position={[0, 0.7, 0]} castShadow>
            <cylinderGeometry args={[0.07, 0.07, 1.4, 10]} />
            <meshStandardMaterial color={C.wood} />
          </mesh>
          <mesh position={[0, 1.5, 0]}>
            <sphereGeometry args={[0.14, 12, 12]} />
            <meshStandardMaterial color="#FFE2A8" emissive="#FFB35C" emissiveIntensity={1.2} />
          </mesh>
        </group>
      ))}
    </group>
  )
}

/* ---------- Main ---------- */
const DEFAULT_LOOK = { gender: 'boy', shirt: '#3E5C76', hair: '#2B1D14', pants: '#2B1D14', skin: 1 }
const WAITER_LOOKS = CFG.waiters.homes.map((_, i) => ({
  gender: i % 2 ? 'girl' : 'boy', shirt: CFG.staff.shirt, apron: CFG.staff.apron, hair: C.ink, skin: (i + 1) % 4,
}))

// Dining hall: parties come in through reception, the receptionist shows them to a table that fits,
// a waiter takes the order and brings a plate for everyone, they eat, chat and leave together,
// and the table is cleared and wiped before the next party gets it.
export default function Journey({ night = false }) {
  const ref = useRef(null)
  if (!ref.current) ref.current = createWorld()
  const w = ref.current
  const [looks, setLooks] = useState(() => Array.from({ length: POOL }, () => DEFAULT_LOOK))
  const [kinds, setKinds] = useState(() => w.seats.map((_, n) => CFG.dishes[n % CFG.dishes.length]))
  w.setLooks = (list) =>
    setLooks((prev) => {
      const next = prev.slice()
      for (const [i, look] of list) next[i] = look
      return next
    })
  w.setKinds = (list) =>
    setKinds((prev) => {
      const next = prev.slice()
      for (const [n, kind] of list) next[n] = kind
      return next
    })

  // Page Visibility and reduced motion (no timers: everything runs on the frame loop)
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const onVis = () => (w.hidden = document.hidden)
    const onMotion = () => setMode(w, mq.matches)
    onVis()
    onMotion()
    document.addEventListener('visibilitychange', onVis)
    mq.addEventListener('change', onMotion)
    return () => {
      document.removeEventListener('visibilitychange', onVis)
      mq.removeEventListener('change', onMotion)
      w.jobs = []
      w.orders = []
      w.toClear = []
    }
  }, [w])

  // After BarStory (-2) and PrivateDiningStory (-1.9) have put their people in w.extras
  useFrame((_, delta) => {
    WORLD = w
    w.all.length = 0
    w.all.push(w.host, ...w.waiters, ...w.guests, ...w.extras)
    // Tab hidden: freeze everything (no catch-up jump when it comes back)
    if (w.hidden) {
      w.dt = 0
      w.snap = false
      return
    }
    w.snap = w.calm || w.snapFrames > 0
    if (w.snapFrames > 0) w.snapFrames--
    if (w.calm) {
      w.dt = 0
      return
    }
    const dt = Math.min(delta, 0.05)
    w.dt = dt
    w.time += dt
    // Jobs may start new jobs (parties, serving, clearing): keep those too
    const running = w.jobs
    w.jobs = []
    w.jobs = running.filter((job) => !job(dt)).concat(w.jobs)
    separate(w, dt)
  }, -1.8)

  return (
    <group>
      <Porch />
      <Furniture w={w} night={night} />
      {w.seats.map((st) => (
        <PlateFood key={st.key} w={w} p={w.plates[st.n]} kind={kinds[st.n]} />
      ))}
      <WaterGlasses w={w} />

      <Staff w={w} d={w.host} look={CFG.host} />
      {/* Waiters: ek chhokro, ek chhokri */}
      {w.waiters.map((d, i) => (
        <Staff key={'w' + i} w={w} d={d} look={WAITER_LOOKS[i]} tray />
      ))}
      {w.guests.map((d, i) => (
        <Diner key={'g' + i} w={w} d={d} look={looks[i]} />
      ))}
    </group>
  )
}
