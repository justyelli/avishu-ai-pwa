import { useContext } from 'react'
import { LookContext } from '../context/lookContext.js'

export function useLook() {
  const ctx = useContext(LookContext)
  if (!ctx) {
    throw new Error('useLook must be used within LookProvider')
  }
  return ctx
}
