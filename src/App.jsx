import { Routes, Route } from 'react-router-dom'
import Sidebar from './components/Sidebar.jsx'
import Home from './pages/Home.jsx'
import Stylist from './pages/Stylist.jsx'
import TryOn from './pages/TryOn.jsx'

export default function App() {
  return (
    <div className="flex min-h-svh flex-col rounded-none bg-white text-black md:flex-row">
      <Sidebar />
      <main className="flex min-h-0 flex-1 flex-col bg-white p-3 md:p-6">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/stylist" element={<Stylist />} />
          <Route path="/try-on" element={<TryOn />} />
        </Routes>
      </main>
    </div>
  )
}
