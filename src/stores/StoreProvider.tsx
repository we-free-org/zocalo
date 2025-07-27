'use client'

import { ReactNode, createContext, useContext } from 'react'
import { rootStore, IRootStore } from './RootStore'

// Create context for the store
const StoreContext = createContext<IRootStore | null>(null)

// Provider component
interface StoreProviderProps {
  children: ReactNode
}

export function StoreProvider({ children }: StoreProviderProps) {
  return (
    <StoreContext.Provider value={rootStore}>
      {children}
    </StoreContext.Provider>
  )
}

// Hook to use store
export function useStore() {
  const store = useContext(StoreContext)
  if (!store) {
    throw new Error('useStore must be used within a StoreProvider')
  }
  return store
} 