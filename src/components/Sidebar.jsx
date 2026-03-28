import { NavLink } from 'react-router-dom'
import { Camera, LayoutGrid, Sparkles } from 'lucide-react'

const linkClass =
  'flex items-center gap-3 border border-black px-4 py-3 text-sm uppercase tracking-widest transition-colors hover:bg-black hover:text-white rounded-none'

const navItems = [
  { to: '/', label: 'Feed', icon: LayoutGrid, end: true },
  { to: '/stylist', label: 'Outfit Generator', icon: Sparkles, end: false },
  { to: '/try-on', label: 'Camera View', icon: Camera, end: false },
]

export default function Sidebar() {
  return (
    <aside className="flex w-full shrink-0 flex-col border-b border-black bg-white md:h-svh md:w-56 md:border-b-0 md:border-r">
      <header className="border-b border-black px-4 py-5">
        <p className="text-xs uppercase tracking-widest text-black">AVISHU</p>
        <h1 className="mt-1 text-lg leading-tight">Bruitlist</h1>
      </header>
      <nav className="flex flex-col gap-0 p-3 md:flex-1 md:gap-2 md:p-4">
        {navItems.map((item) => {
          const { to, label, end } = item
          const NavIcon = item.icon
          return (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `${linkClass} ${isActive ? 'bg-black text-white' : 'bg-white text-black'}`
              }
            >
              <NavIcon className="size-4 shrink-0 stroke-[1.5]" aria-hidden />
              <span>{label}</span>
            </NavLink>
          )
        })}
      </nav>
    </aside>
  )
}
