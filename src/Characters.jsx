import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

const C = {
  cream: '#F5E6CC',
  terra: '#C8553D',
  olive: '#6B7F3A',
  wood: '#4A3426',
  white: '#FFF8EC',
  ink: '#2B1D14',
}
const SKIN = ['#F1C9A5', '#E8B08A', '#C98B62', '#A8683F']

function Part({ pos, size, color }) {
  return (
    <mesh position={pos} castShadow>
      <boxGeometry args={size} />
      <meshStandardMaterial color={color} />
    </mesh>
  )
}

/* ---------- Sharir na aakar (ek j vaar bane, badha manas share kare) ---------- */
const V = (pts) => pts.map(([x, y]) => new THREE.Vector2(x, y))
const GEO = {
  // Dhad: chhokra ni chhati pahodi, chhokri ni kamar patli ane hip thodi pahodi
  torsoBoy: new THREE.LatheGeometry(
    V([[0, 0], [0.15, 0], [0.158, 0.08], [0.162, 0.2], [0.185, 0.33], [0.2, 0.42], [0.175, 0.5], [0.09, 0.555], [0, 0.565]]), 20
  ),
  torsoGirl: new THREE.LatheGeometry(
    V([[0, 0], [0.15, 0], [0.14, 0.07], [0.122, 0.18], [0.145, 0.3], [0.158, 0.37], [0.15, 0.44], [0.135, 0.5], [0.07, 0.545], [0, 0.555]]), 20
  ),
  // Dress no gher (kamar thi ghutan sudhi)
  skirt: new THREE.LatheGeometry(V([[0.13, 0.64], [0.165, 0.54], [0.205, 0.4], [0.235, 0.27], [0.222, 0.262]]), 20),
  hairCap: new THREE.SphereGeometry(0.16, 22, 14, 0, Math.PI * 2, 0, Math.PI * 0.55),
  sphere: new THREE.SphereGeometry(1, 20, 16),
  ball: new THREE.SphereGeometry(1, 10, 8),
  box: new THREE.BoxGeometry(1, 1, 1),
}
const cache = {}
const cap = (r, l) => (cache['c' + r + ':' + l] ??= new THREE.CapsuleGeometry(r, l, 4, 12))
const cyl = (r, h) => (cache['y' + r + ':' + h] ??= new THREE.CylinderGeometry(r, r, h, 16))

function M({ geo, pos, rot, scale, color, rough = 0.75, side }) {
  return (
    <mesh geometry={geo} position={pos} rotation={rot} scale={scale} castShadow>
      <meshStandardMaterial color={color} roughness={rough} side={side} />
    </mesh>
  )
}

/* ---------- Chehro ---------- */
function Face({ girl, skin, hair, phase }) {
  const eyes = useRef()

  // Aankh palkare (dar ~4 second e)
  useFrame((state) => {
    const t = (state.clock.elapsedTime + phase * 1.7) % 4.3
    if (eyes.current) eyes.current.scale.y = t < 0.13 ? 0.15 : 1
  })

  return (
    <>
      {/* Mathu + jadbu/hadapchi */}
      <M geo={GEO.sphere} scale={[0.138, 0.158, 0.15]} color={skin} rough={0.6} />
      <M
        geo={GEO.sphere}
        pos={[0, -0.07, 0.03]}
        scale={girl ? [0.09, 0.085, 0.095] : [0.1, 0.09, 0.1]}
        color={skin}
        rough={0.6}
      />
      {/* Kaan */}
      {[-1, 1].map((s) => (
        <M key={s} geo={GEO.ball} pos={[s * 0.136, -0.005, -0.005]} scale={[0.018, 0.038, 0.03]} color={skin} rough={0.6} />
      ))}
      {/* Naak */}
      <M geo={GEO.ball} pos={[0, -0.015, 0.148]} scale={[0.02, 0.03, 0.022]} color={skin} rough={0.6} />
      {/* Aankh */}
      <group ref={eyes} position={[0, 0.025, 0]}>
        {[-1, 1].map((s) => (
          <group key={s} position={[s * 0.05, 0, 0]}>
            <M geo={GEO.ball} pos={[0, 0, 0.13]} scale={[0.026, 0.02, 0.014]} color="#FFFFFF" rough={0.3} />
            <M geo={GEO.ball} pos={[0, 0, 0.14]} scale={[0.013, 0.014, 0.008]} color={C.ink} rough={0.2} />
          </group>
        ))}
      </group>
      {/* Bhammar */}
      {[-1, 1].map((s) => (
        <M
          key={s}
          geo={GEO.box}
          pos={[s * 0.05, 0.068, 0.13]}
          rot={[0, 0, s * (girl ? -0.15 : -0.06)]}
          scale={[0.05, girl ? 0.008 : 0.012, 0.012]}
          color={hair}
        />
      ))}
      {/* Mon / hoth */}
      {girl ? (
        <M geo={GEO.box} pos={[0, -0.07, 0.124]} scale={[0.048, 0.015, 0.012]} color="#B5485A" rough={0.4} />
      ) : (
        <M geo={GEO.box} pos={[0, -0.07, 0.128]} scale={[0.045, 0.008, 0.01]} color="#7A3E30" />
      )}
    </>
  )
}

/* ---------- Vaal: chhokra mate tunka, chhokri mate khabha sudhi lamba ---------- */
function HairStyle({ girl, color, hat }) {
  return (
    <>
      {!hat && (
        <M
          geo={GEO.hairCap}
          pos={[0, 0.012, -0.008]}
          rot={[girl ? -0.7 : -0.8, 0, 0]}
          scale={[0.92, 1, 1]}
          color={color}
          rough={0.9}
          side={THREE.DoubleSide}
        />
      )}
      {girl && (
        <>
          <M geo={cap(0.12, 0.2)} pos={[0, -0.13, -0.1]} scale={[1.05, 1, 0.55]} color={color} rough={0.9} />
          {[-1, 1].map((s) => (
            <M
              key={s}
              geo={cap(0.035, 0.16)}
              pos={[s * 0.115, -0.1, 0.02]}
              rot={[0, 0, s * 0.08]}
              scale={[1, 1, 1.3]}
              color={color}
              rough={0.9}
            />
          ))}
        </>
      )}
      {hat && (
        <>
          <M geo={cyl(0.145, 0.12)} pos={[0, 0.16, 0]} color={C.white} />
          <M geo={GEO.sphere} pos={[0, 0.3, 0]} scale={[0.19, 0.15, 0.19]} color={C.white} />
        </>
      )}
    </>
  )
}

/* ---------- Aakhu sharir (Person ane Journey na Actor banne aa j vapre) ----------
   r = animation mate refs: head, armL, armR, legL, legR, kneeL, kneeR, upper, legsStand, legsSit, shinL, shinR
   leftHand / rightHand = haath ma pakdeli vastu, children = upper body ma (jem ke tray) */
export function Body({
  gender = 'boy',
  shirt = C.olive,
  pants = C.ink,
  skin = SKIN[1],
  hair = C.ink,
  apron = null,
  chef = false,
  seated = false,
  phase = 0,
  r = {},
  leftHand = null,
  rightHand = null,
  children,
}) {
  const girl = gender === 'girl'
  const f = girl ? 0.88 : 1 // haath-pag ni jadai
  const hx = girl ? 0.075 : 0.085
  const ax = girl ? 0.175 : 0.21
  const leg = girl ? skin : pants
  const shoe = girl ? '#7A2E2A' : '#2A1E17'
  const upperArm = chef ? shirt : skin

  const arm = (s, ref, extra) => (
    <group ref={ref} position={[s * ax, 0.47, 0]}>
      <M geo={GEO.sphere} scale={[0.058 * f, 0.058 * f, 0.058 * f]} color={shirt} />
      <M geo={cap(0.045 * f, 0.17)} pos={[0, -0.13, 0]} color={upperArm} rough={0.6} />
      <M geo={cyl(0.053 * f, 0.11)} pos={[0, -0.05, 0]} color={shirt} />
      <group position={[0, -0.27, 0]} rotation={[-0.15, 0, 0]}>
        <M geo={cap(0.037 * f, 0.15)} pos={[0, -0.1, 0]} color={upperArm} rough={0.6} />
        <M geo={GEO.sphere} pos={[0, -0.23, 0.005]} scale={[0.022, 0.05, 0.036]} color={skin} rough={0.6} />
        {extra}
      </group>
    </group>
  )

  const standLeg = (s, ref, knee) => (
    <group ref={ref} position={[s * hx, 0.5, 0]}>
      <M geo={cap(0.066 * f, 0.16)} pos={[0, -0.13, 0]} color={leg} />
      <group ref={knee} position={[0, -0.26, 0]}>
        <M geo={cap(0.05 * f, 0.15)} pos={[0, -0.11, 0]} color={leg} rough={girl ? 0.6 : 0.75} />
        <M geo={GEO.sphere} pos={[0, -0.205, 0.035]} scale={[0.046, 0.035, 0.09]} color={shoe} rough={0.5} />
      </group>
    </group>
  )

  return (
    <>
      {/* Ubha pag */}
      <group ref={r.legsStand} visible={!seated}>
        {standLeg(-1, r.legL, r.kneeL)}
        {standLeg(1, r.legR, r.kneeR)}
        {girl && <M geo={GEO.skirt} scale={[1, 1, 0.82]} color={shirt} side={THREE.DoubleSide} />}
      </group>

      {/* Bethela pag */}
      <group ref={r.legsSit} visible={seated}>
        {[-1, 1].map((s) => (
          <group key={s} position={[s * hx, 0, 0]}>
            <M geo={cap(0.066 * f, 0.26)} pos={[0, 0.06, 0.17]} rot={[Math.PI / 2, 0, 0]} color={leg} />
            {/* Ghutan thi niche no pag (balako bethaa bethaa pag hulave: r.shinL / r.shinR) */}
            <group ref={s < 0 ? r.shinL : r.shinR} position={[0, 0.04, 0.38]}>
              <M geo={cap(0.05 * f, 0.28)} pos={[0, -0.23, 0]} color={leg} />
              <M geo={GEO.sphere} pos={[0, -0.425, 0.04]} scale={[0.046, 0.035, 0.09]} color={shoe} rough={0.5} />
            </group>
          </group>
        ))}
        {girl && <M geo={GEO.sphere} pos={[0, 0.1, 0.14]} scale={[0.2, 0.075, 0.25]} color={shirt} />}
      </group>

      {/* Upper body (hip thi upar) */}
      <group ref={r.upper} position={[0, seated ? 0.05 : 0.5, 0]}>
        <M geo={GEO.sphere} pos={[0, 0.01, 0]} scale={[0.155, 0.09, 0.1]} color={girl ? shirt : pants} />
        <M geo={girl ? GEO.torsoGirl : GEO.torsoBoy} scale={[1, 1, girl ? 0.66 : 0.62]} color={shirt} />
        {apron && (
          <M
            geo={GEO.box}
            pos={girl ? [0, 0.32, 0.112] : [0, 0.12, 0.128]}
            scale={girl ? [0.24, 0.26, 0.012] : [0.28, 0.5, 0.012]}
            color={apron}
          />
        )}
        <M geo={cyl(girl ? 0.042 : 0.048, 0.14)} pos={[0, 0.6, 0]} color={skin} rough={0.6} />

        {arm(-1, r.armL, leftHand)}
        {arm(1, r.armR, rightHand)}

        {children}

        <group ref={r.head} position={[0, 0.74, 0]}>
          <Face girl={girl} skin={skin} hair={hair} phase={phase} />
          <HairStyle girl={girl} color={hair} hat={chef} />
        </group>
      </group>
    </>
  )
}

export function Person({
  gender = 'boy',
  pos = [0, 0.1, 0],
  rot = 0,
  shirt = C.olive,
  pants = C.ink,
  skin = SKIN[1],
  hair = C.ink,
  chef = false,
  apron = null,
  seated = false,
  mode = 'idle',
  path = null,
  speed = 1.3,
  phase = 0,
  tray = false,
}) {
  const root = useRef()
  const head = useRef()
  const armL = useRef()
  const armR = useRef()
  const legL = useRef()
  const legR = useRef()
  const kneeL = useRef()
  const kneeR = useRef()
  const st = useRef({
    i: 0,
    wait: phase,
    x: path ? path[0][0] : 0,
    z: path ? path[0][1] : 0,
  })

  useFrame((state, delta) => {
    const dt = Math.min(delta, 0.05)
    const t = state.clock.elapsedTime + phase * 3
    const s = st.current
    let walking = false

    if (path) {
      if (s.wait > 0) {
        s.wait -= dt
      } else {
        const tgt = path[(s.i + 1) % path.length]
        const dx = tgt[0] - s.x
        const dz = tgt[1] - s.z
        const d = Math.hypot(dx, dz)
        const step = speed * dt
        if (d <= step) {
          s.x = tgt[0]
          s.z = tgt[1]
          s.i = (s.i + 1) % path.length
          s.wait = 1.2
        } else {
          s.x += (dx / d) * step
          s.z += (dz / d) * step
          walking = true
          root.current.rotation.y = Math.atan2(dx, dz)
        }
      }
      root.current.position.set(s.x, pos[1], s.z)
    }

    const aL = armL.current
    const aR = armR.current

    if (path) {
      if (walking) {
        const sw = Math.sin(t * 8)
        aL.rotation.x = -sw * 0.5
        aR.rotation.x = tray ? -1.3 : sw * 0.5
        legL.current.rotation.x = sw * 0.7
        legR.current.rotation.x = -sw * 0.7
        // Pag pachhal jay tyare ghutan vale
        kneeL.current.rotation.x = Math.max(0, sw) * 0.9
        kneeR.current.rotation.x = Math.max(0, -sw) * 0.9
      } else {
        aL.rotation.x = Math.sin(t * 1.5) * 0.05
        aR.rotation.x = tray ? -1.3 : Math.sin(t * 1.5 + 1) * 0.05
        legL.current.rotation.x *= 0.8
        legR.current.rotation.x *= 0.8
        kneeL.current.rotation.x *= 0.8
        kneeR.current.rotation.x *= 0.8
      }
    } else if (mode === 'work') {
      aL.rotation.x = -1.45 + Math.sin(t * 5) * 0.25
      aR.rotation.x = -1.45 + Math.sin(t * 5 + 1.6) * 0.25
    } else if (mode === 'sit') {
      aL.rotation.x = -1.2 + Math.sin(t * 0.7) * 0.05
      aR.rotation.x = -1.2 - Math.max(0, Math.sin(t * 1.1)) * 0.9
    } else if (mode === 'talk') {
      aL.rotation.x = Math.sin(t * 1.2) * 0.05
      aR.rotation.x = -2.0 + Math.sin(t * 2.2) * 0.3
    } else {
      aL.rotation.x = Math.sin(t * 1.5) * 0.05
      aR.rotation.x = tray ? -1.3 : Math.sin(t * 1.5 + 1) * 0.05
    }

    head.current.rotation.y = Math.sin(t * 0.5) * 0.25
    head.current.rotation.x = Math.sin(t * 0.9) * 0.05
  })

  return (
    <group
      ref={root}
      position={path ? [path[0][0], pos[1], path[0][1]] : pos}
      rotation={[0, rot, 0]}
    >
      <Body
        gender={gender}
        shirt={shirt}
        pants={pants}
        skin={skin}
        hair={hair}
        apron={apron}
        chef={chef}
        seated={seated}
        phase={phase}
        r={{ head, armL, armR, legL, legR, kneeL, kneeR }}
      >
        {tray && (
          <group position={[0.21, 0.38, 0.55]}>
            <Part pos={[0, 0, 0]} size={[0.4, 0.03, 0.4]} color={C.cream} />
            <mesh position={[0, 0.07, 0]} castShadow>
              <sphereGeometry args={[0.09, 10, 10]} />
              <meshStandardMaterial color={C.terra} />
            </mesh>
          </group>
        )}
      </Body>
    </group>
  )
}

/* ---------- Nanu balak: bethelu (high chair / stroller) ke ghutan-bhar chaltu ----------
   pose = 'sit' | 'crawl', act = 'clap' | 'wave' | 'idle'
   circle = [cx, cz, r] aapo to ghutan-bhar gol chakkar fare */
export function Baby({
  pos = [0, 0.1, 0],
  rot = 0,
  pose = 'sit',
  act = 'idle',
  onesie = '#9CC5D9',
  skin = SKIN[0],
  hair = '#5A3A22',
  bonnet = null,
  circle = null,
  phase = 0,
}) {
  const root = useRef()
  const body = useRef()
  const head = useRef()
  const armL = useRef()
  const armR = useRef()
  const legL = useRef()
  const legR = useRef()
  const st = useRef({ a: phase, k: 0 })
  const crawl = pose === 'crawl'

  useFrame((state, delta) => {
    const dt = Math.min(delta, 0.05)
    const t = state.clock.elapsedTime + phase * 3
    const aL = armL.current
    const aR = armR.current
    const h = head.current

    if (crawl) {
      // Thodu chale, pachhi ubhu rahi aaju baju jove
      const go = THREE.MathUtils.clamp(Math.sin(t * 0.45) * 2 + 0.8, 0, 1)
      const s = st.current
      s.k += go * dt * 7
      if (circle) {
        const [cx, cz, r] = circle
        s.a += (go * 0.28 * dt) / r
        root.current.position.set(cx + Math.sin(s.a) * r, pos[1], cz + Math.cos(s.a) * r)
        root.current.rotation.y = Math.atan2(Math.cos(s.a), -Math.sin(s.a))
      }
      const sw = Math.sin(s.k)
      aL.rotation.x = sw * 0.45 * go
      aR.rotation.x = -sw * 0.45 * go
      legL.current.rotation.x = -sw * 0.35 * go
      legR.current.rotation.x = sw * 0.35 * go
      body.current.position.y = Math.abs(sw) * 0.012 * go
      body.current.rotation.z = sw * 0.05 * go
      h.rotation.y = Math.sin(t * 0.6) * 0.45 * (1 - go)
      h.rotation.x = -0.15 + Math.sin(t * 1.1) * 0.05
      return
    }

    if (act === 'clap' && Math.sin(t * 0.6) > -0.3) {
      // Taali: banne haath aagal, vachhe bhega thay
      const a = 0.55 + Math.sin(t * 7) * 0.28
      aL.rotation.set(-1.3, 0, a)
      aR.rotation.set(-1.3, 0, -a)
    } else if (act === 'wave' && Math.sin(t * 0.5) > 0) {
      // Jamno haath upar, aavjo kare
      aL.rotation.set(-0.3 + Math.sin(t * 1.4) * 0.1, 0, -0.15)
      aR.rotation.set(-2.6, 0, 0.25 + Math.sin(t * 7) * 0.3)
    } else {
      aL.rotation.set(-0.7 + Math.sin(t * 1.4) * 0.15, 0, -0.15)
      aR.rotation.set(-0.7 + Math.sin(t * 1.4 + 1) * 0.15, 0, 0.15)
    }
    // Pag halave (kick)
    legL.current.rotation.x = Math.sin(t * 5) * 0.25
    legR.current.rotation.x = Math.sin(t * 5 + 2) * 0.25
    h.rotation.y = Math.sin(t * 0.7) * 0.4
    h.rotation.x = Math.sin(t * 1.3) * 0.08
    h.rotation.z = Math.sin(t * 0.5) * 0.1
  })

  const headTop = (
    <group scale={0.8}>
      <Face girl={false} skin={skin} hair={hair} phase={phase} />
      {/* Gulabi gaal */}
      {[-1, 1].map((s) => (
        <M key={s} geo={GEO.ball} pos={[s * 0.08, -0.04, 0.118]} scale={[0.026, 0.018, 0.01]} color="#F2A0A0" rough={0.5} />
      ))}
      {bonnet ? (
        <>
          <M geo={GEO.hairCap} pos={[0, 0.015, -0.01]} rot={[-0.6, 0, 0]} scale={[0.98, 1.02, 1.02]} color={bonnet} rough={0.9} side={THREE.DoubleSide} />
          <M geo={GEO.ball} pos={[0, 0.175, -0.04]} scale={[0.035, 0.035, 0.035]} color={C.white} rough={0.9} />
        </>
      ) : (
        <>
          <M geo={GEO.hairCap} pos={[0, 0.02, -0.01]} rot={[-0.8, 0, 0]} scale={[0.9, 0.95, 0.95]} color={hair} rough={0.9} side={THREE.DoubleSide} />
          <M geo={GEO.ball} pos={[0, 0.165, 0.02]} rot={[0.4, 0, 0]} scale={[0.02, 0.035, 0.02]} color={hair} rough={0.9} />
        </>
      )}
    </group>
  )

  const hand = <M geo={GEO.sphere} pos={[0, -0.115, 0]} scale={[0.03, 0.032, 0.03]} color={skin} rough={0.6} />

  return (
    <group ref={root} position={pos} rotation={[0, rot, 0]}>
      <group ref={body}>
        {crawl ? (
          <>
            <M geo={GEO.sphere} pos={[0, 0.19, 0]} scale={[0.1, 0.09, 0.15]} color={onesie} />
            <M geo={GEO.sphere} pos={[0, 0.2, -0.12]} scale={[0.105, 0.085, 0.085]} color={onesie} />
            <group ref={head} position={[0, 0.27, 0.17]}>{headTop}</group>
            {[-1, 1].map((s) => (
              <group key={s} ref={s < 0 ? armL : armR} position={[s * 0.07, 0.2, 0.1]}>
                <M geo={cap(0.028, 0.08)} pos={[0, -0.07, 0]} color={onesie} />
                <M geo={GEO.sphere} pos={[0, -0.17, 0.01]} scale={[0.032, 0.022, 0.04]} color={skin} rough={0.6} />
              </group>
            ))}
            {[-1, 1].map((s) => (
              <group key={s} ref={s < 0 ? legL : legR} position={[s * 0.07, 0.17, -0.13]}>
                <M geo={cap(0.036, 0.08)} pos={[0, -0.075, 0]} color={onesie} />
                <M geo={cap(0.032, 0.1)} pos={[0, -0.14, -0.08]} rot={[Math.PI / 2, 0, 0]} color={onesie} />
                <M geo={GEO.sphere} pos={[0, -0.13, -0.18]} scale={[0.03, 0.03, 0.04]} color={skin} rough={0.6} />
              </group>
            ))}
          </>
        ) : (
          <>
            <M geo={GEO.sphere} pos={[0, 0.06, 0]} scale={[0.11, 0.065, 0.1]} color={onesie} />
            <M geo={GEO.sphere} pos={[0, 0.155, 0]} scale={[0.105, 0.125, 0.095]} color={onesie} />
            <group ref={head} position={[0, 0.37, 0]}>{headTop}</group>
            {[-1, 1].map((s) => (
              <group key={s} ref={s < 0 ? armL : armR} position={[s * 0.095, 0.23, 0]}>
                <M geo={GEO.sphere} scale={[0.036, 0.036, 0.036]} color={onesie} />
                <M geo={cap(0.03, 0.05)} pos={[0, -0.045, 0]} color={onesie} />
                {hand}
              </group>
            ))}
            {[-1, 1].map((s) => (
              <group key={s} ref={s < 0 ? legL : legR} position={[s * 0.055, 0.05, 0.02]}>
                <M geo={cap(0.038, 0.07)} pos={[0, 0, 0.06]} rot={[Math.PI / 2, 0, 0]} color={onesie} />
                <M geo={GEO.sphere} pos={[0, 0.005, 0.14]} scale={[0.032, 0.035, 0.045]} color={skin} rough={0.6} />
              </group>
            ))}
          </>
        )}
      </group>
    </group>
  )
}

const tableAt = [
  [0, 1.5], [3, 1.5], [6, 1.5],
  [0, 4.5], [3, 4.5], [6, 4.5],
]

const guests = [
  { t: 0, a: Math.PI / 2 },
  { t: 0, a: (3 * Math.PI) / 2 },
  { t: 1, a: 0 },
  { t: 1, a: Math.PI },
  { t: 2, a: Math.PI / 2 },
  { t: 3, a: Math.PI / 2 },
  { t: 3, a: (3 * Math.PI) / 2 },
  { t: 4, a: 0 },
  { t: 4, a: Math.PI },
  { t: 5, a: Math.PI / 2 },
]

const shirts = [
  '#3E5C76', '#8C3B2E', '#D9A441', '#5C6B3A', '#7A4E7E',
  '#2F6F73', '#B5651D', '#5B6C8F', '#A34A5A', '#4F7942',
]
const hairs = ['#2B1D14', '#5A3A22', '#1A1A1A', '#8B5A2B', '#2B1D14']

const waiters = [
  { path: [[4.5, 0.2], [4.5, 3], [7.4, 3], [4.5, 3]], phase: 0 },
  { path: [[1.5, 0.2], [1.5, 3], [-1.4, 3], [1.5, 3]], phase: 1.5 },
  { path: [[4.5, 0.2], [4.5, 5.7], [4.5, 3]], phase: 3 },
  { path: [[1.5, 5.7], [1.5, 3], [7.4, 3], [1.5, 3]], phase: 2.2 },
  { path: [[-2.6, -2], [-4, -2], [-4, -4.2], [-2.6, -4.2]], phase: 0.8 },
]

export default function Characters() {
  return (
    <group>
      {/* 3 Chefs */}
      <Person pos={[2.8, 0.1, -4.2]} chef shirt={C.white} apron={C.wood} skin={SKIN[1]} mode="work" phase={0} />
      <Person pos={[5.2, 0.1, -4.2]} gender="girl" chef shirt={C.white} apron={C.wood} skin={SKIN[3]} mode="work" phase={1} />
      <Person pos={[4, 0.1, -1.5]} chef shirt={C.white} apron={C.wood} skin={SKIN[2]} mode="work" phase={2} />
    </group>
  )
}
