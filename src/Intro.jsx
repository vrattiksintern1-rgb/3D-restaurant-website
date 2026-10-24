import { useEffect, useState } from 'react'

export default function Intro() {
  const [fade, setFade] = useState(false)
  const [gone, setGone] = useState(false)

  useEffect(() => {
    const t1 = setTimeout(() => setFade(true), 2600)
    const t2 = setTimeout(() => setGone(true), 3600)
    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
    }
  }, [])

  if (gone) return null

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: '#4A3426',
        color: '#F5E6CC',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 100,
        fontFamily: 'Georgia, serif',
        opacity: fade ? 0 : 1,
        transition: 'opacity 1s ease',
        pointerEvents: fade ? 'none' : 'auto',
      }}
    >
      <style>{`
        @keyframes fillbar { from { width: 0 } to { width: 100% } }
        @keyframes rise { from { opacity: 0; transform: translateY(14px) } to { opacity: 1; transform: none } }
      `}</style>

      <div
        style={{
          fontSize: 13,
          letterSpacing: 6,
          color: '#C8553D',
          animation: 'rise 0.9s ease both',
        }}
      >
        WELCOME TO
      </div>
      <div
        style={{
          fontSize: 56,
          fontWeight: 700,
          margin: '8px 0 6px',
          animation: 'rise 0.9s ease 0.3s both',
        }}
      >
        The Food House
      </div>
      <div
        style={{
          fontSize: 17,
          fontStyle: 'italic',
          color: '#D9C3A0',
          animation: 'rise 0.9s ease 0.6s both',
        }}
      >
        Fire. Spice. Slow evenings.
      </div>

      <div
        style={{
          marginTop: 40,
          width: 220,
          height: 3,
          background: 'rgba(245, 230, 204, 0.2)',
          borderRadius: 2,
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            height: '100%',
            background: '#C8553D',
            animation: 'fillbar 2.5s ease-in-out forwards',
          }}
        />
      </div>
    </div>
  )
}