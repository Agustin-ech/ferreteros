import axios from 'axios'
import errorMessage from './errorMessage'

export { errorMessage }

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '',
})

api.interceptors.request.use((config) => {
  const token = sessionStorage.getItem('access_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const url = error.config?.url || ''
    if (
      error.response?.status === 401 &&
      sessionStorage.getItem('access_token') &&
      !url.includes('/api/auth/login')
    ) {
      sessionStorage.removeItem('access_token')
      window.dispatchEvent(new Event('app:session-expired'))
    }
    return Promise.reject(error)
  },
)

export default api
