import axios from 'axios'
import router from '../router'
import { clearSession } from '../stores/session'

const api = axios.create({ baseURL: import.meta.env.VITE_API_BASE_URL || '', timeout: 10000 })
api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    if (error.response?.status === 401 && router.currentRoute.value.name !== 'login') {
      clearSession()
      void router.replace({ name: 'login', query: { expired: '1' } })
    }
    return Promise.reject(error)
  },
)
export default api
