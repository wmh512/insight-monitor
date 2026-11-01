import { ref } from 'vue'
import { login as loginRequest, logout as logoutRequest } from '../api/session'

export const currentUser = ref<{ username: string; role: 'admin' | 'viewer'; projectKey: string | null } | null>(null)
export const sessionKnown = ref(false)

export async function signIn(username: string, password: string) {
  currentUser.value = await loginRequest(username, password)
  sessionKnown.value = true
  return currentUser.value
}

export async function signOut() {
  try {
    await logoutRequest()
  } finally {
    currentUser.value = null
    sessionKnown.value = false
  }
}

export function clearSession() {
  currentUser.value = null
  sessionKnown.value = false
}
