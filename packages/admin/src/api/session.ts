import axios from 'axios'

const authApi = axios.create({ baseURL: import.meta.env.VITE_API_BASE_URL || '' })

export async function login(username: string, password: string) {
  const response = await authApi.post('/api/auth/login', { username, password })
  return response.data.data as { username: string }
}

export async function logout() {
  await authApi.post('/api/auth/logout')
}
