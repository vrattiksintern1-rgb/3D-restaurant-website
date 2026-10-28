import { useEffect, useRef, useState } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { Body } from './Characters'
import { HighChair } from './Babies'
import { journeyWorld, seq, par, wait, call, until, lazy } from './Journey'
import { BAR_STORY, walkPath, checkIn, floorAt, makeFx, placeFx, tween, smooth, linear, reception } from './BarStory'

/* ==========================================================================
   DISHES: the Private Dining menu. Edit this list to change what the waiter serves.
   Every plate gets a dish at random, never the same dish twice in a row.
   name  = the dish's name (no tag is shown for it), tag = unused colour, kept for reference
   hot   = a light steam rises from it while there is food left
   parts = the drawing, one shape per entry. Plate centre at [0, 0, 0] on the table, the guest sits at +z.
           [shape, [x, y, z], [sx, sy, sz], colour, eat, rotY]
           shape = 'cyl' (sx/sz radius, sy height) | 'ball' (radii) | 'box' (sizes) | 'ring' (flat rim, radius)
                   | 'wedge' (a 60° pizza slice, radius/height)
           eat   = null:    the plate or bowl itself, never eaten
                   0..1:    eaten (shrinks away) when the food left on the plate drops below this
                   'mound': shrinks with the food left (rice, gravy, a burger...)
   ========================================================================== */
const WHITE = '#FBF6EC'
const RIM = '#E6D9BF'
const STEEL = '#C3C8CE'
const STEEL_DARK = '#AEB4BB'
const katori = (x, z, color, eat) => [
  ['cyl', [x, 0.03, z], [0.042, 0.03, 0.042], STEEL_DARK],
  ['cyl', [x, 0.046, z], [0.036, 0.004, 0.036], color, eat],
]
const pizzaSlices = () =>
  Array.from({ length: 6 }, (_, i) => {
    const a = (i * Math.PI) / 3
    const m = a + Math.PI / 6
    const e = 0.88 - i * 0.15
    return [
      ['wedge', [0, 0.027, 0], [0.165, 0.014, 0.165], '#E2B866', e, a],
      ['wedge', [0, 0.035, 0], [0.15, 0.004, 0.15], '#C8402A', e, a],
      ['wedge', [0, 0.038, 0], [0.135, 0.004, 0.135], '#F2C94C', e, a],
      ['cyl', [Math.sin(m) * 0.085, 0.042, Math.cos(m) * 0.085], [0.02, 0.004, 0.02], '#A8322A', e],
      ['ball', [Math.sin(m + 0.35) * 0.05, 0.042, Math.cos(m + 0.35) * 0.05], [0.008, 0.005, 0.008], '#2B1D14', e],
    ]
  }).flat()
const fries = () =>
  [[0.08, 0.05, 0.2], [0.1, 0, -0.5], [0.07, -0.03, 0.9], [0.115, 0.045, 1.4], [0.095, 0.08, -0.2], [0.06, 0.09, 0.6], [0.12, -0.04, 0.1]].map(
    ([x, z, r], i) => ['box', [x, 0.024 + (i % 3) * 0.008, z], [0.012, 0.012, 0.085], '#F2C14E', 0.92 - i * 0.11, r]
  )

export const DISHES = [
  { name: 'Thali', tag: '#D9A441', hot: true, parts: [
    ['cyl', [0, 0.008, 0], [0.18, 0.016, 0.18], STEEL],
    ['ring', [0, 0.016, 0], [0.175, 0.175, 0.175], STEEL_DARK],
    ...katori(-0.095, -0.075, '#E3B23C', 0.75),  // dal
    ...katori(0, -0.11, '#D2602A', 0.55),        // paneer curry
    ...katori(0.095, -0.075, '#5E8C3A', 0.4),    // sabzi
    ...katori(0.13, 0.03, '#F3EEDC', 0.25),      // raita
    ['ball', [0.025, 0.018, 0.06], [0.07, 0.035, 0.055], '#F5EEDC', 'mound'],  // rice
    ['cyl', [-0.085, 0.022, 0.05], [0.058, 0.007, 0.058], '#D9B27A', 0.9],     // rotis
    ['cyl', [-0.08, 0.03, 0.045], [0.052, 0.007, 0.052], '#E4C089', 0.65],
    ['ball', [0.075, 0.022, 0.11], [0.012, 0.008, 0.026], '#7FB24A', 0.2, 0.6], // green chilli
  ] },
  { name: 'Paneer Butter Masala with Naan', tag: '#E0702E', hot: true, parts: [
    ['cyl', [0, 0.008, 0], [0.17, 0.016, 0.17], WHITE],
    ['ring', [0, 0.016, 0], [0.165, 0.165, 0.165], RIM],
    ['cyl', [0.05, 0.035, -0.035], [0.075, 0.04, 0.075], '#9C5A2E'],             // copper bowl
    ['cyl', [0.05, 0.052, -0.035], [0.066, 0.012, 0.066], '#E0702E', 'mound'],   // gravy
    ['box', [0.03, 0.062, -0.055], [0.024, 0.02, 0.024], '#FFF4DA', 0.85, 0.3], // paneer
    ['box', [0.075, 0.062, -0.02], [0.024, 0.02, 0.024], '#FFF4DA', 0.65, 0.9],
    ['box', [0.06, 0.062, -0.07], [0.024, 0.02, 0.024], '#FFF4DA', 0.45, 0.5],
    ['box', [0.025, 0.062, -0.01], [0.024, 0.02, 0.024], '#FFF4DA', 0.25, 1.2],
    ['ball', [0.06, 0.06, -0.035], [0.022, 0.004, 0.022], '#FFF8EC', 0.7],       // cream
    ['ball', [0.04, 0.062, -0.03], [0.008, 0.003, 0.008], '#4F7A2E', 0.55],      // coriander
    ['ball', [-0.075, 0.022, 0.06], [0.08, 0.009, 0.055], '#E2B877', 'mound', 0.5], // naan
    ['ball', [-0.09, 0.03, 0.05], [0.012, 0.003, 0.012], '#9A6A35', 0.6],
    ['ball', [-0.06, 0.03, 0.075], [0.01, 0.003, 0.01], '#9A6A35', 0.4],
  ] },
  { name: 'Biryani', tag: '#E5A93B', hot: true, parts: [
    ['cyl', [0, 0.008, 0], [0.17, 0.016, 0.17], WHITE],
    ['ring', [0, 0.016, 0], [0.165, 0.165, 0.165], '#D9A441'],
    ['ball', [0, 0.016, 0], [0.12, 0.06, 0.11], '#F1DDA6', 'mound'],              // rice
    ['ball', [0.025, 0.04, -0.015], [0.075, 0.035, 0.065], '#E5A93B', 'mound'],   // saffron rice
    ['ball', [-0.05, 0.065, 0.03], [0.034, 0.024, 0.05], '#8A4B22', 0.5, 0.6],  // chicken
    ['ball', [0.06, 0.05, 0.045], [0.026, 0.018, 0.03], '#FFFFFF', 0.35],       // egg
    ['ball', [0.06, 0.064, 0.045], [0.012, 0.006, 0.012], '#F2C230', 0.35],
    ['box', [0, 0.074, -0.03], [0.022, 0.006, 0.008], '#9C5A23', 0.8, 0.4],     // fried onion
    ['box', [0.035, 0.07, 0.015], [0.022, 0.006, 0.008], '#9C5A23', 0.7, 1.3],
    ['ball', [-0.015, 0.078, -0.005], [0.013, 0.004, 0.008], '#3E8E3A', 0.85, 0.7], // mint
    ['cyl', [0.115, 0.03, -0.1], [0.034, 0.03, 0.034], WHITE],                     // raita
    ['cyl', [0.115, 0.046, -0.1], [0.029, 0.004, 0.029], '#F3EEDC', 0.3],
    ['ball', [-0.12, 0.022, -0.06], [0.02, 0.012, 0.03], '#E6D23A', 0.15, 0.8], // lemon
  ] },
  { name: 'Pasta', tag: '#C0392B', hot: true, parts: [
    ['cyl', [0, 0.01, 0], [0.17, 0.02, 0.17], WHITE],
    ['ring', [0, 0.02, 0], [0.16, 0.16, 0.16], RIM],
    ['ball', [0, 0.02, 0], [0.1, 0.045, 0.1], '#EBCB7A', 'mound'],
    ['ring', [0.02, 0.05, 0.015], [0.05, 0.05, 0.05], '#E3BE66', 'mound'],
    ['ring', [-0.025, 0.048, -0.02], [0.042, 0.042, 0.042], '#E3BE66', 'mound'],
    ['ball', [0, 0.06, 0], [0.055, 0.016, 0.05], '#C0392B', 'mound'],             // sauce
    ['ball', [0.012, 0.075, 0.012], [0.018, 0.004, 0.01], '#3E8E3A', 0.6, 0.6],  // basil
    ['ball', [-0.016, 0.074, 0], [0.016, 0.004, 0.009], '#3E8E3A', 0.5, -0.5],
    ['box', [0.03, 0.072, -0.012], [0.009, 0.004, 0.009], '#FFF5D6', 0.75],      // parmesan
    ['box', [-0.02, 0.071, 0.025], [0.008, 0.004, 0.008], '#FFF5D6', 0.7],
  ] },
  { name: 'Pizza', tag: '#C8402A', hot: true, parts: [
    ['cyl', [0, 0.01, 0], [0.19, 0.02, 0.19], '#A0703F'],    // wooden board
    ['box', [0, 0.01, -0.235], [0.04, 0.02, 0.08], '#A0703F'],
    ...pizzaSlices(),
  ] },
  { name: 'Burger and Fries', tag: '#C9902E', hot: true, parts: [
    ['cyl', [0, 0.008, 0], [0.17, 0.016, 0.17], WHITE],
    ['ring', [0, 0.016, 0], [0.165, 0.165, 0.165], RIM],
    ['cyl', [-0.045, 0.028, 0.01], [0.06, 0.022, 0.06], '#D39B4A', 'mound'],       // bun
    ['cyl', [-0.045, 0.048, 0.01], [0.064, 0.02, 0.064], '#5A3220', 'mound'],      // patty
    ['box', [-0.045, 0.06, 0.01], [0.095, 0.005, 0.095], '#F2C230', 'mound', 0.785], // cheese
    ['cyl', [-0.045, 0.066, 0.01], [0.068, 0.006, 0.068], '#7DB33A', 'mound'],     // lettuce
    ['cyl', [-0.045, 0.073, 0.01], [0.055, 0.008, 0.055], '#D9412E', 'mound'],     // tomato
    ['ball', [-0.045, 0.077, 0.01], [0.062, 0.042, 0.062], '#D39B4A', 'mound'],    // top bun
    ['ball', [-0.035, 0.115, 0.02], [0.007, 0.003, 0.005], '#FFF5D6', 'mound', 0.4],
    ['ball', [-0.06, 0.112, -0.005], [0.007, 0.003, 0.005], '#FFF5D6', 'mound', 1.1],
    ...fries(),
    ['cyl', [0.06, 0.03, -0.105], [0.028, 0.026, 0.028], WHITE],                   // ketchup
    ['cyl', [0.06, 0.044, -0.105], [0.023, 0.004, 0.023], '#C0392B', 0.3],
  ] },
  { name: 'Dessert Platter', tag: '#F6C1CF', hot: false, parts: [
    ['cyl', [0, 0.008, 0], [0.19, 0.016, 0.14], WHITE],                              // oval platter
    ['cyl', [-0.085, 0.017, -0.005], [0.06, 0.003, 0.05], '#C77A2A'],               // syrup
    ['ball', [-0.105, 0.04, 0.015], [0.032, 0.029, 0.032], '#7A3B1C', 0.8],         // gulab jamun
    ['ball', [-0.065, 0.04, -0.03], [0.032, 0.029, 0.032], '#7A3B1C', 0.55],
    ['ball', [0.015, 0.045, 0.035], [0.04, 0.034, 0.04], '#F6C1CF', 0.7],           // ice cream
    ['ball', [0.04, 0.045, -0.035], [0.04, 0.034, 0.04], '#FFF3D9', 0.45],
    ['box', [0.115, 0.035, 0.03], [0.055, 0.035, 0.05], '#4A2A1A', 0.3, 0.3],       // brownie
    ['ball', [0.12, 0.03, -0.055], [0.018, 0.022, 0.018], '#D7263D', 0.9],          // strawberry
    ['cyl', [0.12, 0.053, -0.055], [0.012, 0.004, 0.012], '#3E8E3A', 0.9],
    ['box', [0, 0.0175, 0.085], [0.18, 0.002, 0.008], '#4A2A1A', null, 0.15],        // chocolate drizzle
    ['ball', [0.02, 0.08, 0.035], [0.011, 0.004, 0.007], '#3E8E3A', 0.7, 0.5],
  ] },
]

/* ==========================================================================
   PRIVATE_DINING: every seat, path, timing and outfit of the private dining room.
   One party at the long table at a time. Positions are world units [x, z]
   (+x = towards the kitchen, +z = towards the road). Times in seconds; [a, b] = random between a and b.
   ========================================================================== */
export const PRIVATE_DINING = {
  speed: BAR_STORY.speed, // guests walk at the bar customers' pace on the shared passage (kids keep up too)
  waiterSpeed: 1.45,
  table: [3.8, -9],    // centre of the long table (drawn in Sections.jsx)
  tableTop: 0.89,

  // Everyone walks round the table on this ring of lanes: front = between the chairs and the kitchen
  // partition, back = in front of the sideboard, west / east = the two ends of the table
  ring: { front: -7.15, back: -10.75, west: 0.3, east: 7.35 },
  path: {
    // After the bar's passage beside the lounge: through the gap in the partition, into the room
    in: [[-0.88, -5.6], [-0.88, -6.6], [-0.35, -7.15]],
    // ...and back out to the bar's way out to the street
    out: [[-0.35, -7.15], [-0.88, -6.6], [-0.88, -5.6], [-0.25, -4.9], [-0.25, 0.45]],
    // The one who checks in waits in the line, the rest of the party together on the west of the porch,
    // two by two (clear of the dining hall's way in at x -6.1). They get there along the top of the porch
    // (z = top) and then straight down their column, so nobody walks through someone already waiting...
    group: { x: [-6.75, -7.35], z: 6.95, gap: 0.6, top: 9.3 },
    deskGap: 0.55,     // ...then they all step up behind the one at the desk
  },
  waiter: {
    home: [7.4, -6.75], rot: -2.3,     // standing by where the kitchen opens into the room
    pass: [7.8, -6.45],                // past the end of the partition
    kitchen: [7.82, -5.2], kitchenRot: -Math.PI / 2, // end of the kitchen counter: plates are picked up here
    look: { gender: 'girl', shirt: '#6B7F3A', apron: '#F5E6CC', skin: 0, hair: '#5A3A22' },
  },

  // Seats round the long table: four chairs down each side, one at the west end (head of the table) and
  // the high chair at the east end, so a party of up to 8 always has a place each.
  // x/z = where the guest sits, rot = facing, stand = where they step in beside the chair (the waiter serves from here too).
  // high = the high chair (only a small child sits there); plate/plateScale override where the plate goes.
  seats: [
    { id: 'N1', x: 2.075, z: -8.05, rot: Math.PI, stand: [2.575, -7.95] },
    { id: 'N2', x: 3.225, z: -8.05, rot: Math.PI, stand: [3.725, -7.95] },
    { id: 'N3', x: 4.375, z: -8.05, rot: Math.PI, stand: [4.875, -7.95] },
    { id: 'N4', x: 5.525, z: -8.05, rot: Math.PI, stand: [6.025, -7.95] },
    { id: 'S1', x: 2.075, z: -9.95, rot: 0, stand: [2.575, -10.05] },
    { id: 'S2', x: 3.225, z: -9.95, rot: 0, stand: [3.725, -10.05] },
    { id: 'S3', x: 4.375, z: -9.95, rot: 0, stand: [4.875, -10.05] },
    { id: 'S4', x: 5.525, z: -9.95, rot: 0, stand: [6.025, -10.05] },
    { id: 'W', x: 1.05, z: -9, rot: Math.PI / 2, stand: [0.95, -9.6] },
    { id: 'E', x: 6.59, z: -9, rot: -Math.PI / 2, stand: [7.0, -8.4], high: true, plate: [6.35, 0.955, -9.08], plateScale: 0.6 },
  ],
  heights: { chair: 0.54, booster: 0.64, high: 0.76 }, // seat tops: chair, chair + kid's cushion, high chair
  chairPull: 0.28,     // a chair slides back this far when someone sits down or gets up
  tuck: 0.25,          // ...and stays out this much (0..1) while they sit

  // Party types: private dining is for big groups only, 5 to 8 people. Each time a type is picked at
  // random (by weight, never the same type twice in a row), then a size in its range.
  //   elders = grandparents (or parents), adults = the grown-ups, kids = children; kids make up the rest
  //   cake   = a birthday: party hats for everyone, balloons on the birthday chair, a cake with candles
  parties: {
    family: { weight: 1.2, size: [5, 8], elders: [1, 2], adults: 2, kids: [2, 4] },
    friends: { weight: 1, size: [5, 8], kids: [0, 0] },
    celebration: { weight: 0.8, size: [6, 8], kids: [0, 2], cake: true },
  },
  smallKid: 0.45,      // chance that one of the kids is little and has the high chair
  // Chairs a party sits on, by how many need one (the little one in the high chair needs none).
  // One is picked at random; elders get the west end, kids the east end by the high chair.
  layouts: {
    4: [['N3', 'N4', 'S3', 'S4'], ['N2', 'N3', 'S3', 'S4']],
    5: [['W', 'N2', 'N3', 'S2', 'S3'], ['N2', 'N3', 'N4', 'S3', 'S4'], ['W', 'N3', 'N4', 'S3', 'S4']],
    6: [['N1', 'N2', 'N3', 'S1', 'S2', 'S3'], ['N2', 'N3', 'N4', 'S2', 'S3', 'S4'], ['W', 'N2', 'N3', 'N4', 'S3', 'S4']],
    7: [['W', 'N1', 'N2', 'N3', 'S1', 'S2', 'S3'], ['N1', 'N2', 'N3', 'N4', 'S2', 'S3', 'S4'], ['W', 'N2', 'N3', 'N4', 'S2', 'S3', 'S4']],
    8: [['N1', 'N2', 'N3', 'N4', 'S1', 'S2', 'S3', 'S4'], ['W', 'N1', 'N2', 'N3', 'N4', 'S2', 'S3', 'S4']],
  },
  highChairBy: ['N4', 'S4'], // with a little one, the party takes a layout with one of these, next to the high chair
  sizes: { elder: [0.9, 0.97], adult: [0.94, 1.05], kid: [0.6, 0.68], small: [0.5, 0.53] },

  outfits: {
    shirts: ['#3E5C76', '#8C3B2E', '#D9A441', '#5C6B3A', '#7A4E7E', '#2F6F73', '#B5651D', '#A34A5A', '#4F7942', '#E07A5F', '#6A4C93', '#5B6C8F'],
    elderShirts: ['#8A7F72', '#6E5A4B', '#4B5D6B', '#9C6B4E', '#7B5B6E', '#5F6F52'],
    kidShirts: ['#F2D46B', '#9CC5D9', '#F4B6C2', '#E8862A', '#7DB33A', '#C8A2E8', '#4FB3BF'],
    hair: ['#2B1D14', '#5A3A22', '#1A1A1A', '#8B5A2B', '#A0522D'],
    elderHair: ['#D8D4CC', '#BDB7AE', '#9E9890', '#E9E5DD'],
    pants: ['#2B1D14', '#3B4A5A', '#5A4636'],
    hats: ['#E94F64', '#F2C94C', '#4FB3BF', '#7DB33A', '#C8A2E8', '#F28C38'], // birthday party hats
    balloons: ['#E94F64', '#4FB3BF', '#F2C94C'],
  },

  time: {
    gap: [5, 12],         // next party arrives this long after the table has been cleared
    firstStay: [8, 22],   // remaining stay of the party already seated when the page opens
    stay: [20, 45],       // lunch: from the last plate served until they get up
    follow: 0.6,          // party members walk this far behind each other
    sit: 0.4,             // sit down / stand up
    order: 1.3,           // hand raised to order
    notice: 0.6,          // waiter nods before walking to the kitchen
    pickup: 1.4,          // plates handed over at the kitchen counter
    place: 0.45,          // a plate moving between the tray and the table
    bow: 0.9,
    clearDelay: 1.2,      // after the party has left the room
    wipe: 1.1,            // wiping each place
    chairBack: 1.2,       // a pushed-back chair returns this long after its guest walks off
    bite: 1.7,            // one forkful: plate -> mouth -> plate
    tag: 1.8,             // how long the "Cheers!" / "Happy Birthday!" pill shows
    moment: [4, 8],       // a group moment (toast, cheer, a joke, a shared plate, kids waving) this often while they eat
    candles: 3,           // the birthday candles burn this long before they are blown out
  },
  eatShare: 0.5,       // roughly how much of their stay guests spend eating (sets the size of a bite)
  crumbs: 0.06,        // what is left on a finished plate
  water: 0.85,         // water glasses are filled this far

  dishes: DISHES,
}

/* ---------- Shortcuts and fixed scene data ---------- */
const CFG = PRIVATE_DINING
const T = CFG.time
const R = CFG.ring
const WT = CFG.waiter
const BP = BAR_STORY.path   // reception, porch and street are shared with the bar
const MAX_PARTY = Math.max(...Object.values(CFG.parties).map((p) => p.size[1]))
const POOL = 2 * MAX_PARTY  // guests: room for the party leaving and the next one arriving
const SLOTS = 4             // plates the waiter's tray holds (bigger parties: more trips)
const TRAY_SCALE = 0.62
const SKIN = ['#F1C9A5', '#E8B08A', '#C98B62', '#A8683F']
const C = { woodLight: '#6B4A35', wood: '#4A3426', terra: '#C8553D', silver: '#C9CDD2', cloth: '#E8EEF2' }

const rand = (a, b) => a + Math.random() * (b - a)
const randIn = ([a, b]) => rand(a, b)
const randInt = ([a, b]) => a + Math.floor(Math.random() * (b - a + 1))
const pick = (list) => list[Math.floor(Math.random() * list.length)]
const chunk = (list, n) => Array.from({ length: Math.ceil(list.length / n) }, (_, i) => list.slice(i * n, i * n + n))
const shuffle = (list) => list.map((v) => [Math.random(), v]).sort((a, b) => a[0] - b[0]).map((p) => p[1])
function weighted(list, weight) {
  const ws = list.map(weight)
  let r = Math.random() * ws.reduce((a, b) => a + b, 0)
  for (let i = 0; i < list.length; i++) if ((r -= ws[i]) <= 0) return list[i]
  return list[list.length - 1]
}
const clamp = (v, a, b) => Math.max(a, Math.min(b, v))
const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a))
const clampYaw = (a) => Math.max(-0.9, Math.min(0.9, wrap(a)))
const faceTo = (a, [x, , z]) => Math.atan2(x - a.x, z - a.z)
const pathLen = (pts) => pts.reduce((L, p, i) => (i ? L + Math.hypot(p[0] - pts[i - 1][0], p[1] - pts[i - 1][1]) : 0), 0)

/* ---------- Walking round the table ---------- */
const RW = R.east - R.west
const RH = R.front - R.back
const PER = 2 * (RW + RH)
const CORNERS = [[R.west, R.front], [R.east, R.front], [R.east, R.back], [R.west, R.back]]
const CORNER_AT = [0, RW, RW + RH, 2 * RW + RH]

// Nearest point on the ring of lanes
function laneOf([x, z]) {
  const d = [Math.abs(z - R.front), Math.abs(x - R.east), Math.abs(z - R.back), Math.abs(x - R.west)]
  const i = d.indexOf(Math.min(...d))
  const cx = clamp(x, R.west, R.east)
  const cz = clamp(z, R.back, R.front)
  return [[cx, R.front], [R.east, cz], [cx, R.back], [R.west, cz]][i]
}
// Distance along the ring, clockwise from the north-west corner
function ringAt([x, z]) {
  if (Math.abs(z - R.front) < 1e-6) return x - R.west
  if (Math.abs(x - R.east) < 1e-6) return RW + (R.front - z)
  if (Math.abs(z - R.back) < 1e-6) return RW + RH + (R.east - x)
  return 2 * RW + RH + (z - R.back)
}
// From a to b along the ring, the short way round: the corners passed, then b
function ringRoute(a, b) {
  const pa = ringAt(a)
  const fwd = (ringAt(b) - pa + PER) % PER
  const dir = fwd <= PER - fwd ? 1 : -1
  const len = dir > 0 ? fwd : PER - fwd
  const along = (p) => ((dir > 0 ? p - pa : pa - p) + PER) % PER
  return CORNER_AT.map((p, i) => [along(p), CORNERS[i]])
    .filter(([d]) => d > 1e-6 && d < len - 1e-6)
    .sort((u, v) => u[0] - v[0])
    .map(([, c]) => c)
    .concat([b])
}
// Any spot in the room to any other: out to the nearest lane, round the table, then in
const roomRoute = (a, b) => {
  const la = laneOf(a)
  const lb = laneOf(b)
  return [la, ...ringRoute(la, lb), b]
}

const DOOR = CFG.path.in[CFG.path.in.length - 1] // where the partition gap meets the front lane
// Reception -> the bar's passage -> partition gap -> round the table -> beside the chair
const routeIn = (seat) => [...BP.toBar.slice(0, 4), ...CFG.path.in, ...roomRoute(DOOR, seat.stand)]
const routeInside = (seat) => [...roomRoute(seat.stand, DOOR)]
const routeOut = () => [...CFG.path.out, ...BP.exit]

const atSpot = (a, [x, z], r = 0.15) => Math.hypot(a.x - x, a.z - z) < r
const waiterTo = (w, to) =>
  atSpot(w, WT.kitchen, 0.5) ? [WT.pass, WT.home, ...roomRoute(WT.home, to)] : roomRoute([w.x, w.z], to)
const toKitchen = (w) => (atSpot(w, WT.home) ? [WT.pass, WT.kitchen] : [...roomRoute([w.x, w.z], WT.home), WT.pass, WT.kitchen])
const toHome = (w) => (atSpot(w, WT.kitchen, 0.5) ? [WT.pass, WT.home] : roomRoute([w.x, w.z], WT.home))
// The waiter goes round the table from the kitchen side, nearest place first
const byService = (seats) =>
  seats.slice().sort((a, b) => pathLen(roomRoute(WT.home, a.stand)) - pathLen(roomRoute(WT.home, b.stand)))

/* ---------- Story state ---------- */
const mkWalker = () => ({
  x: 0, z: 0, y: 0, rot: 0, visible: false, sit: false, hipY: null,
  // Journey reads these: pri -1 = dining-hall guests and waiters give way to us
  pri: -1, group: null, anim: 'idle', yielding: false,
  rank: 0, walking: false, stride: 0, amp: 0, hand: null, obj: null, px: 0, pz: 0, pose: 'idle',
})
const mkGuest = (i) => ({
  ...mkWalker(), i, size: 1, kid: false, fork: null,
  busy: false, step: 'gone', party: null, seat: null, order: 0, served: false, away: false, bite: 0.1, bday: false,
  act: 'idle', actT: 0, actAge: 0, lookYaw: 0, lastSip: -9, focus: null,
})
function mkSeat(d, n) {
  const fx = Math.sin(d.rot)
  const fz = Math.cos(d.rot)
  const top = CFG.tableTop
  return {
    ...d, n, fx, fz,
    plate: d.plate ?? [d.x + fx * 0.57, top, d.z + fz * 0.57],
    plateScale: d.plateScale ?? 1,
    // The water glass goes by the eating hand (Body's right arm, local +x)
    glass: d.high ? null : [d.x + fx * 0.62 + Math.cos(d.rot) * 0.27, top, d.z + fz * 0.62 - Math.sin(d.rot) * 0.27],
    state: 'free', by: null, push: 0, pushNow: 0, booster: false,
  }
}
const mkPlate = () => ({ visible: false, dish: CFG.dishes[0], x: 0, y: 0, z: 0, rot: 0, scale: 1, left: 1, holder: null })
const mkCake = () => ({ visible: false, x: 0, y: 0, z: 0, rot: 0, scale: 1, left: 1, lit: false, holder: null, seat: null })
// The birthday cake goes in the middle of the table, in front of the birthday guest
const cakeSpot = (st) => [st.x + st.fx * 0.95, CFG.tableTop, st.z + st.fz * 0.95]
const mkGlass = (at) => ({ x: at[0], y: at[1], z: at[2], home: at, fill: CFG.water, holder: null, blend: 0 })

function createStory() {
  const guests = Array.from({ length: POOL }, (_, i) => mkGuest(i))
  const waiter = { ...mkWalker(), visible: true, rank: 5e6, tray: false, cloth: false, busy: false, look: null, slots: [] }
  const seats = CFG.seats.map(mkSeat)
  return {
    time: 0, dt: 0, snap: true, snapFrames: 2, hidden: false, calm: false,
    rank: 1e6, lastDish: -1, lastType: null, nextAt: Infinity, party: null,
    guests, waiter, seats,
    plates: seats.map(mkPlate),
    cake: mkCake(),
    glasses: seats.map((st) => (st.glass ? mkGlass(st.glass) : null)),
    mine: [...guests, waiter],
    walkers: [],
    jobs: [], orders: [], toClear: [],
    fx: null, setLooks: null,
  }
}

const seatY = (seat, kid) => (seat.high ? CFG.heights.high : kid ? CFG.heights.booster : CFG.heights.chair)

/* ---------- Parties ---------- */
// Half boys, half girls (one more of either when odd), in random order
const mixed = (n) => {
  const first = Math.random() < 0.5 ? 'boy' : 'girl'
  const other = first === 'boy' ? 'girl' : 'boy'
  return shuffle(Array.from({ length: n }, (_, i) => (i % 2 ? other : first)))
}
const skinTone = () => Math.floor(Math.random() * SKIN.length)

function planParty(s) {
  // Never the same kind of party twice in a row
  const types = Object.keys(CFG.parties).filter((t) => t !== s.lastType)
  const type = weighted(types, (t) => CFG.parties[t].weight)
  s.lastType = type
  const def = CFG.parties[type]
  const o = CFG.outfits
  const size = randInt(def.size)
  // Elders and adults as the type says, kids make up the rest (within their range)
  let elders = 0
  let kids = randInt(def.kids)
  if (def.elders) {
    elders = clamp(randInt(def.elders), size - def.adults - def.kids[1], size - def.adults - def.kids[0])
    kids = size - def.adults - elders
  }
  const adults = size - elders - kids
  const small = kids > 0 && Math.random() < CFG.smallKid

  // Chairs: elders at the west end, kids at the east end by the high chair, the adults in between
  const high = CFG.seats.find((st) => st.high).id
  const options = CFG.layouts[size - (small ? 1 : 0)]
  const near = options.filter((l) => l.some((id) => CFG.highChairBy.includes(id)))
  const chairs = pick(small && near.length ? near : options)
    .map((id) => CFG.seats.find((st) => st.id === id))
    .sort((a, b) => a.x - b.x || a.id.localeCompare(b.id))
    .map((st) => st.id)

  const shirts = shuffle(o.shirts)
  const elderShirts = shuffle(o.elderShirts)
  const kidShirts = shuffle(o.kidShirts)
  const hats = def.cake ? shuffle(o.hats) : null
  const elderG = mixed(elders)
  const adultG = mixed(adults)
  const members = []
  for (let k = 0; k < elders; k++) {
    members.push({
      seat: chairs[k], kid: false, size: randIn(CFG.sizes.elder),
      look: { gender: elderG[k], shirt: elderShirts[k], hair: pick(o.elderHair), pants: pick(o.pants), skin: skinTone() },
    })
  }
  for (let k = 0; k < adults; k++) {
    members.push({
      seat: chairs[elders + k], kid: false, size: randIn(CFG.sizes.adult),
      look: { gender: adultG[k], shirt: shirts[k], hair: pick(o.hair), pants: pick(o.pants), skin: skinTone() },
    })
  }
  const grown = members.slice(elders)
  for (let k = 0; k < kids; k++) {
    const little = small && k === 0
    // Kids take after one of the grown-ups (hair and skin)
    const parent = (grown.length ? grown : members)[k % (grown.length || members.length)].look
    members.push({
      seat: little ? high : chairs[elders + adults + k - (small ? 1 : 0)], kid: true,
      size: randIn(little ? CFG.sizes.small : CFG.sizes.kid),
      look: { gender: Math.random() < 0.5 ? 'boy' : 'girl', shirt: kidShirts[k], hair: parent.hair, pants: pick(o.pants), skin: parent.skin },
    })
  }
  if (hats) members.forEach((m, k) => (m.look.hat = hats[k % hats.length]))
  // Birthday guest: anyone on a side chair (the cake goes in front of them, mid-table)
  if (def.cake) pick(members.filter((m) => /^[NS]/.test(m.seat))).bday = true
  return { type, members, cake: !!def.cake }
}

function pickDish(s) {
  const n = CFG.dishes.length
  let i = Math.floor(Math.random() * (s.lastDish < 0 ? n : n - 1))
  if (s.lastDish >= 0 && i >= s.lastDish) i++
  s.lastDish = i
  return CFG.dishes[i]
}

// Food is shared out in bites so a plate is mostly finished by the time the party gets up
function planMeal(s, party, stay) {
  party.leaveAt = s.time + stay
  const bites = Math.max(4, Math.round((stay * CFG.eatShare) / T.bite))
  for (const c of party.members) c.bite = Math.max(0.02, (s.plates[c.seat.n].left - CFG.crumbs) / bites)
}

function startParty(s, plan) {
  const party = { type: plan.type, members: [], desk: null, go: null, leaveAt: null, cake: plan.cake, bday: null, moment: null }
  const looks = []
  for (const m of plan.members) {
    const slot = s.guests.findIndex((c) => !c.busy)
    const c = s.guests[slot]
    const seat = s.seats.find((st) => st.id === m.seat)
    if (!c || seat.state !== 'free') {
      console.warn('PrivateDiningStory: seat ' + seat.id + ' is ' + seat.state)
      continue
    }
    seat.state = 'reserved'
    seat.by = c
    seat.booster = m.kid && !seat.high
    Object.assign(c, {
      busy: true, step: 'pending', party, seat, size: m.size, kid: m.kid, served: false, away: false, bday: !!m.bday,
      visible: false, sit: false, hipY: null, act: 'idle', actT: 0, pose: 'idle', walking: false, yielding: false, amp: 0, lastSip: -9,
    })
    if (m.bday) party.bday = c
    looks.push([slot, m.look])
    party.members.push(c)
  }
  s.setLooks?.(looks)
  // Into the room the one going furthest walks first, so nobody squeezes past someone sitting down.
  // They come in, wait and check in in that same order, so the line never has to pass itself.
  party.members.sort((a, b) => pathLen(routeIn(b.seat)) - pathLen(routeIn(a.seat)))
  party.members.forEach((c, n) => {
    c.order = n
    c.rank = s.rank + n
  })
  s.rank += party.members.length
  s.party = party
  reception.hold = party // no bar party comes to the desk while this one checks in
  party.members.forEach((c, k) => s.jobs.push(guestScript(s, c, k)))
  s.jobs.push(
    partyScript(s, party, true),
    seq(
      until(() => party.go != null && s.time >= party.go + (party.members.length - 1) * T.follow + 1.5),
      call(() => {
        if (reception.hold === party) reception.hold = null
      })
    )
  )
}

// The party already at the table when the page opens: served, part-way through lunch
function seatInitial(s) {
  const plan = planParty(s)
  const party = { type: plan.type, members: [], desk: 'ok', go: 0, leaveAt: null, cake: plan.cake, bday: null, moment: null }
  const looks = []
  plan.members.forEach((m, k) => {
    const c = s.guests[k]
    const seat = s.seats.find((st) => st.id === m.seat)
    const hipY = seatY(seat, m.kid) + 0.05 * m.size
    Object.assign(seat, { state: 'occupied', by: c, booster: m.kid && !seat.high, push: CFG.tuck, pushNow: CFG.tuck })
    Object.assign(c, {
      busy: true, step: 'seated', party, seat, size: m.size, kid: m.kid, rank: ++s.rank, served: true, away: false, bday: !!m.bday,
      visible: true, x: seat.x, z: seat.z, px: seat.x, pz: seat.z, rot: seat.rot, sit: true, hipY, y: hipY - 0.05 * m.size,
      pose: 'sit', act: 'idle', actT: rand(0.3, 2), actAge: 0, lastSip: -9, walking: false, amp: 0,
    })
    if (m.bday) {
      // A birthday already under way: the cake is cut and the candles are out
      party.bday = c
      const [x, y, z] = cakeSpot(seat)
      Object.assign(s.cake, { visible: true, left: rand(0.35, 0.75), lit: false, holder: null, scale: 1, seat, x, y, z, rot: seat.rot + Math.PI })
    }
    const [x, y, z] = seat.plate
    Object.assign(s.plates[seat.n], {
      visible: true, dish: pickDish(s), left: rand(0.35, 0.8), holder: null, scale: seat.plateScale, x, y, z, rot: seat.rot + Math.PI,
    })
    const g = s.glasses[seat.n]
    if (g) g.fill = rand(0.3, CFG.water)
    looks.push([k, m.look])
    party.members.push(c)
  })
  s.setLooks?.(looks)
  planMeal(s, party, randIn(T.firstStay))
  s.party = party
  return party
}

// A bar party is on its way to the desk or checking in (bar customers carry a phase, ours don't)
const barAtDesk = () => !!journeyWorld()?.extras.some((a) => a.phase === 'pending' || a.phase === 'enter')

// Free table and the gap after the last party is over: our turn at reception. No new bar party
// starts from now on; one already checking in finishes first. (The dining hall's parties stand
// either side of the desk and the line, so they need no turn.)
const spawner = (s) => () => {
  if (s.party || s.time < s.nextAt) return false
  if (s.seats.some((st) => st.state !== 'free')) return false
  if (s.guests.filter((c) => !c.busy).length < MAX_PARTY) return false
  reception.hold = s
  if (barAtDesk()) return false
  startParty(s, planParty(s))
  return false
}

/* ---------- Guests ---------- */
// Sit down (or stand up), about 400 ms: the hip moves on a small arc, the legs switch pose halfway
const sitMove = (c, seat, down) => {
  const [px, pz] = seat.stand
  const standHip = 0.1 + 0.5 * c.size
  const sitHip = seatY(seat, c.kid) + 0.05 * c.size
  return tween(T.sit, (p) => {
    const k = down ? smooth(p) : 1 - smooth(p)
    c.x = px + (seat.x - px) * k
    c.z = pz + (seat.z - pz) * k
    c.sit = k > 0.5
    c.hipY = standHip + (sitHip - standHip) * k + Math.sin(Math.PI * p) * 0.12
  }, linear)
}

// Waiting on the porch (the first in the line, the rest of the party together beside it),
// then stepping up behind the one at the desk
const lineSpot = (k, atDesk) => {
  if (atDesk) return [BP.desk[0], BP.deskBehind[1] + (k - 1) * CFG.path.deskGap]
  if (!k) return BP.queue
  const g = CFG.path.group
  return [g.x[(k - 1) % 2], g.z + Math.floor((k - 1) / 2) * g.gap]
}
// From the garden gate to that spot: along the top of the porch, then down the column
const toLine = (k) => {
  const spot = lineSpot(k, false)
  return k ? [[spot[0], CFG.path.group.top], spot] : [spot]
}

// Small things people do while seated, picked at random
function nextAct(s, c) {
  const g = s.glasses[c.seat.n]
  if ((c.act === 'sip' || c.act === 'clink') && g?.holder === c) g.holder = null
  const mates = c.party.members.filter((m) => m !== c && m.sit)
  const chat = mates.length ? 1 : 0.15
  const opts = [
    ['idle', 1, 1.2, 2.4], ['look', 1.3, 1.2, 2.6], ['nod', 0.6, 1, 1.5],
    ['talk', 2.6 * chat, 2, 4], ['laugh', 1.2 * chat, 1.2, 1.8],
  ]
  if (c.served && s.plates[c.seat.n].left > CFG.crumbs + 0.04) opts.push(['eat', c.kid ? 3.5 : 5, 2, 4])
  if (g && g.fill > 0.15 && s.time - c.lastSip > 3.5) opts.push(['sip', 1.3, 1.8, 2.3])
  if (c.kid) opts.push(['swing', 2, 2, 4], [c.seat.high ? 'clap' : 'wave', 1.4, 1.5, 2.6])
  const [act, , d0, d1] = weighted(opts.filter((o) => o[0] !== c.act || o[0] === 'eat'), (o) => o[1])
  c.act = act
  // Eating goes on for a whole number of forkfuls, so the hand ends back at the plate
  c.actT = act === 'eat' ? T.bite * Math.round(rand(d0, d1)) : rand(d0, d1)
  c.actAge = 0
  c.lookYaw = rand(-0.7, 0.7)
  c.focus = mates.length ? pick(mates) : null
  if (act === 'sip') {
    c.lastSip = s.time
    g.holder = c
    g.blend = 0
  }
}

// Seated until the party's lunch is over
const seatedLife = (s, c) => (dt) => {
  const p = c.party
  if (p.leaveAt != null && s.time >= p.leaveAt) return true
  const age = c.actAge
  c.actT -= dt
  c.actAge += dt
  const g = s.glasses[c.seat.n]
  if (c.act === 'sip' && g) {
    if (c.actAge < 1.2) g.fill = Math.max(0.1, g.fill - dt * 0.05)
    else if (g.holder === c) g.holder = null
  }
  if (c.act === 'eat') {
    // A bite each time the fork reaches the mouth (62% through a forkful)
    const pl = s.plates[c.seat.n]
    if (Math.floor(c.actAge / T.bite + 0.38) > Math.floor(age / T.bite + 0.38)) pl.left = Math.max(CFG.crumbs, pl.left - c.bite)
    if (pl.left <= CFG.crumbs) c.actT = Math.min(c.actT, T.bite - (c.actAge % T.bite))
  }
  if (c.actT <= 0) nextAct(s, c)
  return false
}

function served(s, c) {
  c.served = true
  // Bite size for an average stay until the whole party is served (planMeal then sets the real one)
  c.bite = (1 - CFG.crumbs) / Math.max(4, Math.round((((T.stay[0] + T.stay[1]) / 2) * CFG.eatShare) / T.bite))
  const g = s.glasses[c.seat.n]
  if ((c.act === 'sip' || c.act === 'clink') && g?.holder === c) g.holder = null
  c.act = 'nod' // thank you
  c.actT = 1.2
  c.actAge = 0
}

const leave = (s, c) => {
  const seat = c.seat
  return seq(
    call(() => {
      const g = s.glasses[seat.n]
      if (g?.holder === c) g.holder = null
      c.act = 'idle'
      c.actT = 99
      // The one nearest the way out gets up first, and has right of way over those behind
      const p = c.party
      c.order = p.members
        .slice()
        .sort((a, b) => pathLen(routeInside(a.seat)) - pathLen(routeInside(b.seat)))
        .indexOf(c)
      if (p.outRank == null) {
        p.outRank = s.rank
        s.rank += p.members.length
      }
      c.rank = p.outRank + c.order
    }),
    lazy(() => wait(c.order * T.follow)),
    call(() => {
      c.step = 'leave'
      if (!seat.high) seat.push = 1
    }),
    sitMove(c, seat, false),
    call(() => {
      c.sit = false
      c.hipY = null
      c.served = false
      seat.state = 'dirty' // free again once the waiter has cleared and wiped it
      seat.by = null
    }),
    par(
      walkPath(s, c, routeInside(seat), CFG.speed),
      seq(wait(T.chairBack), call(() => { seat.push = 0 }))
    ),
    call(() => {
      c.away = true
      c.step = 'out'
    }),
    walkPath(s, c, routeOut(), CFG.speed),
    call(() => {
      c.visible = false
      c.busy = false
      c.step = 'gone'
    })
  )
}

function guestScript(s, c, k) {
  const party = c.party
  const seat = c.seat
  return seq(
    wait(k * T.follow),
    call(() => {
      const [x, z] = BP.enter[0]
      Object.assign(c, { x, z, px: x, pz: z, y: floorAt(x, z), rot: Math.PI / 2, visible: true, step: 'enter' })
    }),
    walkPath(s, c, [...BP.enter.slice(1), ...toLine(k)], CFG.speed),
    // The first one checks in (the receptionist waves), the others step up behind
    k === 0
      ? checkIn(s, c)
      : seq(
        until(() => party.desk),
        // One after another, front of the line first
        lazy(() => (party.desk === 'ok' ? seq(wait((k - 1) * 0.25), walkPath(s, c, [lineSpot(k, true)], CFG.speed)) : seq())),
        call(() => { c.rot = Math.PI })
      ),
    until(() => party.go != null && s.time >= party.go + c.order * T.follow),
    call(() => { c.step = 'walk' }),
    walkPath(s, c, routeIn(seat), CFG.speed),
    call(() => {
      c.rot = seat.rot
      if (!seat.high) seat.push = 1 // pull the chair out
    }),
    wait(0.25),
    sitMove(c, seat, true),
    call(() => {
      seat.state = 'occupied'
      seat.push = CFG.tuck
      Object.assign(c, { step: 'seated', act: 'idle', actT: rand(0.6, 1.4), actAge: 0 })
    }),
    seatedLife(s, c),
    leave(s, c)
  )
}

/* ---------- Group moments while they eat ---------- */
// What a seated guest does now (a held glass goes back down, unless it is raised for the toast)
function setAct(s, c, act, dur, focus = null) {
  const g = s.glasses[c.seat.n]
  if (g?.holder === c && act !== 'clink') g.holder = null
  Object.assign(c, { act, actT: dur, actAge: 0, focus })
  if (act === 'clink' && g) {
    g.holder = c
    g.blend = 0
  }
}

// A plate lifted off the table and held out (or back), in a straight line
const glide = (p, from, to, dur) =>
  tween(dur, (k) => {
    p.x = from[0] + (to[0] - from[0]) * k
    p.y = from[1] + (to[1] - from[1]) * k
    p.z = from[2] + (to[2] - from[2]) * k
  })

function groupMoment(s, party) {
  const sat = party.members.filter((c) => c.step === 'seated' && c.sit)
  if (sat.length < 2) return
  const others = (c) => sat.filter((m) => m !== c)
  const big = sat.filter((c) => !c.seat.high && s.plates[c.seat.n].visible && !s.plates[c.seat.n].holder)
  const kids = sat.filter((c) => c.kid)
  const opts = [['toast', 1], ['cheer', 0.8], ['joke', 1.2], ['pass', big.length > 1 ? 1 : 0], ['wave', kids.length ? 1 : 0]]
  // The first one is always a toast
  const [m] = party.moment ? weighted(opts.filter((o) => o[1] && o[0] !== party.moment), (o) => o[1]) : ['toast']
  party.moment = m

  if (m === 'toast') {
    // Glasses up and clinked across the table; a little one in the high chair claps along
    sat.forEach((c) => (s.glasses[c.seat.n] ? setAct(s, c, 'clink', 2.4, pick(others(c))) : setAct(s, c, 'clap', 2.4)))
    s.fx?.show('tag', () => [CFG.table[0], 1.75, CFG.table[1]], T.tag, { name: 'Cheers!', liquid: '#D9A441' })
  } else if (m === 'cheer') {
    sat.forEach((c) => setAct(s, c, c.seat.high ? 'clap' : 'cheer', rand(1.4, 1.9)))
  } else if (m === 'joke') {
    // One tells a story (the others turn to listen), then the whole table laughs
    const grown = sat.filter((c) => !c.kid)
    const teller = pick(grown.length ? grown : sat)
    sat.forEach((c) => (c === teller ? setAct(s, c, 'talk', 1.8, pick(others(c))) : setAct(s, c, 'idle', 1.8)))
    s.jobs.push(
      seq(
        wait(1.8),
        call(() => {
          if (s.time >= party.leaveAt) return
          for (const c of party.members) if (c.step === 'seated' && c.sit) setAct(s, c, c.seat.high ? 'clap' : 'laugh', rand(1.3, 1.9))
        })
      )
    )
  } else if (m === 'pass') {
    // Someone holds their plate out for the nearest guest to try
    const a = pick(big)
    const near = (c) => Math.hypot(c.seat.plate[0] - a.seat.plate[0], c.seat.plate[2] - a.seat.plate[2])
    const b = big.filter((c) => c !== a).reduce((u, w) => (near(w) < near(u) ? w : u))
    const p = s.plates[a.seat.n]
    const home = a.seat.plate
    const out = [home[0] + (b.seat.plate[0] - home[0]) * 0.45, home[1] + 0.16, home[2] + (b.seat.plate[2] - home[2]) * 0.45]
    setAct(s, a, 'pass', 2.3, b)
    setAct(s, b, 'take', 2.3, a)
    s.jobs.push(seq(glide(p, home, out, 0.55), wait(1.1), glide(p, out, home, 0.55)))
  } else {
    kids.forEach((c) => setAct(s, c, c.seat.high ? 'clap' : 'wave', rand(1.8, 2.6)))
  }
}

// A group moment every few seconds once everyone has a plate, until just before they get up.
// The birthday cake is eaten bit by bit as the lunch goes on.
const groupLife = (s, party) => {
  let next = 1.5
  return (dt) => {
    if (s.time >= party.leaveAt - 3) return true
    const ck = s.cake
    if (party.cake && ck.visible && !ck.lit && !ck.holder) ck.left = Math.max(0.2, ck.left - dt * 0.03)
    if ((next -= dt) > 0) return false
    next = randIn(T.moment)
    groupMoment(s, party)
    return false
  }
}

// Birthday: the waiter brings the cake with its candles lit, the table cheers, the candles are blown out
function bringCake(s, party) {
  const wt = s.waiter
  const ck = s.cake
  const bday = party.bday
  const st = bday.seat
  return seq(
    pickUp(s, () => Object.assign(ck, { visible: true, left: 1, lit: true, holder: wt.slots[0], scale: TRAY_SCALE, seat: st })),
    wWalk(s, (w) => waiterTo(w, st.stand)),
    call(() => {
      wt.rot = faceTo(wt, cakeSpot(st))
      wt.pose = 'serve'
      wt.look = bday
    }),
    wait(0.25),
    call(() => s.fx?.show('tag', () => [ck.x, 1.6, ck.z], T.tag, { name: 'Happy Birthday!', liquid: '#F6C1CF' })),
    movePlate(ck, cakeSpot(st), 1, st.rot + Math.PI, null),
    call(() => {
      wt.pose = 'nod'
      for (const c of party.members) {
        if (c.step !== 'seated' || !c.sit) continue
        setAct(s, c, c === bday ? 'laugh' : c.seat.high ? 'clap' : 'cheer', T.candles)
      }
      s.jobs.push(seq(wait(T.candles), call(() => { ck.lit = false })))
    }),
    wait(0.45),
    call(() => { wt.pose = 'carry' })
  )
}

// Order once everyone sits, lunch once everyone is served, and the table goes to the waiter once they have left
function partyScript(s, party, fresh) {
  const all = (f) => () => party.members.every(f)
  const lead = party.members[0]
  return seq(
    fresh
      ? seq(
        until(all((m) => m.step === 'seated')),
        wait(0.6),
        call(() => Object.assign(lead, { act: 'order', actT: T.order + 0.6, actAge: 0 })),
        wait(T.order),
        call(() => s.orders.push(party)),
        until(all((m) => m.served)),
        call(() => {
          planMeal(s, party, randIn(T.stay))
          s.jobs.push(groupLife(s, party))
        })
      )
      : seq(),
    until(all((m) => m.away)),
    call(() => {
      s.toClear.push(...party.members.map((m) => m.seat))
      if (s.party === party) s.party = null
    })
  )
}

/* ---------- Waiter ---------- */
const wWalk = (s, route) => lazy(() => walkPath(s, s.waiter, route(s.waiter), CFG.waiterSpeed))
const v = new THREE.Vector3()

// A plate moves from the tray to the table (or back) in a small arc
function movePlate(p, to, scale, rot, onTray) {
  return lazy(() => {
    const from = [p.x, p.y, p.z]
    const s0 = p.scale
    const r0 = p.rot
    p.holder = null
    return seq(
      tween(T.place, (k) => {
        p.x = from[0] + (to[0] - from[0]) * k
        p.y = from[1] + (to[1] - from[1]) * k + Math.sin(Math.PI * k) * 0.12
        p.z = from[2] + (to[2] - from[2]) * k
        p.scale = s0 + (scale - s0) * k
        p.rot = r0 + wrap(rot - r0) * k
      }),
      call(() => { p.holder = onTray })
    )
  })
}

// To the kitchen counter for a tray-load (load = put things on the tray)
function pickUp(s, load) {
  const wt = s.waiter
  return seq(
    wWalk(s, toKitchen),
    call(() => {
      wt.rot = WT.kitchenRot
      wt.pose = 'reach'
      wt.look = null
    }),
    wait(T.pickup * 0.6),
    call(() => {
      load()
      wt.tray = true
    }),
    wait(T.pickup * 0.4),
    call(() => { wt.pose = 'carry' })
  )
}

// Every guest gets a plate: a tray holds four, so a big party takes two trips (nearest places first).
// A birthday party then gets its cake on one more trip.
function serveParty(s, party) {
  const wt = s.waiter
  const trips = chunk(byService(party.members.map((m) => m.seat)), SLOTS)
  return seq(
    call(() => {
      wt.look = party.members[0]
      wt.pose = 'nod'
    }),
    wait(T.notice),
    call(() => { wt.pose = 'idle' }),
    ...trips.map((trip) =>
      seq(
        pickUp(s, () =>
          trip.forEach((st, n) => {
            Object.assign(s.plates[st.n], { visible: true, dish: pickDish(s), left: 1, holder: wt.slots[n], scale: TRAY_SCALE })
          })
        ),
        ...trip.map((st) => {
          const p = s.plates[st.n]
          return seq(
            wWalk(s, (w) => waiterTo(w, st.stand)),
            call(() => {
              wt.rot = faceTo(wt, st.plate)
              wt.pose = 'serve'
              wt.look = st.by
            }),
            wait(0.25),
            movePlate(p, st.plate, st.plateScale, st.rot + Math.PI, null),
            call(() => {
              if (st.by) served(s, st.by)
              wt.pose = 'nod'
            }),
            wait(0.45),
            call(() => { wt.pose = 'carry' })
          )
        }),
        call(() => {
          wt.tray = false
          wt.pose = 'idle'
        })
      )
    ),
    party.cake && party.bday ? bringCake(s, party) : seq(),
    // Tray empty: a small bow to the table, then back to standing by
    call(() => {
      wt.tray = false
      wt.rot = faceTo(wt, [CFG.table[0], 0, CFG.table[1]])
      wt.pose = 'bow'
      wt.look = null
    }),
    wait(T.bow),
    call(() => {
      wt.pose = 'idle'
      wt.busy = false
    })
  )
}

// After the party has gone: a tray-load at a time (plates, and the cake after the birthday guest's plate),
// a wipe at every place, the load back to the kitchen, then the next
function clearTable(s, list) {
  const wt = s.waiter
  const items = []
  for (const st of byService(list)) {
    items.push({ st, p: s.plates[st.n] })
    if (s.cake.visible && s.cake.seat === st) items.push({ st, p: s.cake, cake: true })
  }
  const trips = chunk(items, SLOTS)
  return seq(
    call(() => { s.nextAt = Infinity }), // the gap to the next party starts once everything is cleared
    wait(T.clearDelay),
    ...trips.map((trip, i) =>
      seq(
        ...trip.map(({ st, p, cake }, n) =>
          seq(
            // The cake is taken from the same place as the plate before it (unless that went on the last trip)
            cake && n > 0 ? seq() : wWalk(s, (w) => waiterTo(w, st.stand)),
            call(() => {
              wt.rot = faceTo(wt, cake ? cakeSpot(st) : st.plate)
              wt.pose = 'serve'
              wt.tray = true
            }),
            wait(0.3),
            lazy(() => {
              if (!p.visible) return seq()
              wt.slots[n].getWorldPosition(v)
              return movePlate(p, [v.x, v.y, v.z], TRAY_SCALE, wt.rot, wt.slots[n])
            }),
            cake
              ? seq()
              : seq(
                call(() => {
                  wt.pose = 'wipe'
                  wt.cloth = true
                }),
                wait(T.wipe),
                call(() => {
                  wt.cloth = false
                  wt.pose = 'carry'
                  st.state = 'free'
                  st.booster = false
                  const g = s.glasses[st.n]
                  if (g) g.fill = CFG.water // and a fresh glass of water
                })
              )
          )
        ),
        call(() => {
          wt.pose = 'carry'
          if (i === trips.length - 1) s.nextAt = s.time + randIn(T.gap)
        }),
        wWalk(s, toKitchen),
        call(() => {
          wt.rot = WT.kitchenRot
          wt.pose = 'reach'
        }),
        wait(0.6),
        call(() => {
          for (const { p } of trip) Object.assign(p, { visible: false, holder: null })
          if (!s.cake.visible) s.cake.seat = null
          wt.tray = false
          wt.pose = 'idle'
        }),
        wait(0.3)
      )
    ),
    wWalk(s, toHome),
    call(() => { wt.busy = false })
  )
}

const waiterLoop = (s) => () => {
  const wt = s.waiter
  if (wt.busy) return false
  if (s.orders.length) {
    wt.busy = true
    s.jobs.push(serveParty(s, s.orders.shift()))
  } else if (s.toClear.length) {
    wt.busy = true
    s.jobs.push(clearTable(s, s.toClear.splice(0)))
  } else if (!atSpot(wt, WT.home, 0.05)) {
    wt.busy = true
    s.jobs.push(seq(wWalk(s, toHome), call(() => { wt.busy = false })))
  } else {
    wt.rot = WT.rot
    wt.pose = 'idle'
    wt.look = null
  }
  return false
}

/* ---------- Live / reduced-motion modes ---------- */
function setMode(s, calm) {
  s.calm = calm
  s.jobs = []
  s.orders = []
  s.toClear = []
  if (reception.hold) reception.hold = null
  for (const st of s.seats) Object.assign(st, { state: 'free', by: null, push: 0, pushNow: 0, booster: false })
  s.guests.forEach((c) =>
    Object.assign(c, { visible: false, busy: false, step: 'gone', party: null, sit: false, hipY: null, pose: 'idle', walking: false, yielding: false, amp: 0, bday: false })
  )
  s.plates.forEach((p) => Object.assign(p, { visible: false, holder: null }))
  Object.assign(s.cake, mkCake())
  s.glasses.forEach((g) => g && Object.assign(g, { holder: null, fill: CFG.water, x: g.home[0], y: g.home[1], z: g.home[2] }))
  const [hx, hz] = WT.home
  Object.assign(s.waiter, {
    x: hx, z: hz, px: hx, pz: hz, rot: WT.rot, pose: 'idle', tray: false, cloth: false, busy: false, look: null,
    walking: false, yielding: false, amp: 0,
  })
  s.lastDish = -1
  s.lastType = null
  s.party = null
  s.nextAt = Infinity
  s.snapFrames = 2
  s.fx?.hideAll()

  const party = seatInitial(s)
  // Reduced motion: the room stays as it is, nobody walks
  if (calm) return
  party.members.forEach((c) => s.jobs.push(seq(seatedLife(s, c), leave(s, c))))
  s.jobs.push(partyScript(s, party, false), groupLife(s, party), spawner(s), waiterLoop(s))
}

/* ---------- 3D: shared shapes and materials ---------- */
const G = {
  cyl: new THREE.CylinderGeometry(1, 1, 1, 18),
  ball: new THREE.SphereGeometry(1, 14, 10),
  box: new THREE.BoxGeometry(1, 1, 1),
  ring: new THREE.TorusGeometry(1, 0.07, 6, 28).rotateX(Math.PI / 2),
  wedge: new THREE.CylinderGeometry(1, 1, 1, 6, 1, false, 0, Math.PI / 3),
  base: new THREE.CylinderGeometry(1, 1, 1, 14).translate(0, 0.5, 0),
  cone: new THREE.ConeGeometry(1, 1, 14),
}
// One material per food colour, shared by every plate; at night they glow a little so the plates stay readable
const FOOD = new Map()
const foodMat = (color) => {
  let m = FOOD.get(color)
  if (!m) FOOD.set(color, (m = new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0, roughness: 0.6 })))
  return m
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
const BOB = BAR_STORY.bob

/* ---------- Guest (adults and kids: kids are smaller, with a bigger head) ---------- */
function Diner({ s, d, look }) {
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
  const hat = useRef()

  useFrame(() => {
    const o = root.current
    if (!o) return
    o.visible = d.visible
    if (!d.visible || (!s.dt && !s.snap)) return
    const dt = s.dt
    const t = s.time + d.i * 1.3
    const k = s.snap ? 1 : Math.min(1, dt * 12)
    d.obj = o
    o.scale.setScalar(d.size)
    head.current.scale.setScalar(d.kid ? 1.2 : 1)

    if (d.hipY != null) d.y = d.hipY - (d.sit ? 0.05 : 0.5) * d.size
    else d.y += (floorAt(d.x, d.z) - d.y) * (s.snap ? 1 : Math.min(1, dt * 14))
    // Shorter legs take quicker steps
    const sw = Math.sin(d.stride / d.size) * d.amp
    o.position.set(d.x, d.y + Math.abs(Math.sin(d.stride / d.size)) * BOB * d.amp * d.size, d.z)
    turn(o, d.rot, s.snap ? 1 : Math.min(1, dt * 10))

    legsStand.current.visible = !d.sit
    legsSit.current.visible = d.sit
    const act = d.sit ? d.act : d.pose
    const shake = act === 'laugh' || act === 'cheer' ? Math.abs(Math.sin(t * 13)) * 0.014 : 0
    // Towards the one they pass a plate to, clink with or talk to (+ = their right)
    const fy = d.focus?.sit ? clampYaw(Math.atan2(d.focus.x - d.x, d.focus.z - d.z) - o.rotation.y) : 0
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
        aL = -2.8 + Math.sin(t * 8) * 0.12
        zL = -0.2
      } else if (act === 'eat') {
        // Fork from the plate up to the mouth and back; eyes on the plate while scooping
        const u = (d.actAge % T.bite) / T.bite
        const lift = u < 0.35 || u > 0.9 ? 0 : Math.sin((Math.PI * (u - 0.35)) / 0.55) ** 2
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
      } else if (act === 'clap') {
        const a = 0.55 + Math.sin(t * 7) * 0.28
        aL = -1.3
        zL = a
        aR = -1.3
        zR = -a
      } else if (act === 'cheer') {
        // Both arms up
        aL = -2.85 + Math.sin(t * 11) * 0.15
        zL = -0.35
        aR = -2.85 + Math.sin(t * 11 + 1.3) * 0.15
        zR = 0.35
        hx = -0.18
      } else if (act === 'clink') {
        // Glass raised towards the table, pushed forward for the clink
        const u = clamp((d.actAge - 0.8) / 0.5, 0, 1)
        aR = -1.95 - Math.sin(Math.PI * u) * 0.3
        zR = -0.2 + fy * 0.3
        hx = -0.1
      } else if (act === 'pass') {
        // Holding the plate out with both hands
        aL = -1.35
        aR = -1.35
        zL = fy * 0.5
        zR = fy * 0.5
      } else if (act === 'take') {
        // Reaching for the plate held out
        if (fy < 0) {
          aL = -1.55
          zL = fy * 0.6
        } else {
          aR = -1.55
          zR = fy * 0.6
        }
      }
      if (d.kid) swing = act === 'swing' ? 0.55 : 0.12 // feet don't reach the floor
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

    // Head: towards whoever is talking (or whoever they talk to), otherwise looks around
    const h = head.current
    let yaw = Math.sin(t * 0.5) * 0.2
    if (d.sit) {
      const chat = (x) => x === 'talk' || x === 'laugh'
      const faces = chat(act) || act === 'clink' || act === 'pass' || act === 'take'
      const to = faces ? d.focus : d.party?.members.find((m) => m !== d && m.sit && chat(m.act))
      if (to?.sit) yaw = clampYaw(Math.atan2(to.x - d.x, to.z - d.z) - o.rotation.y)
      else if (act === 'look' || act === 'wave') yaw = d.lookYaw
      if (act === 'eat') yaw *= 0.3
    }
    h.rotation.y += (yaw - h.rotation.y) * Math.min(1, k * 0.6)
    if (act === 'nod') h.rotation.x = Math.max(0, Math.sin(t * 6)) * 0.25
    else h.rotation.x += (hx - h.rotation.x) * k
    // The party hat sits on the head
    if (hat.current) {
      hat.current.rotation.copy(h.rotation)
      hat.current.scale.copy(h.scale)
    }
  }, -1)

  return (
    <group ref={root} visible={false}>
      <Body
        gender={look.gender}
        shirt={look.shirt}
        pants={look.pants}
        hair={look.hair}
        skin={SKIN[look.skin]}
        seated
        phase={d.i * 1.1 + 0.7}
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
        {look.hat && (
          // Birthday party hat on the head: a cone with a pompom, tilted a little
          <group ref={hat} position={[0, 0.74, 0]}>
            <group position={[0, 0.145, -0.01]} rotation={[-0.12, 0, 0.1]}>
              <M geo={G.cone} pos={[0, 0.095, 0]} scale={[0.068, 0.19, 0.068]} color={look.hat} rough={0.6} />
              <M geo={G.ball} pos={[0, 0.195, 0]} scale={[0.024, 0.024, 0.024]} color={WHITE} rough={0.9} />
            </group>
          </group>
        )}
      </Body>
    </group>
  )
}

/* ---------- Waiter: tray of plates, wiping cloth, a bow ---------- */
// [left arm x, left arm z, right arm x, right arm z, lean forward]
const W_POSE = {
  idle: [0, 0, 0, 0, 0],
  nod: [0, 0, 0, 0, 0],
  carry: [0, 0, -1.3, 0, 0],
  serve: [0, 0, -1.55, -0.15, 0.12],
  reach: [-1.4, 0.1, -1.45, -0.1, 0.12],
  wipe: [-1.45, 0.25, -1.3, 0, 0.25],
  bow: [0, 0, 0, 0, 0.42],
}
const FORE = new THREE.Quaternion().setFromEuler(new THREE.Euler(-0.15, 0, 0)) // forearm bend in Body
const qa = new THREE.Quaternion()
const TRAY_AT = [[-0.13, 0.08], [0.13, 0.08], [-0.13, 0.27], [0.13, 0.27]]

function Waiter({ s }) {
  const wt = s.waiter
  const root = useRef()
  const upper = useRef()
  const head = useRef()
  const armL = useRef()
  const armR = useRef()
  const legL = useRef()
  const legR = useRef()
  const kneeL = useRef()
  const kneeR = useRef()
  const tray = useRef()
  const cloth = useRef()
  const cur = useRef([0, 0, 0, 0, 0])
  const look = WT.look

  useFrame(() => {
    const o = root.current
    if (!o || (!s.dt && !s.snap)) return
    const dt = s.dt
    const t = s.time + 2.3
    const k = s.snap ? 1 : Math.min(1, dt * 10)
    wt.obj = o
    o.position.set(wt.x, 0.1 + Math.abs(Math.sin(wt.stride)) * BOB * wt.amp, wt.z)
    turn(o, wt.rot, s.snap ? 1 : Math.min(1, dt * 10))

    const sw = Math.sin(wt.stride) * wt.amp
    legL.current.rotation.x = sw * 0.7
    legR.current.rotation.x = -sw * 0.7
    kneeL.current.rotation.x = Math.max(0, sw) * 0.9
    kneeR.current.rotation.x = Math.max(0, -sw) * 0.9

    // Arms ease towards the pose; a loaded tray stays up whatever else she does
    const c = cur.current
    ;(W_POSE[wt.pose] || W_POSE.idle).forEach((p, n) => {
      const goal = n === 2 && wt.tray ? Math.min(p, -1.3) : p
      c[n] += (goal - c[n]) * k
    })
    let [lx, lz, rx, rz] = c
    lx -= sw * 0.5
    if (!wt.tray) rx += sw * 0.5
    if (wt.pose === 'wipe') {
      lx += Math.sin(t * 6) * 0.18
      lz += Math.cos(t * 6) * 0.2
    } else if (!wt.walking) {
      lx += Math.sin(t * 1.5) * 0.04
    }
    armL.current.rotation.set(lx, 0, lz)
    armR.current.rotation.set(rx, 0, rz)
    upper.current.rotation.x = c[4]

    // Head: nod, bow, eyes on the table while wiping, otherwise towards the guest she serves
    const h = head.current
    if (wt.pose === 'nod') h.rotation.x = Math.max(0, Math.sin(t * 6)) * 0.22
    else h.rotation.x += ((wt.pose === 'wipe' ? 0.3 : wt.pose === 'bow' ? 0.25 : 0.05) - h.rotation.x) * k
    let yaw = Math.sin(t * 0.5) * 0.2
    if (wt.look?.visible) yaw = clampYaw(Math.atan2(wt.look.x - wt.x, wt.look.z - wt.z) - o.rotation.y)
    h.rotation.y += (yaw - h.rotation.y) * Math.min(1, k * 0.8)

    // Tray stays level in the hand (undo the lean, the arm and the forearm bend)
    tray.current.visible = wt.tray
    qa.copy(upper.current.quaternion).multiply(armR.current.quaternion).multiply(FORE).invert()
    tray.current.quaternion.copy(qa)
    cloth.current.visible = wt.cloth
  }, -1)

  return (
    <group ref={root}>
      <Body
        gender={look.gender}
        shirt={look.shirt}
        apron={look.apron}
        hair={look.hair}
        skin={SKIN[look.skin]}
        phase={1.1}
        r={{ upper, head, armL, armR, legL, legR, kneeL, kneeR }}
        rightHand={
          <group ref={tray} position={[0, -0.25, 0.03]} visible={false}>
            <M geo={G.box} pos={[0, 0, 0.17]} scale={[0.56, 0.018, 0.46]} color={C.wood} />
            <M geo={G.box} pos={[0, 0.012, 0.17]} scale={[0.52, 0.008, 0.42]} color="#E9DFC9" shadow={false} />
            {TRAY_AT.map(([x, z], n) => (
              <object3D key={n} ref={(o) => (wt.slots[n] = o)} position={[x, 0.016, z]} />
            ))}
          </group>
        }
        leftHand={
          <group ref={cloth} position={[0, -0.26, 0.03]} visible={false}>
            <M geo={G.box} scale={[0.09, 0.014, 0.07]} color={C.cloth} rough={0.95} shadow={false} />
          </group>
        }
      />
    </group>
  )
}

/* ---------- Chairs and the high chair (chairs slide back when someone sits down or gets up) ---------- */
function ChairShape() {
  return (
    <>
      <M geo={G.box} pos={[0, 0.4, 0]} scale={[0.45, 0.08, 0.45]} color={C.woodLight} />
      <M geo={G.box} pos={[0, 0.65, -0.2]} scale={[0.45, 0.5, 0.06]} color={C.woodLight} />
      <M geo={G.box} pos={[0, 0.2, 0]} scale={[0.08, 0.4, 0.08]} color={C.wood} />
    </>
  )
}

function Seats({ s }) {
  const chairs = useRef([])
  const boosters = useRef([])

  useFrame(() => {
    if (!s.dt && !s.snap) return
    const k = s.snap ? 1 : Math.min(1, s.dt * 6)
    s.seats.forEach((st, n) => {
      const o = chairs.current[n]
      if (!o) return
      st.pushNow += (st.push - st.pushNow) * k
      const back = CFG.chairPull * st.pushNow
      o.position.set(st.x - st.fx * back, 0.1, st.z - st.fz * back)
      boosters.current[n].visible = st.booster
    })
  })

  return (
    <>
      {s.seats.map((st, n) =>
        st.high ? (
          // The high chair's seat sits a little behind its centre
          <HighChair key={st.id} x={st.x + 0.04 * st.fx} z={st.z + 0.04 * st.fz} rot={st.rot} />
        ) : (
          <group key={st.id} ref={(o) => (chairs.current[n] = o)} position={[st.x, 0.1, st.z]} rotation={[0, st.rot, 0]}>
            <ChairShape />
            {/* Cushion so a child reaches the table */}
            <group ref={(o) => (boosters.current[n] = o)} visible={false}>
              <M geo={G.box} pos={[0, 0.49, 0.02]} scale={[0.36, 0.1, 0.34]} color={C.terra} rough={0.95} />
            </group>
          </group>
        )
      )}
    </>
  )
}

/* ---------- Plate: every dish is built once, the current one shown; food shrinks as it is eaten ---------- */
const STEAM = [0, 1, 2]

function Plate({ s, p }) {
  const root = useRef()
  const dishes = useRef([])
  const pieces = useRef(CFG.dishes.map(() => []))
  const puffs = useRef([])
  const shown = useRef(null)
  const shaped = useRef(-1)

  useFrame(() => {
    const o = root.current
    if (!o) return
    o.visible = p.visible
    if (!p.visible || (!s.dt && !s.snap)) return
    if (p.holder) {
      // On the tray: ride along with the waiter's hand
      p.holder.getWorldPosition(v)
      p.x = v.x
      p.y = v.y
      p.z = v.z
      if (s.waiter.obj) p.rot = s.waiter.obj.rotation.y
    }
    o.position.set(p.x, p.y, p.z)
    o.rotation.y = p.rot
    o.scale.setScalar(Math.max(0.001, p.scale))

    // Looked up by name: after a hot reload the menu is a new array but plates still hold the old dishes
    if (shown.current?.dish !== p.dish) {
      const j = CFG.dishes.findIndex((d) => d.name === p.dish.name)
      dishes.current.forEach((g, n) => (g.visible = n === j))
      shown.current = { dish: p.dish, j }
      shaped.current = -1
    }
    const j = shown.current.j
    if (j < 0) return
    const dish = CFG.dishes[j]
    // Eaten: a piece shrinks away once the food left passes its mark, mounds get smaller as they go
    if (shaped.current !== p.left) {
      shaped.current = p.left
      const left = p.left
      dish.parts.forEach(([, pos, size, , eat], n) => {
        if (eat == null) return
        const m = eat === 'mound' ? (left < 0.1 ? 0 : 0.2 + 0.8 * left) : clamp((left - eat) / 0.15, 0, 1)
        const mesh = pieces.current[j][n]
        mesh.visible = m > 0.001
        mesh.scale.set(size[0] * m || 1e-4, size[1] * m || 1e-4, size[2] * m || 1e-4)
        if (eat === 'mound') mesh.position.y = pos[1] * m
      })
    }

    // Light steam over hot food
    const warm = dish.hot && !s.calm ? clamp((p.left - 0.2) / 0.3, 0, 1) : 0
    STEAM.forEach((i) => {
      const m = puffs.current[i]
      m.visible = warm > 0
      if (!warm) return
      const q = (s.time * 0.35 + i / 3) % 1
      m.position.set(Math.sin(s.time + i * 2) * 0.03, 0.08 + q * 0.4, Math.cos(i * 2.1) * 0.03)
      m.scale.setScalar(0.035 * (0.6 + q * 1.3))
      m.material.opacity = 0.38 * (1 - q) * warm
    })
  }, -0.5)

  return (
    <group ref={root} visible={false}>
      {CFG.dishes.map((dish, j) => (
        <group key={dish.name} ref={(o) => (dishes.current[j] = o)} visible={false}>
          {dish.parts.map(([shape, pos, size, color, , rot], n) => (
            <mesh
              key={n}
              ref={(o) => (pieces.current[j][n] = o)}
              geometry={G[shape]}
              material={foodMat(color)}
              position={pos}
              scale={size}
              rotation={Array.isArray(rot) ? rot : [0, rot ?? 0, 0]}
              receiveShadow={n === 0}
            />
          ))}
        </group>
      ))}
      {STEAM.map((i) => (
        <mesh key={i} ref={(o) => (puffs.current[i] = o)} geometry={G.ball} visible={false}>
          <meshBasicMaterial color="#FFFFFF" transparent opacity={0} depthWrite={false} />
        </mesh>
      ))}
    </group>
  )
}

/* ---------- Water glass: lifted to the mouth for a sip ---------- */
function WaterGlass({ s, g }) {
  const root = useRef()
  const water = useRef()

  useFrame(() => {
    const o = root.current
    if (!o || (!s.dt && !s.snap)) return
    if (g.holder?.hand && g.holder.visible) {
      g.holder.hand.getWorldPosition(v)
      v.y -= 0.05
      g.blend = s.snap ? 1 : Math.min(1, g.blend + s.dt / 0.3)
      g.x += (v.x - g.x) * g.blend
      g.y += (v.y - g.y) * g.blend
      g.z += (v.z - g.z) * g.blend
    } else {
      const k = s.snap ? 1 : Math.min(1, s.dt * 9)
      g.x += (g.home[0] - g.x) * k
      g.y += (g.home[1] - g.y) * k
      g.z += (g.home[2] - g.z) * k
    }
    o.position.set(g.x, g.y, g.z)
    water.current.scale.y = Math.max(0.001, g.fill * 0.088)
  }, -0.5)

  return (
    <group ref={root}>
      <mesh geometry={G.base} scale={[0.032, 0.1, 0.032]} renderOrder={2}>
        <meshStandardMaterial color="#EAF6F8" transparent opacity={0.35} roughness={0.08} depthWrite={false} />
      </mesh>
      <mesh ref={water} geometry={G.base} position={[0, 0.006, 0]} scale={[0.027, 0.07, 0.027]}>
        <meshStandardMaterial color="#CFE8F0" transparent opacity={0.8} roughness={0.2} />
      </mesh>
    </group>
  )
}

/* ---------- Birthday cake: six slices that go one by one, candles lit when it arrives ---------- */
const CAKE_SLICES = Array.from({ length: 6 }, (_, i) => ({ a: (i * Math.PI) / 3, eat: 0.88 - i * 0.13 }))
const CANDLES = [0, 2.1, 4.2]

function Cake({ s }) {
  const ck = s.cake
  const root = useRef()
  const slices = useRef([])
  const candles = useRef()
  const flames = useRef([])

  useFrame(() => {
    const o = root.current
    if (!o) return
    o.visible = ck.visible
    if (!ck.visible || (!s.dt && !s.snap)) return
    if (ck.holder) {
      // On the tray: ride along with the waiter's hand
      ck.holder.getWorldPosition(v)
      ck.x = v.x
      ck.y = v.y
      ck.z = v.z
      if (s.waiter.obj) ck.rot = s.waiter.obj.rotation.y
    }
    o.position.set(ck.x, ck.y, ck.z)
    o.rotation.y = ck.rot
    o.scale.setScalar(Math.max(0.001, ck.scale))
    CAKE_SLICES.forEach(({ eat }, i) => {
      const m = clamp((ck.left - eat) / 0.12, 0, 1)
      slices.current[i].visible = m > 0.001
      slices.current[i].scale.setScalar(m || 1e-4)
    })
    candles.current.visible = ck.left > 0.95
    flames.current.forEach((f, i) => {
      f.visible = ck.lit
      f.scale.set(0.011, 0.02 * (1 + Math.sin(s.time * 17 + i * 2) * 0.2), 0.011)
    })
  }, -0.5)

  return (
    <group ref={root} visible={false}>
      <mesh geometry={G.cyl} material={foodMat(WHITE)} position={[0, 0.006, 0]} scale={[0.15, 0.012, 0.15]} receiveShadow />
      <mesh geometry={G.ring} material={foodMat('#F6C1CF')} position={[0, 0.012, 0]} scale={[0.145, 0.145, 0.145]} />
      {CAKE_SLICES.map(({ a }, i) => {
        const m = a + Math.PI / 6
        return (
          <group key={i} ref={(o) => (slices.current[i] = o)}>
            <mesh geometry={G.wedge} material={foodMat('#F3D9A4')} position={[0, 0.06, 0]} rotation={[0, a, 0]} scale={[0.12, 0.09, 0.12]} castShadow />
            <mesh geometry={G.wedge} material={foodMat('#F6C1CF')} position={[0, 0.06, 0]} rotation={[0, a, 0]} scale={[0.121, 0.012, 0.121]} />
            <mesh geometry={G.wedge} material={foodMat('#FFF6EA')} position={[0, 0.11, 0]} rotation={[0, a, 0]} scale={[0.123, 0.014, 0.123]} />
            <mesh geometry={G.ball} material={foodMat('#D7263D')} position={[Math.sin(m) * 0.095, 0.125, Math.cos(m) * 0.095]} scale={[0.012, 0.012, 0.012]} />
          </group>
        )
      })}
      <group ref={candles}>
        {CANDLES.map((a, i) => (
          <group key={i} position={[Math.sin(a) * 0.045, 0, Math.cos(a) * 0.045]}>
            <mesh geometry={G.cyl} material={foodMat(i % 2 ? '#4FB3BF' : '#F2C94C')} position={[0, 0.142, 0]} scale={[0.006, 0.05, 0.006]} />
            <mesh ref={(o) => (flames.current[i] = o)} geometry={G.ball} position={[0, 0.183, 0]} visible={false}>
              <meshBasicMaterial color="#FFC75A" />
            </mesh>
          </group>
        ))}
      </group>
    </group>
  )
}

/* ---------- Birthday balloons, tied to the back of the birthday guest's chair ---------- */
const UP = new THREE.Vector3(0, 1, 0)
const KNOT = new THREE.Vector3(0, 0.9, 0) // top of the chair back
const BALLOONS = [[-0.2, 1.62, -0.14], [0.04, 1.86, -0.28], [0.23, 1.58, -0.1]].map((at) => {
  const dir = new THREE.Vector3(...at).sub(KNOT)
  return {
    at,
    mid: KNOT.clone().addScaledVector(dir, 0.5).toArray(),
    len: dir.length(),
    rot: new THREE.Euler().setFromQuaternion(new THREE.Quaternion().setFromUnitVectors(UP, dir.clone().normalize())).toArray().slice(0, 3),
  }
})

function Balloons({ s }) {
  const root = useRef()
  const sway = useRef()

  useFrame(() => {
    const o = root.current
    if (!o) return
    const c = s.guests.find((g) => g.bday && g.sit)
    o.visible = !!c
    if (!c) return
    const st = c.seat
    const back = CFG.chairPull * st.pushNow + 0.2
    o.position.set(st.x - st.fx * back, 0.1, st.z - st.fz * back)
    o.rotation.y = st.rot
    sway.current.rotation.z = Math.sin(s.time * 1.3) * 0.035
    sway.current.rotation.x = Math.sin(s.time * 0.9 + 1) * 0.025
  })

  return (
    <group ref={root} visible={false}>
      <group ref={sway} position={KNOT.toArray()}>
        <group position={KNOT.clone().negate().toArray()}>
          {BALLOONS.map((b, i) => (
            <group key={i}>
              <mesh geometry={G.cyl} position={b.mid} rotation={b.rot} scale={[0.003, b.len, 0.003]}>
                <meshStandardMaterial color="#F5F0E6" roughness={0.9} />
              </mesh>
              <M geo={G.ball} pos={b.at} scale={[0.1, 0.12, 0.1]} color={CFG.outfits.balloons[i % CFG.outfits.balloons.length]} rough={0.35} />
              <M geo={G.cone} pos={[b.at[0], b.at[1] - 0.125, b.at[2]]} scale={[0.018, 0.025, 0.018]} color={CFG.outfits.balloons[i % CFG.outfits.balloons.length]} rough={0.35} shadow={false} />
            </group>
          ))}
        </group>
      </group>
    </group>
  )
}

/* ---------- Main ---------- */
const DEFAULT_LOOK = { gender: 'boy', shirt: '#3E5C76', hair: '#2B1D14', pants: '#2B1D14', skin: 1 }

// Private dining: a party at a time comes in through reception, sits round the long table, orders,
// the waiter brings each plate from the kitchen, they have lunch and leave, and the table is cleared
// and wiped before the next party arrives.
export default function PrivateDiningStory({ night }) {
  const ref = useRef(null)
  if (!ref.current) ref.current = createStory()
  const s = ref.current
  const [looks, setLooks] = useState(() => Array.from({ length: POOL }, () => DEFAULT_LOOK))
  s.setLooks = (list) =>
    setLooks((prev) => {
      const next = prev.slice()
      for (const [i, look] of list) next[i] = look
      return next
    })
  const gl = useThree((st) => st.gl)

  useEffect(() => {
    for (const m of FOOD.values()) m.emissiveIntensity = night ? 0.14 : 0
  }, [night])

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
      if (reception.hold) reception.hold = null
      const w = journeyWorld()
      if (w) w.extras = w.extras.filter((a) => !s.mine.includes(a))
      fx.remove()
      s.fx = null
      s.jobs = []
    }
  }, [gl, s])

  // After BarStory (-2): it resets w.extras to its own people each frame, we add ours
  useFrame((state, delta) => {
    const w = journeyWorld()
    if (w && !w.extras.includes(s.waiter)) w.extras = w.extras.concat(s.mine)
    // Tab hidden: freeze everything (no catch-up jump when it comes back)
    if (s.hidden) {
      s.dt = 0
      s.snap = false
      for (const a of s.mine) {
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
    for (const a of s.mine) {
      a.x = a.px
      a.z = a.pz
    }
    // Everyone to walk round: ours and the bar's (w.extras), then the dining hall's
    s.walkers.length = 0
    s.walkers.push(...(w ? w.extras : s.mine))
    if (w) s.walkers.push(w.host, ...w.waiters, ...w.guests)

    // Jobs may start new jobs (parties, serving, clearing): keep those too
    const running = s.jobs
    s.jobs = []
    s.jobs = running.filter((job) => !job(dt)).concat(s.jobs)

    for (const a of s.mine) {
      a.px = a.x
      a.pz = a.z
    }
  }, -1.9)

  // Dish tags: after the camera has moved this frame (same as the bar's drink tags)
  useFrame((state) => {
    if (s.fx && !s.hidden && !s.calm) placeFx(s, state.camera, state.size)
  }, -0.1)

  return (
    <group>
      <Seats s={s} />
      <Waiter s={s} />
      {s.guests.map((d, i) => (
        <Diner key={i} s={s} d={d} look={looks[i]} />
      ))}
      {s.plates.map((p, i) => (
        <Plate key={i} s={s} p={p} />
      ))}
      {s.glasses.map((g, i) => g && <WaterGlass key={i} s={s} g={g} />)}
      <Cake s={s} />
      <Balloons s={s} />

      {/* Night: warm lamp glow over the table */}
      <pointLight position={[CFG.table[0], 1.35, CFG.table[1]]} color="#FFB35C" intensity={night ? 3 : 0} distance={3.8} decay={2} />
    </group>
  )
}
