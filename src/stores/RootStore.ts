import { types, Instance } from 'mobx-state-tree'
import { UserStore } from './UserStore'
import { SpaceStore } from './SpaceStore'

// Root store that contains all application stores
export const RootStore = types
  .model('RootStore', {
    userStore: types.optional(UserStore, {}),
    spaceStore: types.optional(SpaceStore, {}),
  })

export interface IRootStore extends Instance<typeof RootStore> {}

// Create store instance
export const rootStore = RootStore.create({
  userStore: {},
  spaceStore: {},
}) 