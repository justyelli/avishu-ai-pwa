import { useCallback, useMemo, useState } from 'react'
import { LookContext } from './lookContext.js'
import { readMirrorTopPath, writeMirrorTopPath } from '../lib/mirrorTopStorage.js'

export function LookProvider({ children }) {
  const [selectedLook, setSelectedLook] = useState(null)
  const [virtualMirrorTopPath, setVirtualMirrorTopPathState] = useState(
    () => readMirrorTopPath(),
  )

  const setVirtualMirrorTopPath = useCallback((path) => {
    const next = path ?? null
    setVirtualMirrorTopPathState(next)
    writeMirrorTopPath(next)
  }, [])

  const value = useMemo(
    () => ({
      selectedLook,
      setSelectedLook,
      virtualMirrorTopPath,
      setVirtualMirrorTopPath,
    }),
    [selectedLook, virtualMirrorTopPath, setVirtualMirrorTopPath],
  )

  return (
    <LookContext.Provider value={value}>{children}</LookContext.Provider>
  )
}
