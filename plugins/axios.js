
export default function ({ $axios, redirect }) {
  $axios.onError((error) => {
    if (error.response.status === 500) {
      const { data } = error.response
      if (data && data.error) {
        redirect('/error', data.error)
        return Promise.resolve()
      }
    }
  })
}
