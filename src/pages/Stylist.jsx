import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import wardrobe from '../data/wardrobe.json'
import { useLook } from '../hooks/useLook.js'

const VIBES = ['office', 'sport', 'casual']

function pickRandom(items) {
  if (!items.length) return null
  return items[Math.floor(Math.random() * items.length)]
}

function buildRandomLook(style) {
  const tops = wardrobe.filter(
    (i) => i.category === 'Tops' && i.style === style,
  )
  const bottoms = wardrobe.filter(
    (i) => i.category === 'Bottoms' && i.style === style,
  )
  const shoes = wardrobe.filter(
    (i) => i.category === 'Shoes' && i.style === style,
  )
  const top = pickRandom(tops)
  const bottom = pickRandom(bottoms)
  const shoe = pickRandom(shoes)
  if (!top || !bottom || !shoe) return null
  return { top, bottom, shoes: shoe }
}

export default function Stylist() {
  const navigate = useNavigate()
  const { setSelectedLook } = useLook()
  const [vibe, setVibe] = useState('office')
  const look = useMemo(() => buildRandomLook(vibe), [vibe])

  const slots = useMemo(() => {
    if (!look) return []
    return [
      { label: 'Top', item: look.top },
      { label: 'Bottom', item: look.bottom },
      { label: 'Shoes', item: look.shoes },
    ]
  }, [look])

  const handleTryThisLook = () => {
    if (!look) return
    setSelectedLook({
      vibe,
      top: look.top,
      bottom: look.bottom,
      shoes: look.shoes,
    })
    navigate('/try-on')
  }

  return (
    <div className="flex min-h-full flex-1 flex-col border border-black bg-white p-6 md:p-10">
      <h2 className="mb-2 text-sm">Outfit Generator</h2>
      <p className="mb-6 max-w-xl text-xs uppercase tracking-widest text-black/80">
        Select a vibe. We pick one top, bottom, and shoes in that style.
      </p>

      <div className="mb-8 flex flex-wrap gap-2">
        {VIBES.map((v) => (
          <button
            key={v}
            type="button"
            onClick={() => setVibe(v)}
            className={`rounded-none border border-black px-4 py-2 text-xs uppercase tracking-widest transition-colors ${
              vibe === v
                ? 'bg-black text-white'
                : 'bg-white text-black hover:bg-black/5'
            }`}
          >
            {v.toUpperCase()}
          </button>
        ))}
      </div>

      <h3 className="mb-4 text-xs uppercase tracking-widest">Total Look</h3>

      {!look ? (
        <p className="border border-black p-4 text-xs uppercase tracking-widest">
          No complete look for this vibe in the wardrobe.
        </p>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-px border border-black bg-black md:grid-cols-3">
            {slots.map(({ label, item }) => (
              <article
                key={item.id}
                className="flex flex-col bg-white p-4 md:min-h-0"
              >
                <p className="mb-3 text-[10px] uppercase tracking-widest text-black/70">
                  {label}
                </p>
                <div className="mb-3 aspect-[3/4] w-full overflow-hidden border border-black bg-white">
                  <img
                    src={item.placeholder_image_url}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                </div>
                <h4 className="text-xs uppercase tracking-widest leading-snug">
                  {item.name}
                </h4>
              </article>
            ))}
          </div>

          <button
            type="button"
            onClick={handleTryThisLook}
            className="mt-8 w-full max-w-md rounded-none border border-black bg-white py-3 text-xs uppercase tracking-widest transition-colors hover:bg-black hover:text-white"
          >
            TRY THIS LOOK
          </button>
        </>
      )}
    </div>
  )
}
