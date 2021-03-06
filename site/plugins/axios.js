
export default function ({ $axios, $config, redirect }) {
  // Catch 500 errors and redirect to our custom error page
  // when they are explicit errors.
  $axios.onError((error) => {
    const { data } = error.response
    switch (error.response.status) {
      case 500:
        if (data && data.error) {
          redirect('/error', data.error)
        }
        break

      case 401:
        redirect($config.redirect401)
        break

      case 403:
        redirect($config.redirect403)
        break
    }
  })
}
