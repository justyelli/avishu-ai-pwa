/**
 * AVISHU mock wardrobe — clothing URLs come from Vite static imports (?url)
 * so production builds on Vercel resolve hashed assets under /assets/.
 */
import blackHoodieUrl from '../assets/clothes/black-hoodie.svg?url'
import officeBlazerUrl from '../assets/clothes/office-blazer.svg?url'
import whiteTshirtUrl from '../assets/clothes/white-tshirt.svg?url'

/** Legacy public paths (localStorage) → Vite production URLs. */
const LEGACY_CLOTHING_PATHS = new Map([
  ['/assets/clothes/white-tshirt.svg', whiteTshirtUrl],
  ['/assets/clothes/black-hoodie.svg', blackHoodieUrl],
  ['/assets/clothes/office-blazer.svg', officeBlazerUrl],
])

/**
 * Resolve a stored garment URL to the built asset URL (hashed on Vercel).
 */
export function resolveClothingAssetUrl(stored) {
  if (stored == null || stored === '') return null
  const key = String(stored).trim()
  return LEGACY_CLOTHING_PATHS.get(key) ?? key
}

export const wardrobe = [
  {
    id: 'top-casual-tee',
    name: 'Core Cotton Tee',
    category: 'top',
    style: 'casual',
    imagePath: whiteTshirtUrl,
  },
  {
    id: 'top-casual-hoodie',
    name: 'Studio Hoodie',
    category: 'top',
    style: 'casual',
    imagePath: blackHoodieUrl,
  },
  {
    id: 'top-office-blazer',
    name: 'Structured Blazer',
    category: 'top',
    style: 'office',
    imagePath: officeBlazerUrl,
  },
  {
    id: 'bottom-casual-denim',
    name: 'Raw Hem Denim',
    category: 'bottom',
    style: 'casual',
    imagePath: whiteTshirtUrl,
  },
  {
    id: 'bottom-office-wool',
    name: 'Pleat Front Wool',
    category: 'bottom',
    style: 'office',
    imagePath: officeBlazerUrl,
  },
  {
    id: 'shoes-casual-runner',
    name: 'Monochrome Runner',
    category: 'shoes',
    style: 'casual',
    imagePath: blackHoodieUrl,
  },
  {
    id: 'shoes-office-leather',
    name: 'Cap-Toe Oxford',
    category: 'shoes',
    style: 'office',
    imagePath: officeBlazerUrl,
  },
]

function pickRandom(items) {
  if (!items.length) return null
  return items[Math.floor(Math.random() * items.length)]
}

/** One random top, bottom, and shoes for `style` (`casual` | `office`). */
export function generateLook(style) {
  const tops = wardrobe.filter((i) => i.category === 'top' && i.style === style)
  const bottoms = wardrobe.filter(
    (i) => i.category === 'bottom' && i.style === style,
  )
  const shoesList = wardrobe.filter(
    (i) => i.category === 'shoes' && i.style === style,
  )
  const top = pickRandom(tops)
  const bottom = pickRandom(bottoms)
  const shoes = pickRandom(shoesList)
  if (!top || !bottom || !shoes) return null
  return { top, bottom, shoes }
}
