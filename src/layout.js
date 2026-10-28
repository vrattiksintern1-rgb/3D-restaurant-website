/* ---------- Bahar nu layout (Outside, Neighbourhood ane Ground traney aa j vapre) ---------- */

export const C = {
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
  // Padoshi buildings: halka, havadar rang
  facade: '#EFE9DD',
  facade2: '#E4E8E1',
  facade3: '#F4EEE4',
  roof: '#D6D0C4',
  teal: '#2F6F73',
  tealGlass: '#4C9A9C',
  rail: '#FAF7F0',
  pitch: '#8DBA5A',
  pitch2: '#7DAA4C',
}

export const G = -0.3               // bahar ni jamin (ground) nu top
export const ROAD_Y = -0.27         // rasto ane parking nu top
export const WALK_Y = -0.2          // footpath nu top
export const END = 70               // rasta na cheda (gadi aahi thi pachhi phare)
export const EDGE = 500             // jamin ane rasta na cheda: camera aanathi aagal kyarey na pahoche

// Aagal no rasto (left-hand traffic: east jati gadi -z baju, west jati +z baju)
export const ROAD = [11.4, 15.4]    // restaurant ni saame no rasto (z)
export const LANE_E = 12.4          // east (+x) jati gadio
export const LANE_W = 14.4          // west (-x) jati gadio
export const WALK_N = [10.2, 11.4]  // restaurant baju ni footpath
export const WALK_F = [15.4, 16.6]  // same baju ni footpath

// Pachhal no rasto
export const BACK = [-19.6, -15.6]
export const BACK_E = -18.6
export const BACK_W = -16.6
export const BWALK_N = [-15.6, -14.4]
export const BWALK_S = [-20.8, -19.6]

// Dabi baju ni avenue (x): banne rasta ne jode, aama traffic nathi (fakt parked gadio)
export const AVE = [-16.4, -12.4]
export const AWALK_W = [-17.6, -16.4]
export const AWALK_E = [-12.4, -11.2]

export const DRIVE = [14, 17]       // parking ma javano raasto (x)
export const LOT = { x0: 10, x1: 21.5, z0: -7, z1: 10.2 }
export const AISLE_X = 15.5
export const ROW_W = 12.1           // parking ni west line (gadi restaurant taraf moh rakhe)
export const ROW_E = 18.9           // parking ni east line
export const SPOT_Z = [-3.9, -1.6, 0.7, 3.0, 5.3, 7.6]

// Zebra crossing
export const CROSS_X = -4.9         // porch ni saame (aagal ane pachhal na raste)
export const AVE_CROSS = [8.3, -12.5] // avenue upar (z)

// Restaurant no plot (safed railing) ane gate
export const PLOT = { x0: -10.6, x1: 22.5, z0: -14, z1: 10.05 }
export const GATE = [-6.4, -3.6]

/* ---------- Buildings (x, z = aagal ni diwal nu vachhe nu bindu, moh local +z) ---------- */
export const STORE_H = 3.4          // niche no maal (dukan)
export const FLOOR_H = 2.8          // upar na maal
const WEST = Math.PI / 2            // moh +x (restaurant taraf)
export const BUILDINGS = [
  // Avenue ni pele paar
  { x: -18, z: 6.0, rot: WEST, w: 7, d: 8, floors: 3, wall: C.facade,
    store: { name: 'Brewnook Café', tag: 'Coffee & Bakes', accent: C.terra } },
  { x: -18, z: -2.2, rot: WEST, w: 7, d: 8, floors: 4, wall: C.facade2,
    store: { name: 'Basket Bazaar', tag: 'Fresh grocery daily', accent: C.olive } },
  { x: -18, z: -10.4, rot: WEST, w: 7, d: 8, floors: 3, wall: C.facade3,
    store: { name: 'Pillwell Pharmacy', tag: 'Medicines & care', accent: C.teal } },
  // Pachhal na rasta ni pele paar
  { x: -8, z: -21.2, rot: 0, w: 7, d: 8, floors: 3, wall: C.facade2,
    store: { name: 'Dog-Ear Books', tag: 'New & used reads', accent: C.gold } },
  { x: 0, z: -21.2, rot: 0, w: 7, d: 8, floors: 4, wall: C.facade,
    store: { name: 'Solestep Shoes', tag: 'Walk in comfort', accent: C.ink } },
  { x: 8, z: -21.2, rot: 0, w: 7, d: 8, floors: 3, wall: C.facade3,
    store: { name: 'Voltnest Electronics', tag: 'Gadgets & repairs', accent: '#3E5C76' } },
  // Khuna nu office block (dukan vagar)
  { x: -21, z: -21.2, rot: 0, w: 8, d: 8, floors: 4, wall: C.facade,
    office: { name: 'Larkspur House', tag: 'Offices & studios' } },
]
// Teal kaach no tower (pachhal-jamni baju, camera thi door)
export const TOWER = { x: 20, z: -21.4, rot: 0, w: 7, d: 7, floors: 5, fh: 3.2 }

/* ---------- Ramat nu medan (front-right baju: fakt nichi vastuo) ---------- */
export const FIELD = { x0: 8.5, x1: 27.5, z0: 20, z1: 30.5 }
export const FIELD_FENCE = { x0: 6.6, x1: 29.4, z0: 18.4, z1: 32 }
export const FIELD_GATE = [17, 19]

/* ---------- Bagicho, bus stop, bench, palm ---------- */
export const BUS_STOP = [-14, 17.5]
export const PARK_PATH = { x0: -5.6, x1: -4.2, z0: WALK_F[1], z1: 21 }
export const PLAZA = { x0: -8.2, x1: -1.6, z0: 21, z1: 25 }
export const BENCHES = [
  [-7.2, 24.4, Math.PI], [-4.9, 24.4, Math.PI], [-2.6, 24.4, Math.PI],
  [12.5, 19.0, 0], [23.5, 19.0, 0],
]
export const PALMS = [
  [5.2, 20.5, 1], [5.0, 24.2, 1.1], [5.3, 27.8, 0.95], [5.0, 31.2, 1.05],
  [-9.6, 22.0, 1], [-0.4, 22.4, 0.9], [-12.6, 26.5, 1.1],
  [13.9, -26, 1], [12.6, -29.5, 0.9],
]
