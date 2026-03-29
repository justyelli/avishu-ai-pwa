import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  buildGoogleImageSearchUrl,
  buildLookSearchQuery,
  buildPinterestSearchUrl,
  generateLook,
  resolveClothingAssetUrl,
} from '../data/wardrobe.js'
import { useLook } from '../hooks/useLook.js'

const STYLES = ['office', 'casual']

function openDiscovery(url) {
  window.open(url, '_blank', 'noopener,noreferrer')
}

export default function Stylist() {
  const navigate = useNavigate()
  const { setSelectedLook, setVirtualMirrorTopPath } = useLook()
  const [selectedStyle, setSelectedStyle] = useState('office')
  const [currentOutfit, setCurrentOutfit] = useState(null)

  const slots = useMemo(() => {
    if (!currentOutfit) return []
    return [
      { label: 'Top', item: currentOutfit.top },
      { label: 'Bottom', item: currentOutfit.bottom },
      { label: 'Shoes', item: currentOutfit.shoes },
    ]
  }, [currentOutfit])

  const lookQuery = currentOutfit
    ? buildLookSearchQuery(currentOutfit)
    : ''

  const handleGenerateLook = () => {
    setCurrentOutfit(generateLook(selectedStyle))
  }

  const handleVirtualTryOn = () => {
    if (!currentOutfit?.top?.imagePath) return
    setVirtualMirrorTopPath(
      resolveClothingAssetUrl(currentOutfit.top.imagePath),
    )
    setSelectedLook({
      vibe: selectedStyle,
      top: currentOutfit.top,
      bottom: currentOutfit.bottom,
      shoes: currentOutfit.shoes,
    })
    navigate('/try-on')
  }

  return (
    <div className="flex min-h-full flex-1 flex-col border border-black bg-white p-6 text-black md:p-10">
      <h2 className="mb-2 text-sm uppercase tracking-widest">
        Outfit Generator
      </h2>
      <p className="mb-6 max-w-xl text-xs uppercase tracking-widest">
        CHOOSE A STYLE, THEN GENERATE A RANDOM TOP, BOTTOM, AND SHOES.
      </p>

      <p className="mb-2 text-[10px] uppercase tracking-widest">Style</p>
      <div className="mb-6 flex flex-wrap gap-2 border-b border-black pb-6">
        {STYLES.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setSelectedStyle(s)}
            className={`rounded-none border border-black px-4 py-2 text-xs uppercase tracking-widest transition-colors ${
              selectedStyle === s
                ? 'bg-black text-white'
                : 'bg-white text-black hover:bg-black hover:text-white'
            }`}
          >
            {s.toUpperCase()}
          </button>
        ))}
      </div>

      <button
        type="button"
        onClick={handleGenerateLook}
        className="mb-8 w-full max-w-md rounded-none border border-black bg-white py-3 text-xs uppercase tracking-widest transition-colors hover:bg-black hover:text-white md:w-auto md:px-8"
      >
        GENERATE LOOK
      </button>

      <h3 className="mb-4 text-xs uppercase tracking-widest">Current outfit</h3>

      {!currentOutfit ? (
        <p className="border border-black p-4 text-xs uppercase tracking-widest">
          NO OUTFIT YET. TAP GENERATE LOOK.
        </p>
      ) : (
        <>
          <div className="mb-6 flex flex-wrap gap-px border border-black bg-black p-px">
            <button
              type="button"
              onClick={() =>
                openDiscovery(buildPinterestSearchUrl(lookQuery))
              }
              className="min-h-[44px] flex-1 rounded-none border border-black bg-white px-3 py-2 text-[9px] uppercase tracking-widest text-black hover:bg-black hover:text-white md:min-w-0"
            >
              Find on Pinterest
            </button>
            <button
              type="button"
              onClick={() =>
                openDiscovery(buildGoogleImageSearchUrl(lookQuery))
              }
              className="min-h-[44px] flex-1 rounded-none border border-black bg-white px-3 py-2 text-[9px] uppercase tracking-widest text-black hover:bg-black hover:text-white md:min-w-0"
            >
              Google Lens
            </button>
          </div>
          <div className="grid grid-cols-1 gap-px border border-black bg-black md:grid-cols-3">
          {slots.map(({ label, item }) => (
            <article
              key={item.id}
              className="flex flex-col bg-white p-4"
            >
              <p className="mb-3 text-[10px] uppercase tracking-widest">
                {label}
              </p>
              <div className="mb-3 flex aspect-[3/4] w-full items-center justify-center overflow-hidden border border-black bg-white">
                <img
                  src={resolveClothingAssetUrl(item.imagePath)}
                  alt=""
                  className="max-h-full max-w-full object-contain"
                />
              </div>
              <h4 className="text-xs uppercase tracking-widest leading-snug">
                {item.name}
              </h4>
              {label === 'Top' ? (
                <button
                  type="button"
                  onClick={handleVirtualTryOn}
                  className="mt-4 w-full rounded-none border border-black bg-white py-2 text-[10px] uppercase tracking-widest transition-colors hover:bg-black hover:text-white"
                >
                  VIRTUAL TRY-ON
                </button>
              ) : null}
            </article>
          ))}
        </div>
        </>
      )}
    </div>
  )
}
