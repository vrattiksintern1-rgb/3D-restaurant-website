import { Person } from './Characters'

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
}
const SKIN = ['#F1C9A5', '#E8B08A', '#C98B62', '#A8683F']
const BOTTLES = [C.olive, '#8C3B2E', C.gold, '#2F3B42', C.terra, C.cream, '#3E5C76']

/* ---------- Nana helpers ---------- */
function Part({ pos, size, color, rot, ...mat }) {
  return (
    <mesh position={pos} rotation={rot} castShadow receiveShadow>
      <boxGeometry args={size} />
      <meshStandardMaterial color={color} {...mat} />
    </mesh>
  )
}
function Cyl({ pos, r, r2 = r, h, color, seg = 16, ...mat }) {
  return (
    <mesh position={pos} castShadow>
      <cylinderGeometry args={[r, r2, h, seg]} />
      <meshStandardMaterial color={color} {...mat} />
    </mesh>
  )
}
function Bulb({ pos, r = 0.07, night, power = 2.5 }) {
  return (
    <mesh position={pos}>
      <sphereGeometry args={[r, 10, 10]} />
      <meshStandardMaterial color="#FFE2A8" emissive="#FFB35C" emissiveIntensity={night ? power : 0.15} />
    </mesh>
  )
}
function Drink({ pos, color = '#E39A3B' }) {
  return (
    <group position={pos}>
      <Cyl pos={[0, 0.07, 0]} r={0.05} h={0.14} color={color} seg={10} />
      <Cyl pos={[0, 0.145, 0]} r={0.052} h={0.01} color={C.cream} seg={10} />
    </group>
  )
}
function Plate({ pos }) {
  return (
    <group position={pos}>
      <Cyl pos={[0, 0.015, 0]} r={0.17} h={0.03} color={C.plate} seg={18} />
      <mesh position={[0, 0.05, 0]} scale={[1, 0.5, 1]}>
        <sphereGeometry args={[0.08, 10, 10]} />
        <meshStandardMaterial color={C.terra} />
      </mesh>
    </group>
  )
}
function Pot({ pos, s = 1 }) {
  return (
    <group position={pos} scale={s}>
      <Cyl pos={[0, 0.25, 0]} r={0.28} r2={0.2} h={0.5} color={C.terra} seg={12} />
      <mesh position={[0, 0.8, 0]} castShadow>
        <icosahedronGeometry args={[0.42, 0]} />
        <meshStandardMaterial color={C.oliveDark} flatShading />
      </mesh>
      <mesh position={[0.15, 1.12, 0.08]} castShadow>
        <icosahedronGeometry args={[0.28, 0]} />
        <meshStandardMaterial color={C.olive} flatShading />
      </mesh>
    </group>
  )
}

// Khurshi: aagal (+z) taraf moh. y = jamin nu level
function Chair({ x, z, rot, y = 0.1, color = C.terra }) {
  return (
    <group position={[x, y, z]} rotation={[0, rot, 0]}>
      <Part pos={[0, 0.4, 0]} size={[0.45, 0.08, 0.45]} color={color} />
      <Part pos={[0, 0.65, -0.2]} size={[0.45, 0.5, 0.06]} color={color} />
      <Part pos={[0, 0.2, 0]} size={[0.08, 0.4, 0.08]} color={C.wood} />
    </group>
  )
}
// Ucho stool (bar mate)
function Stool({ x, z }) {
  return (
    <group position={[x, 0.1, z]}>
      <Cyl pos={[0, 0.02, 0]} r={0.18} h={0.04} color={C.ink} />
      <Cyl pos={[0, 0.4, 0]} r={0.04} h={0.76} color={C.gold} seg={8} />
      <Cyl pos={[0, 0.78, 0]} r={0.22} h={0.08} color={C.terra} />
    </group>
  )
}
// Bethelo manas (seat top = y)
function Guest({ x, y, z, rot, i, mode = 'sit' }) {
  const shirts = ['#3E5C76', '#8C3B2E', '#D9A441', '#5C6B3A', '#7A4E7E', '#2F6F73', '#B5651D', '#A34A5A']
  const hairs = ['#2B1D14', '#5A3A22', '#1A1A1A', '#8B5A2B']
  return (
    <Person
      pos={[x, y, z]} rot={rot} seated mode={mode} phase={i * 0.9}
      gender={i % 2 ? 'girl' : 'boy'}
      shirt={shirts[i % shirts.length]} hair={hairs[i % hairs.length]} skin={SKIN[(i * 3) % 4]}
    />
  )
}

/* ---------- Bar ---------- */
const STOOLS = [-6.4, -5.2, -4.0, -2.8]
const HIGH_TABLES = [-6.3, -3.3]

function Bar({ night }) {
  return (
    <group>
      {/* Counter */}
      <Part pos={[-4.3, 0.55, -9.5]} size={[5.6, 0.9, 0.7]} color={C.wood} />
      <Part pos={[-4.3, 1.04, -9.45]} size={[5.8, 0.08, 0.9]} color={C.cream} />
      <Part pos={[-4.3, 0.85, -9.14]} size={[5.6, 0.06, 0.02]} color={C.gold} />
      <Part pos={[-4.3, 0.28, -9.0]} size={[5.6, 0.05, 0.05]} color={C.gold} />
      {STOOLS.map((x) => (
        <Stool key={x} x={x} z={-8.55} />
      ))}
      {[[-6.4, '#8C3B2E'], [-5.2, '#E39A3B'], [-2.8, C.olive]].map(([x, col]) => (
        <Drink key={x} pos={[x, 1.08, -9.3]} color={col} />
      ))}
      <Guest x={-6.4} y={0.92} z={-8.55} rot={Math.PI} i={0} />
      <Guest x={-5.2} y={0.92} z={-8.55} rot={Math.PI} i={1} mode="talk" />
      <Guest x={-2.8} y={0.92} z={-8.55} rot={Math.PI} i={2} />

      {/* Bartender */}
      <Person pos={[-4.3, 0.1, -10.3]} rot={0} shirt={C.ink} apron={C.terra} skin={SKIN[2]} mode="work" phase={0.4} />
      <Part pos={[-3.7, 1.15, -9.6]} size={[0.12, 0.2, 0.12]} color="#B8B8B8" />

      {/* Pachhal ni bottle shelf */}
      <Part pos={[-4.3, 0.55, -11.7]} size={[6, 0.9, 0.55]} color={C.wood} />
      <Part pos={[-4.3, 1.04, -11.7]} size={[6.1, 0.08, 0.6]} color={C.cream} />
      {[1.6, 2.2].map((y, row) => (
        <group key={y}>
          <Part pos={[-4.3, y, -11.82]} size={[5.6, 0.05, 0.35]} color={C.woodLight} />
          {Array.from({ length: 13 }, (_, k) => (
            <group key={k} position={[-6.7 + k * 0.4, y + 0.025, -11.82]}>
              <Cyl pos={[0, 0.14, 0]} r={0.06} h={0.28} color={BOTTLES[(k + row * 3) % BOTTLES.length]} seg={8} />
              <Cyl pos={[0, 0.33, 0]} r={0.022} h={0.1} color={C.ink} seg={6} />
            </group>
          ))}
        </group>
      ))}

      {/* Counter upar latakta lamp */}
      {[-6, -4.3, -2.6].map((x) => (
        <group key={x} position={[x, 0, -9.45]}>
          <Cyl pos={[0, 2.75, 0]} r={0.01} h={0.5} color={C.ink} seg={6} />
          <Cyl pos={[0, 2.42, 0]} r={0.06} r2={0.22} h={0.2} color={C.ink} />
          <Bulb pos={[0, 2.3, 0]} r={0.08} night={night} />
        </group>
      ))}

      {/* Ucha table */}
      {HIGH_TABLES.map((x) => (
        <group key={x}>
          <Cyl pos={[x, 0.55, -7.1]} r={0.06} h={0.9} color={C.ink} seg={8} />
          <Cyl pos={[x, 1.02, -7.1]} r={0.42} h={0.05} color={C.cream} seg={20} />
          <Stool x={x - 0.6} z={-7.1} />
          <Stool x={x + 0.6} z={-7.1} />
        </group>
      ))}
      <Guest x={-6.9} y={0.92} z={-7.1} rot={Math.PI / 2} i={3} mode="talk" />
      <Guest x={-5.7} y={0.92} z={-7.1} rot={-Math.PI / 2} i={4} />
      <Drink pos={[-6.45, 1.045, -7.05]} color="#8C3B2E" />
      <Drink pos={[-6.15, 1.045, -7.15]} color="#E39A3B" />

      {/* Bar ane private dining vachhe lakda ni jali */}
      {Array.from({ length: 12 }, (_, k) => (
        <Part key={k} pos={[-0.5, 1, -11.85 + k * 0.3]} size={[0.08, 1.8, 0.12]} color={C.woodLight} />
      ))}
      <Part pos={[-0.5, 1.95, -10.2]} size={[0.12, 0.08, 3.5]} color={C.wood} />
    </group>
  )
}

/* ---------- Private dining ---------- */
const PD = [3.8, -9]  // lambu table nu center
const PD_SEATS = [
  [2.2, -8.05, Math.PI], [3.8, -8.05, Math.PI], [5.4, -8.05, Math.PI],
  [2.2, -9.95, 0], [3.8, -9.95, 0], [5.4, -9.95, 0],
  [1.05, -9, Math.PI / 2], [6.55, -9, -Math.PI / 2],
]
const PD_TAKEN = [0, 1, 3, 4, 5, 6]

function PrivateDining({ night }) {
  const [tx, tz] = PD
  return (
    <group>
      {/* Lambu table */}
      <Part pos={[tx, 0.85, tz]} size={[4.6, 0.08, 1.3]} color={C.cream} />
      <Part pos={[tx, 0.895, tz]} size={[4.2, 0.01, 0.35]} color={C.terra} />
      {[[-2.1, -0.5], [2.1, -0.5], [-2.1, 0.5], [2.1, 0.5]].map(([dx, dz]) => (
        <Part key={dx + '_' + dz} pos={[tx + dx, 0.47, tz + dz]} size={[0.1, 0.74, 0.1]} color={C.wood} />
      ))}

      {PD_SEATS.map(([x, z, rot], i) => (
        <Chair key={i} x={x} z={z} rot={rot} color={C.woodLight} />
      ))}
      {PD_TAKEN.map((k, n) => {
        const [x, z, rot] = PD_SEATS[k]
        const fx = Math.sin(rot)
        const fz = Math.cos(rot)
        return (
          <group key={k}>
            <Guest x={x} y={0.54} z={z} rot={rot} i={n + 5} mode={n % 3 === 1 ? 'talk' : 'sit'} />
            <Plate pos={[x + fx * 0.55, 0.89, z + fz * 0.55]} />
            <Drink pos={[x + fx * 0.6 + fz * 0.25, 0.89, z + fz * 0.6 - fx * 0.25]} color="#8C3B2E" />
          </group>
        )
      })}

      {/* Minbatti */}
      {[-1.2, 0, 1.2].map((dx) => (
        <group key={dx} position={[tx + dx, 0.9, tz]}>
          <Cyl pos={[0, 0.1, 0]} r={0.035} h={0.2} color={C.cream} seg={8} />
          <Bulb pos={[0, 0.23, 0]} r={0.028} night={night} power={3} />
        </group>
      ))}

      {/* Jhumar (chandelier) */}
      <group position={[tx, 0, tz]}>
        <Cyl pos={[0, 2.8, 0]} r={0.012} h={0.4} color={C.ink} seg={6} />
        <mesh position={[0, 2.6, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
          <torusGeometry args={[0.8, 0.04, 8, 28]} />
          <meshStandardMaterial color={C.gold} />
        </mesh>
        {Array.from({ length: 8 }, (_, k) => {
          const a = (k / 8) * Math.PI * 2
          return <Bulb key={k} pos={[Math.sin(a) * 0.8, 2.68, Math.cos(a) * 0.8]} r={0.06} night={night} />
        })}
      </group>

      {/* Sideboard + photo frames */}
      <Part pos={[tx, 0.55, -11.7]} size={[3, 0.9, 0.5]} color={C.wood} />
      <Part pos={[tx, 1.03, -11.7]} size={[3.1, 0.06, 0.55]} color={C.cream} />
      <Drink pos={[tx - 0.9, 1.06, -11.7]} color="#8C3B2E" />
      <Drink pos={[tx - 0.7, 1.06, -11.65]} color="#8C3B2E" />
      <Cyl pos={[tx + 0.9, 1.2, -11.7]} r={0.1} h={0.3} color={C.terra} seg={10} />
      {[[1.5, C.olive], [3.8, C.terra], [6.1, C.gold]].map(([x, col]) => (
        <group key={x}>
          <Part pos={[x, 1.95, -11.97]} size={[1.1, 0.8, 0.04]} color={C.wood} />
          <Part pos={[x, 1.95, -11.94]} size={[0.92, 0.62, 0.03]} color={col} />
        </group>
      ))}

      {/* Waiter (seva mate taiyar) */}
      <Person pos={[7.2, 0.1, -7.1]} rot={-2.3} gender="girl" shirt={C.olive} apron={C.cream} skin={SKIN[0]} tray phase={1.1} />

      <Pot pos={[0.1, 0.1, -11.5]} />
      <Pot pos={[7.5, 0.1, -11.5]} />
    </group>
  )
}

/* ---------- Garden terrace (bahar) ---------- */
const DECK = { x0: -2.2, x1: 8.6, z0: 6.2, z1: 9.9, top: -0.08 }
const T_TABLES = [0.3, 3.4, 6.5]
const T_Z = 8.0

function Terrace({ night }) {
  const { x0, x1, z0, z1, top } = DECK
  const cx = (x0 + x1) / 2
  const posts = [x0 + 0.2, cx, x1 - 0.2]
  const bulbs = []
  for (let p = 0; p < posts.length - 1; p++) {
    for (let k = 1; k < 8; k++) {
      const t = k / 8
      bulbs.push([posts[p] + (posts[p + 1] - posts[p]) * t, 2.3 - Math.sin(Math.PI * t) * 0.35])
    }
  }

  return (
    <group>
      {/* Lakda nu deck */}
      <Part pos={[cx, top - 0.11, (z0 + z1) / 2]} size={[x1 - x0, 0.22, z1 - z0]} color={C.woodLight} />
      {Array.from({ length: 8 }, (_, k) => (
        <Part key={k} pos={[cx, top + 0.003, z0 + 0.45 + k * 0.42]} size={[x1 - x0, 0.005, 0.03]} color={C.wood} />
      ))}

      {/* Baju ni railing */}
      {[x0 + 0.05, x1 - 0.05].map((x) => (
        <group key={x}>
          <Part pos={[x, top + 0.55, (z0 + z1) / 2]} size={[0.08, 0.06, z1 - z0 - 0.1]} color={C.wood} />
          {[z0 + 0.1, (z0 + z1) / 2, z1 - 0.1].map((z) => (
            <Part key={z} pos={[x, top + 0.28, z]} size={[0.08, 0.56, 0.08]} color={C.wood} />
          ))}
        </group>
      ))}

      {/* Aagal ni kundio (planters) */}
      {[-1.0, 2.0, 4.6, 7.4].map((x) => (
        <group key={x} position={[x, top, 9.55]}>
          <Part pos={[0, 0.22, 0]} size={[1.6, 0.44, 0.4]} color={C.terra} />
          {[-0.45, 0, 0.45].map((dx) => (
            <mesh key={dx} position={[dx, 0.55, 0]} castShadow>
              <icosahedronGeometry args={[0.28, 0]} />
              <meshStandardMaterial color={dx === 0 ? C.olive : C.oliveDark} flatShading />
            </mesh>
          ))}
        </group>
      ))}

      {/* Tables + khurshi */}
      {T_TABLES.map((x) => (
        <group key={x}>
          <Cyl pos={[x, top + 0.36, T_Z]} r={0.07} r2={0.15} h={0.72} color={C.wood} seg={10} />
          <Cyl pos={[x, top + 0.74, T_Z]} r={0.55} h={0.06} color={C.cream} seg={22} />
          <Chair x={x - 0.95} z={T_Z} rot={Math.PI / 2} y={top} color={C.olive} />
          <Chair x={x + 0.95} z={T_Z} rot={-Math.PI / 2} y={top} color={C.olive} />
        </group>
      ))}
      {[0, 2].map((t, n) => {
        const x = T_TABLES[t]
        const y = top + 0.44
        return (
          <group key={t}>
            <Guest x={x - 0.95} y={y} z={T_Z} rot={Math.PI / 2} i={n * 2 + 9} mode={n ? 'sit' : 'talk'} />
            <Guest x={x + 0.95} y={y} z={T_Z} rot={-Math.PI / 2} i={n * 2 + 10} />
            <Plate pos={[x - 0.3, top + 0.77, T_Z]} />
            <Plate pos={[x + 0.3, top + 0.77, T_Z]} />
            <Drink pos={[x, top + 0.77, T_Z + 0.3]} color="#E39A3B" />
          </group>
        )
      })}

      {/* String lights */}
      {posts.map((x) => (
        <Cyl key={x} pos={[x, top + 1.25, 9.8]} r={0.04} h={2.5} color={C.wood} seg={8} />
      ))}
      {bulbs.map(([x, y], k) => (
        <Bulb key={k} pos={[x, y, 9.8]} r={0.05} night={night} power={3} />
      ))}
    </group>
  )
}

export default function Sections({ night }) {
  return (
    <group>
      <Bar night={night} />
      <PrivateDining night={night} />
      <Terrace night={night} />
    </group>
  )
}
