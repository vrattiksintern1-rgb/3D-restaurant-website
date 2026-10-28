/* ---------- 15 alag alag vangi (dish). Plate nu center pos par, plate nu top y = 0.015 ---------- */

const C = {
  cream: '#F5E6CC',
  terra: '#C8553D',
  olive: '#6B7F3A',
  oliveDark: '#4F6128',
  wood: '#4A3426',
  plate: '#FFF8EC',
  gold: '#D9A441',
  ink: '#2B1D14',
  bun: '#C9902E',
  crust: '#C98A2E',
  rice: '#EFE0BF',
  lemon: '#E6D23A',
}

/* ---------- Nana helpers ---------- */
function Part({ pos, size, color, rot }) {
  return (
    <mesh position={pos} rotation={rot}>
      <boxGeometry args={size} />
      <meshStandardMaterial color={color} />
    </mesh>
  )
}

function Cyl({ pos, r, r2 = r, h, color, seg = 16, rot }) {
  return (
    <mesh position={pos} rotation={rot}>
      <cylinderGeometry args={[r, r2, h, seg]} />
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

function Ring({ pos, r, tube, color, rot = [Math.PI / 2, 0, 0] }) {
  return (
    <mesh position={pos} rotation={rot}>
      <torusGeometry args={[r, tube, 6, 14]} />
      <meshStandardMaterial color={color} />
    </mesh>
  )
}

// Chutney/sauce ni nani vatki
function Dip({ pos, color, r = 0.032 }) {
  return (
    <group position={pos}>
      <Cyl pos={[0, 0.03, 0]} r={r} r2={r * 0.8} h={0.03} color={C.plate} seg={12} />
      <Cyl pos={[0, 0.046, 0]} r={r * 0.85} h={0.004} color={color} seg={12} />
    </group>
  )
}

// Vadko (bowl): andar no rang top par dekhay
function Bowl({ fill, r = 0.12, h = 0.07 }) {
  return (
    <>
      <Cyl pos={[0, 0.015 + h / 2, 0]} r={r} r2={r * 0.7} h={h} color={C.plate} seg={20} />
      <Cyl pos={[0, 0.012 + h, 0]} r={r * 0.9} h={0.008} color={fill} seg={20} />
    </>
  )
}

/* ---------- Darek vangi ---------- */
const RiceCurry = () => (
  <>
    <Ball pos={[-0.04, 0.04, 0]} r={0.09} color={C.rice} scale={[1, 0.55, 1]} />
    <Cyl pos={[0.07, 0.035, 0.02]} r={0.07} h={0.04} color={C.terra} />
    <Ball pos={[0.07, 0.065, 0.02]} r={0.025} color={C.oliveDark} />
  </>
)

const Salad = () => (
  <>
    <Ball pos={[-0.06, 0.05, 0.03]} r={0.06} color={C.olive} />
    <Ball pos={[0.05, 0.05, -0.04]} r={0.06} color={C.oliveDark} />
    <Ball pos={[0.04, 0.06, 0.07]} r={0.045} color={C.terra} />
    <Ball pos={[-0.03, 0.07, -0.06]} r={0.04} color={C.gold} />
  </>
)

const RotiSabji = () => (
  <>
    <Cyl pos={[-0.03, 0.03, 0]} r={0.12} h={0.02} color={C.gold} />
    <Cyl pos={[-0.03, 0.05, 0]} r={0.12} h={0.02} color={C.bun} />
    <Cyl pos={[-0.03, 0.07, 0]} r={0.12} h={0.02} color={C.gold} />
    <Cyl pos={[0.1, 0.04, 0.06]} r={0.05} h={0.05} color={C.terra} />
  </>
)

const Dosa = () => (
  <>
    {/* lambo valelo dosa, plate ni bahar sudhi */}
    <Cyl pos={[0, 0.05, -0.04]} r={0.04} r2={0.03} h={0.36} color={C.crust} rot={[0, 0, Math.PI / 2]} />
    <Dip pos={[-0.09, 0, 0.09]} color="#F2EEDC" />
    <Dip pos={[0, 0, 0.11]} color={C.olive} />
    <Dip pos={[0.09, 0, 0.09]} color="#B5651D" />
  </>
)

const Pizza = () => (
  <>
    <Cyl pos={[0, 0.025, 0]} r={0.155} h={0.02} color={C.crust} seg={20} />
    <Cyl pos={[0, 0.036, 0]} r={0.135} h={0.004} color={C.terra} seg={20} />
    <Cyl pos={[0, 0.039, 0]} r={0.12} h={0.004} color="#F2D27A" seg={20} />
    {[[0.06, 0.03], [-0.05, 0.06], [-0.04, -0.06], [0.05, -0.06], [0, 0]].map(([x, z]) => (
      <Cyl key={x + '_' + z} pos={[x, 0.043, z]} r={0.022} h={0.006} color="#8C3B2E" seg={10} />
    ))}
    {[[0.02, 0.08], [-0.08, 0], [0.08, -0.02]].map(([x, z]) => (
      <Part key={x + '_' + z} pos={[x, 0.045, z]} size={[0.03, 0.004, 0.018]} color={C.oliveDark} rot={[0, x * 20, 0]} />
    ))}
  </>
)

const Burger = () => (
  <>
    <group position={[-0.04, 0, 0]}>
      <Cyl pos={[0, 0.03, 0]} r={0.075} h={0.03} color={C.bun} />
      <Cyl pos={[0, 0.056, 0]} r={0.08} h={0.022} color="#5A3A22" />
      <Part pos={[0, 0.07, 0]} size={[0.13, 0.006, 0.13]} color="#F2C14E" rot={[0, Math.PI / 4, 0]} />
      <Cyl pos={[0, 0.077, 0]} r={0.085} h={0.008} color={C.olive} />
      <Cyl pos={[0, 0.086, 0]} r={0.068} h={0.01} color={C.terra} />
      <Ball pos={[0, 0.094, 0]} r={0.077} color={C.bun} scale={[1, 0.55, 1]} />
      {[[0.02, 0.02], [-0.03, 0.01], [0.01, -0.03]].map(([x, z]) => (
        <Ball key={x + '_' + z} pos={[x, 0.135, z]} r={0.006} color={C.cream} />
      ))}
    </group>
    {/* fries */}
    {[-0.3, -0.1, 0.15, 0.35, 0].map((t, i) => (
      <Part
        key={i}
        pos={[0.1 + (i % 2) * 0.025, 0.045, -0.05 + i * 0.025]}
        size={[0.014, 0.014, 0.1]}
        color={C.gold}
        rot={[0.3, t, 0]}
      />
    ))}
  </>
)

const NOODLE = '#E8C77A'
const Noodles = () => (
  <>
    <Bowl fill={NOODLE} r={0.13} h={0.08} />
    {[[-0.04, 0.02], [0.04, -0.03], [0.01, 0.05], [-0.03, -0.05]].map(([x, z], i) => (
      <Ring key={i} pos={[x, 0.1, z]} r={0.035} tube={0.008} color={NOODLE} rot={[Math.PI / 2, 0, i]} />
    ))}
    <Part pos={[0.05, 0.105, 0.02]} size={[0.03, 0.01, 0.01]} color="#E07A3A" />
    <Part pos={[-0.06, 0.105, -0.01]} size={[0.03, 0.01, 0.01]} color="#E07A3A" />
    <Ball pos={[0.0, 0.105, -0.07]} r={0.012} color={C.olive} />
    <Ball pos={[-0.02, 0.105, 0.07]} r={0.012} color={C.oliveDark} />
    {/* chopsticks */}
    <Part pos={[0.02, 0.112, 0.03]} size={[0.3, 0.008, 0.008]} color={C.wood} rot={[0, 0.25, 0]} />
    <Part pos={[0.02, 0.112, 0.06]} size={[0.3, 0.008, 0.008]} color={C.wood} rot={[0, 0.15, 0]} />
  </>
)

const IdliSambar = () => (
  <>
    {[[-0.07, -0.04], [0.02, -0.08], [-0.06, 0.06]].map(([x, z]) => (
      <Ball key={x + '_' + z} pos={[x, 0.03, z]} r={0.05} color="#F7F2E4" scale={[1, 0.45, 1]} />
    ))}
    <group position={[0.07, 0, 0.05]}>
      <Bowl fill="#B5651D" r={0.06} h={0.05} />
      <Ball pos={[0.01, 0.066, 0]} r={0.008} color={C.olive} />
      <Ball pos={[-0.015, 0.066, 0.01]} r={0.008} color={C.terra} />
    </group>
    <Dip pos={[0.09, 0, -0.07]} color="#F2EEDC" r={0.028} />
  </>
)

const Biryani = () => (
  <>
    <Ball pos={[-0.02, 0.03, 0]} r={0.12} color="#E3A64A" scale={[1, 0.5, 1]} />
    {[[-0.05, 0.03], [0.03, -0.04], [-0.01, 0.07], [0.05, 0.04], [-0.07, -0.04]].map(([x, z]) => (
      <Ball key={x + '_' + z} pos={[x - 0.02, 0.078, z]} r={0.012} color={C.rice} />
    ))}
    {[[0.0, -0.06], [-0.08, 0.02], [0.06, 0.0]].map(([x, z]) => (
      <Ball key={x + '_' + z} pos={[x - 0.02, 0.075, z]} r={0.01} color="#D96A1E" />
    ))}
    {/* bafelu indu (aadhu) */}
    <Ball pos={[-0.02, 0.085, -0.01]} r={0.025} color="#FFFFFF" scale={[1, 0.6, 1.3]} />
    <Ball pos={[-0.02, 0.095, -0.01]} r={0.012} color="#F2B705" />
    <Ball pos={[0.01, 0.088, 0.03]} r={0.01} color={C.olive} />
    <Dip pos={[0.11, 0, 0.08]} color="#F4F0E2" r={0.03} />
  </>
)

const Samosa = () => (
  <>
    {[[-0.06, -0.04, 0.2], [0.04, -0.05, 1.1], [-0.01, 0.05, 2]].map(([x, z, ry]) => (
      <mesh key={x + '_' + z} position={[x, 0.055, z]} rotation={[0, ry, 0]}>
        <coneGeometry args={[0.06, 0.085, 3]} />
        <meshStandardMaterial color={C.crust} flatShading />
      </mesh>
    ))}
    <Dip pos={[0.1, 0, 0.06]} color={C.olive} r={0.03} />
    <Dip pos={[0.08, 0, 0.11]} color="#6B2E16" r={0.025} />
  </>
)

const PENNE = [
  [-0.05, 0.02, 0.3, 1.2], [0.03, -0.04, 1.4, 0.4], [0.0, 0.05, 0.9, 2.1], [-0.06, -0.05, 1.8, 0.8],
  [0.06, 0.03, 0.5, 2.7], [-0.02, -0.01, 1.1, 1.6], [0.04, 0.07, 2.2, 0.2], [-0.07, 0.06, 0.7, 2.4],
  [0.07, -0.06, 1.6, 1.0], [0.0, -0.08, 0.4, 2.9],
]
const Pasta = () => (
  <>
    <Cyl pos={[0, 0.022, 0]} r={0.12} h={0.012} color={C.terra} seg={18} />
    {PENNE.map(([x, z, rx, ry], i) => (
      <Cyl key={i} pos={[x, 0.045, z]} r={0.012} h={0.05} color="#EBC77E" seg={8} rot={[rx, ry, 0]} />
    ))}
    {[[0.02, 0.0], [-0.04, 0.04], [0.05, -0.02]].map(([x, z]) => (
      <Ball key={x + '_' + z} pos={[x, 0.07, z]} r={0.01} color={C.olive} />
    ))}
    {[[-0.01, 0.03], [0.03, 0.04], [-0.05, -0.02]].map(([x, z]) => (
      <Part key={x + '_' + z} pos={[x, 0.072, z]} size={[0.012, 0.006, 0.012]} color="#FFF4D6" />
    ))}
  </>
)

const PavBhaji = () => (
  <>
    <Ball pos={[-0.05, 0.03, 0]} r={0.085} color="#B5482E" scale={[1, 0.45, 1]} />
    <Part pos={[-0.05, 0.07, 0]} size={[0.03, 0.02, 0.03]} color="#F7E08A" rot={[0, 0.5, 0]} />
    {[[-0.09, 0.03], [-0.02, -0.05], [-0.08, -0.04]].map(([x, z]) => (
      <Part key={x + '_' + z} pos={[x, 0.058, z]} size={[0.012, 0.006, 0.012]} color="#F2E6F0" />
    ))}
    <Ball pos={[-0.03, 0.062, 0.04]} r={0.01} color={C.olive} />
    <Ball pos={[0.08, 0.04, -0.05]} r={0.05} color={C.gold} scale={[1, 0.6, 0.9]} />
    <Ball pos={[0.08, 0.04, 0.05]} r={0.05} color={C.gold} scale={[1, 0.6, 0.9]} />
    <Ball pos={[-0.02, 0.03, 0.11]} r={0.025} color={C.lemon} scale={[1, 0.6, 0.6]} />
  </>
)

const SUSHI_FILL = ['#E8805A', '#E8805A', C.olive, '#E8805A', '#F2C14E', C.olive]
const Sushi = () => (
  <>
    {SUSHI_FILL.map((fill, i) => {
      const a = (i / SUSHI_FILL.length) * Math.PI * 2
      return (
        <group key={i} position={[Math.sin(a) * 0.09, 0, Math.cos(a) * 0.09]}>
          <Cyl pos={[0, 0.035, 0]} r={0.034} h={0.04} color="#1F2A22" seg={14} />
          <Cyl pos={[0, 0.036, 0]} r={0.029} h={0.041} color="#FBF7EE" seg={14} />
          <Cyl pos={[0, 0.037, 0]} r={0.012} h={0.042} color={fill} seg={10} />
        </group>
      )
    })}
    <Ball pos={[0.015, 0.03, 0]} r={0.02} color="#8DBA5A" scale={[1, 0.7, 1]} />
    <Ball pos={[-0.02, 0.028, 0.01]} r={0.022} color="#F2A7A0" scale={[1, 0.5, 1]} />
  </>
)

const Drumstick = ({ pos, ry }) => (
  <group position={pos} rotation={[0, ry, 0]}>
    <Ball pos={[0, 0.045, 0]} r={0.045} color="#B23A1E" scale={[1.5, 0.8, 1]} />
    <Cyl pos={[0.085, 0.04, 0]} r={0.01} h={0.05} color={C.cream} seg={8} rot={[0, 0, Math.PI / 2]} />
    <Ball pos={[0.11, 0.04, 0]} r={0.015} color={C.cream} />
  </group>
)
const Tandoori = () => (
  <>
    <Drumstick pos={[-0.06, 0, -0.05]} ry={0.4} />
    <Drumstick pos={[-0.04, 0, 0.05]} ry={-0.3} />
    <Drumstick pos={[0.02, 0, -0.01]} ry={2.6} />
    <Ring pos={[0.1, 0.025, 0.07]} r={0.03} tube={0.006} color="#E8C8D8" />
    <Ring pos={[0.08, 0.03, 0.09]} r={0.024} tube={0.006} color="#E8C8D8" />
    <Ball pos={[0.11, 0.03, -0.07]} r={0.025} color={C.lemon} scale={[1, 0.6, 0.6]} />
    <Dip pos={[-0.02, 0, 0.12]} color={C.olive} r={0.028} />
  </>
)

const GulabJamun = () => (
  <>
    <Bowl fill="#C98A2E" r={0.11} h={0.06} />
    {[[-0.03, -0.03], [0.04, -0.02], [-0.01, 0.04], [0.04, 0.05]].map(([x, z]) => (
      <Ball key={x + '_' + z} pos={[x, 0.08, z]} r={0.032} color="#6B2E16" />
    ))}
    <Ball pos={[0.0, 0.115, -0.02]} r={0.006} color="#8DBA5A" />
    <Ball pos={[0.03, 0.115, 0.03]} r={0.006} color="#8DBA5A" />
    <Ball pos={[-0.02, 0.115, 0.03]} r={0.006} color={C.olive} />
  </>
)

const KINDS = [
  RiceCurry, Salad, RotiSabji, Dosa, Pizza,
  Burger, Noodles, IdliSambar, Biryani, Samosa,
  Pasta, PavBhaji, Sushi, Tandoori, GulabJamun,
]

export default function Dish({ pos, kind = 0, rot = 0 }) {
  const Food = KINDS[((kind % KINDS.length) + KINDS.length) % KINDS.length]
  return (
    <group position={pos} rotation={[0, rot, 0]}>
      <Cyl pos={[0, 0, 0]} r={0.17} h={0.03} color={C.plate} seg={20} />
      <Food />
    </group>
  )
}
