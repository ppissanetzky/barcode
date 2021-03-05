
export default function ({ $axios, redirect }) {
  // Catch 500 errors and redirect to our custom error page
  // when they are explicit errors.
  $axios.onError((error) => {
    if (error.response.status === 500) {
      const { data } = error.response
      if (data && data.error) {
        redirect('/error', data.error)
      }
    }
  })
}
