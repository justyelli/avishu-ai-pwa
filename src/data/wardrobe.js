/**
 * AVISHU wardrobe — Vite ?url imports (hashed on Vercel) + discovery search strings.
 */
import blackHoodieUrl from '../assets/clothes/black-hoodie.svg?url'
import officeBlazerUrl from '../assets/clothes/office-blazer.svg?url'
import whiteTshirtUrl from '../assets/clothes/white-tshirt.svg?url'

const LEGACY_CLOTHING_PATHS = new Map([
  ['/assets/clothes/white-tshirt.svg', whiteTshirtUrl],
  ['/assets/clothes/black-hoodie.svg', blackHoodieUrl],
  ['/assets/clothes/office-blazer.svg', officeBlazerUrl],
])

export function resolveClothingAssetUrl(stored) {
  if (stored == null || stored === '') return null
  const key = String(stored).trim()
  return LEGACY_CLOTHING_PATHS.get(key) ?? key
}

/** Combined query for Pinterest / Google image search for a full look. */
export function buildLookSearchQuery(outfit) {
  if (!outfit?.top) return 'AVISHU minimalist fashion black white'
  const parts = [outfit.top, outfit.bottom, outfit.shoes]
    .map((i) => i?.searchQuery)
    .filter(Boolean)
  return parts.join(' ') || 'AVISHU minimalist fashion'
}

export function buildPinterestSearchUrl(searchQuery) {
  return `https://www.pinterest.com/search/pins/?q=${encodeURIComponent(searchQuery)}`
}

export function buildGoogleImageSearchUrl(searchQuery) {
  return `https://www.google.com/search?q=${encodeURIComponent(searchQuery)}&tbm=isch`
}

export const wardrobe = [
  {
    id: 'top-casual-tee',
    name: 'Core Cotton Tee',
    category: 'top',
    style: 'casual',
    imagePath: whiteTshirtUrl,
    searchQuery: 'minimal white t-shirt outfit monochrome brutalist fashion',
  },
  {
    id: 'top-casual-hoodie',
    name: 'Studio Hoodie',
    category: 'top',
    style: 'casual',
    imagePath: blackHoodieUrl,
    searchQuery: 'black hoodie streetwear minimalist outfit',
  },
  {
    id: 'top-office-blazer',
    name: 'Structured Blazer',
    category: 'top',
    style: 'office',
    imagePath: officeBlazerUrl,
    searchQuery: 'black blazer office outfit tailored minimalist',
  },
  {
    id: 'bottom-casual-denim',
    name: 'Raw Hem Denim',
    category: 'bottom',
    style: 'casual',
    imagePath: whiteTshirtUrl,
    searchQuery: 'raw hem denim jeans minimalist street style',
  },
  {
    id: 'bottom-office-wool',
    name: 'Pleat Front Wool',
    category: 'bottom',
    style: 'office',
    imagePath: officeBlazerUrl,
    searchQuery: 'pleated wool trousers office monochrome',
  },
  {
    id: 'shoes-casual-runner',
    name: 'Monochrome Runner',
    category: 'shoes',
    style: 'casual',
    imagePath: blackHoodieUrl,
    searchQuery: 'monochrome sneakers minimalist running shoes white black',
  },
  {
    id: 'shoes-office-leather',
    name: 'Cap-Toe Oxford',
    category: 'shoes',
    style: 'office',
    imagePath: officeBlazerUrl,
    searchQuery: 'black leather oxford shoes cap toe dress shoe',
  },
]

function pickRandom(items) {
  if (!items.length) return null
  return items[Math.floor(Math.random() * items.length)]
}

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
