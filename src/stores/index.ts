// Export the store provider
export { StoreProvider, useStore } from './StoreProvider'

// Export individual store hooks
export const useUserStore = () => useStore().userStore
export const useSpaceStore = () => useStore().spaceStore

// Re-export types
export type { IRootStore } from './RootStore'
export type { IUserStore } from './UserStore'
export type { ISpaceStore } from './SpaceStore'

// Import useStore hook
import { useStore } from './StoreProvider' 