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

export default api
