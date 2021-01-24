
export default function ({ $axios, store, redirect }, inject) {
  // Catch 500 errors and redirect to our custom error page
  // when they are explicit errors.
  $axios.onError((error) => {
    if (error.response.status === 500) {
      const { data } = error.response
      if (data && data.error) {
        redirect('/error', data.error)
        return Promise.resolve()
      }
    }
  })

  // To keep track of the user, read from a response header
  // and put into the 'store' so that others can read it
  $axios.onResponse((response) => {
    const { headers } = response
    store.commit('user/setName', headers['bc-user'])
    store.commit('user/impersonate', headers['bc-impersonating'])
    store.commit('user/canImpersonate', headers['bc-can-impersonate'])
  })
}
