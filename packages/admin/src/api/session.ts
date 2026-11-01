import axios from 'axios'

const authApi = axios.create({ baseURL: import.meta.env.VITE_API_BASE_URL || '' })

export async function login(username: string, password: string) {
  const response = await authApi.post('/api/auth/login', { username, password })
  return response.data.data as { username: string; role: 'admin' | 'viewer'; projectKey: string | null }
}

export async function logout() {
  await authApi.post('/api/auth/logout')
}

export async function getSession() {
  const response = await authApi.get('/api/auth/session')
  return response.data.data as { username: string; role: 'admin' | 'viewer'; projectKey: string | null }
}
