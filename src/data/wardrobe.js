/**
 * AVISHU mock wardrobe — categories use only the three SVGs in /assets/clothes/.
 */
export const wardrobe = [
  {
    id: 'top-casual-tee',
    name: 'Core Cotton Tee',
    category: 'top',
    style: 'casual',
    imagePath: '/assets/clothes/white-tshirt.svg',
  },
  {
    id: 'top-casual-hoodie',
    name: 'Studio Hoodie',
    category: 'top',
    style: 'casual',
    imagePath: '/assets/clothes/black-hoodie.svg',
  },
  {
    id: 'top-office-blazer',
    name: 'Structured Blazer',
    category: 'top',
    style: 'office',
    imagePath: '/assets/clothes/office-blazer.svg',
  },
  {
    id: 'bottom-casual-denim',
    name: 'Raw Hem Denim',
    category: 'bottom',
    style: 'casual',
    imagePath: '/assets/clothes/white-tshirt.svg',
  },
  {
    id: 'bottom-office-wool',
    name: 'Pleat Front Wool',
    category: 'bottom',
    style: 'office',
    imagePath: '/assets/clothes/office-blazer.svg',
  },
  {
    id: 'shoes-casual-runner',
    name: 'Monochrome Runner',
    category: 'shoes',
    style: 'casual',
    imagePath: '/assets/clothes/black-hoodie.svg',
  },
  {
    id: 'shoes-office-leather',
    name: 'Cap-Toe Oxford',
    category: 'shoes',
    style: 'office',
    imagePath: '/assets/clothes/office-blazer.svg',
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
