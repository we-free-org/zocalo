import { types, Instance } from 'mobx-state-tree'
import { UserStore } from './UserStore'
import { SpaceStore } from './SpaceStore'

// Root store that contains all application stores
export const RootStore = types
  .model('RootStore', {
    userStore: types.optional(UserStore, {}),
    spaceStore: types.optional(SpaceStore, {}),
  })

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface IRootStore extends Instance<typeof RootStore> {}

// Create store instance
export const rootStore = RootStore.create({
  userStore: {},
  spaceStore: {},
}) 