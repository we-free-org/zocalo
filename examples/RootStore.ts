import { types, Instance } from 'mobx-state-tree'
import { UserStore } from './UserStore'
import { AssessmentStore } from './AssessmentStore'
import { BenchmarkStore } from './BenchmarkStore'

// Root store that contains all application stores
export const RootStore = types
  .model('RootStore', {
    userStore: types.optional(UserStore, {}),
    assessmentStore: types.optional(AssessmentStore, {}),
    benchmarkStore: types.optional(BenchmarkStore, {}),
  })

export interface IRootStore extends Instance<typeof RootStore> {}

// Create store instance
export const rootStore = RootStore.create({
  userStore: {},
  assessmentStore: {},
  benchmarkStore: {},
}) 