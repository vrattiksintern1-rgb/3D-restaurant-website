import { Baby, Person } from './Characters'

const C = {
  cream: '#F5E6CC',
  terra: '#C8553D',
  olive: '#6B7F3A',
  wood: '#4A3426',
  woodLight: '#6B4A35',
  gold: '#D9A441',
  teal: '#2F6F73',
  ink: '#2B1D14',
}
const SKIN = ['#F1C9A5', '#E8B08A', '#C98B62', '#A8683F']

function Part({ pos, size, color, rot }) {
  return (
    <mesh position={pos} rotation={rot} castShadow receiveShadow>
      <boxGeometry args={size} />
      <meshStandardMaterial color={color} />
    </mesh>
  )
}
function Cyl({ pos, r, h, color, rot, seg = 16 }) {
  return (
    <mesh position={pos} rotation={rot} castShadow receiveShadow>
      <cylinderGeometry args={[r, r, h, seg]} />
      <meshStandardMaterial color={color} />
    </mesh>
  )
}

/* ---------- High chair (moh local +z, y = jamin). PrivateDiningStory pan vapre ---------- */
export function HighChair({ x, z, rot, y = 0.1, children }) {
  return (
    <group position={[x, y, z]} rotation={[0, rot, 0]}>
      {/* Pag niche thi sahej pahola */}
      {[[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([sx, sz]) => (
        <Part key={sx + '_' + sz} pos={[sx * 0.17, 0.32, sz * 0.15]} size={[0.04, 0.66, 0.04]} rot={[-sz * 0.12, 0, sx * 0.12]} color={C.woodLight} />
      ))}
      <Part pos={[0, 0.64, 0]} size={[0.36, 0.04, 0.34]} color={C.cream} />
      <Part pos={[0, 0.88, -0.16]} size={[0.36, 0.46, 0.04]} color={C.cream} />
      {[-1, 1].map((s) => (
        <Part key={s} pos={[s * 0.18, 0.75, 0]} size={[0.03, 0.18, 0.3]} color={C.woodLight} />
      ))}
      {/* Tray + nanu bowl */}
      <Part pos={[0, 0.84, 0.2]} size={[0.44, 0.03, 0.2]} color={C.terra} />
      <Cyl pos={[0.12, 0.875, 0.22]} r={0.05} h={0.04} color={C.gold} seg={12} />
      <group position={[0, 0.66, -0.04]}>{children}</group>
    </group>
  )
}

/* ---------- Stroller (moh local +z, y = jamin) ---------- */
function Stroller({ x, z, rot, y = 0.1, color = C.teal, children }) {
  return (
    <group position={[x, y, z]} rotation={[0, rot, 0]}>
      {[[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([sx, sz]) => (
        <Cyl key={sx + '_' + sz} pos={[sx * 0.2, 0.09, sz * 0.22]} r={0.09} h={0.04} rot={[0, 0, Math.PI / 2]} color={C.ink} seg={14} />
      ))}
      {[-1, 1].map((s) => (
        <group key={s}>
          <Part pos={[s * 0.2, 0.25, 0]} size={[0.03, 0.03, 0.5]} color={C.ink} />
          {/* Pachhal no handle */}
          <Part pos={[s * 0.17, 0.75, -0.38]} size={[0.03, 0.7, 0.03]} rot={[-0.35, 0, 0]} color={C.ink} />
        </group>
      ))}
      <Cyl pos={[0, 1.08, -0.5]} r={0.025} h={0.4} rot={[0, 0, Math.PI / 2]} color={C.ink} seg={8} />
      {/* Bethak, pith ane chhaanyo */}
      <Part pos={[0, 0.42, 0]} size={[0.38, 0.22, 0.46]} color={color} />
      <Part pos={[0, 0.75, -0.23]} size={[0.38, 0.5, 0.04]} color={color} />
      <Part pos={[0, 1.0, -0.08]} size={[0.42, 0.03, 0.34]} rot={[0.12, 0, 0]} color={C.cream} />
      <group position={[0, 0.4, 0]}>{children}</group>
    </group>
  )
}

/* ---------- Lounge: ramvani gol shetranji + ramakda ---------- */
const RUG = [-5, -3]
function PlayRug() {
  const [rx, rz] = RUG
  const toys = [[0.6, C.gold], [2.3, C.teal], [3.9, C.terra]]
  return (
    <group>
      <Cyl pos={[rx, 0.106, rz]} r={1.6} h={0.012} color={C.terra} seg={40} />
      <Cyl pos={[rx, 0.108, rz]} r={1.45} h={0.014} color={C.cream} seg={40} />
      {toys.map(([a, col]) => (
        <Part key={a} pos={[rx + Math.sin(a) * 1.35, 0.165, rz + Math.cos(a) * 1.35]} size={[0.1, 0.1, 0.1]} rot={[0, a, 0]} color={col} />
      ))}
      <mesh position={[rx + Math.sin(5.2) * 1.3, 0.185, rz + Math.cos(5.2) * 1.3]} castShadow>
        <sphereGeometry args={[0.07, 12, 10]} />
        <meshStandardMaterial color={C.olive} />
      </mesh>
    </group>
  )
}

export default function Babies() {
  return (
    <group>
      {/* Private dining ni high chair have PrivateDiningStory ma chhe (family na nana balak mate) */}

      {/* Terrace par stroller ma aavjo kartu baby */}
      <Stroller x={6.5} z={7.0} rot={0.3} y={-0.08}>
        <Baby act="wave" onesie="#F2D46B" skin={SKIN[2]} hair="#1A1A1A" phase={1.4} />
      </Stroller>

      {/* Lounge: coffee table ni aaspas ghutan-bhar farto baby, sofa par papa dhyan rakhe */}
      <PlayRug />
      <Baby pose="crawl" pos={[0, 0.115, 0]} circle={[RUG[0], RUG[1], 1.05]} onesie="#9CC5D9" skin={SKIN[0]} hair="#8B5A2B" phase={2.1} />
      <Person pos={[-7.1, 0.62, -2.6]} rot={Math.PI / 2} seated shirt={C.teal} hair="#8B5A2B" skin={SKIN[0]} phase={2.5} />
    </group>
  )
}
