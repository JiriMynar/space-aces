import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
})

// Přilož access token ke každému požadavku, pokud je uložený.
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Ošetření prošlého/neplatného tokenu: JWTAuthentication vrací 401 i na
// veřejné čtení, pokud je přiložený neplatný token. Proto ho při 401 zahodíme.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const config = error.config
    if (error.response?.status === 401 && config && !config._retried) {
      localStorage.removeItem('access')
      localStorage.removeItem('refresh')
      const method = (config.method || 'get').toLowerCase()
      if (method === 'get') {
        // Veřejné čtení zopakuj už bez tokenu.
        config._retried = true
        if (config.headers) delete config.headers.Authorization
        return api(config)
      }
      // Zápis (admin akce) vyžaduje přihlášení — pošli na login.
      if (!window.location.pathname.startsWith('/login')) {
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  }
)

export default api
