export const state = () => ({
  name: '',
  impersonating: 0,
  canImpersonate: false
})

export const mutations = {
  setName (state, name) {
    if (name) {
      state.name = name
    }
  },
  impersonate (state, impersonating) {
    state.impersonating = parseInt(impersonating || 0, 10)
  },
  canImpersonate (state, canImpersonate) {
    state.canImpersonate = !!canImpersonate
  }
}
