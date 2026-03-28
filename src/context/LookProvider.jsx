import { useMemo, useState } from 'react'
import { LookContext } from './lookContext.js'

export function LookProvider({ children }) {
  const [selectedLook, setSelectedLook] = useState(null)

  const value = useMemo(
    () => ({ selectedLook, setSelectedLook }),
    [selectedLook],
  )

  return (
    <LookContext.Provider value={value}>{children}</LookContext.Provider>
  )
}
