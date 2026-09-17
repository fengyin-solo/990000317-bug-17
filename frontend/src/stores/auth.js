import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { authApi } from '../api'

// Decode a JWT payload without verifying (signature is verified server-side).
function decodeJwt(token) {
  try {
    const payload = token.split('.')[1]
    return JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')))
  } catch {
    return null
  }
}

// A token is considered usable only if its signature shape is right and it
// has not expired locally (with a small safety margin).
function isTokenAlive(token) {
  if (!token) return { valid: false }
  const payload = decodeJwt(token)
  if (!payload || !payload.userId) return { valid: false }
  const expiresAt = payload.exp ? payload.exp * 1000 : null
  if (expiresAt && Date.now() >= expiresAt - 30 * 1000) {
    return { valid: false, expired: true, payload }
  }
  return { valid: true, payload }
}

const TOKEN_KEY = 'token'
const USER_KEY = 'user'

// Reason shown on the login screen after the session ends.
const LOGOUT_REASONS = {
  logout: null, // manual logout, no warning needed
  expired: '登录状态已过期，请重新登录',
  invalid: '登录凭证无效，请重新登录',
  missing: '当前未登录，请先登录',
  user_missing: '账号已不可用，请重新登录',
  cleared: '你已在其他标签页退出登录',
}

export const useAuthStore = defineStore('auth', () => {
  const token = ref(null)
  const user = ref(null)
  // Notice consumed once by the login page (explains why the user is there).
  const authNotice = ref(null)
  // Machine-readable reason for the current logged-out state.
  const invalidReason = ref(null)
  const initialized = ref(false)
  const isLoggedIn = computed(() => !!token.value && !!user.value)
  const role = computed(() => user.value?.role || null)
  const isReadOnly = computed(() => role.value === 'viewer')

  function persist() {
    if (token.value) {
      localStorage.setItem(TOKEN_KEY, token.value)
      localStorage.setItem(USER_KEY, JSON.stringify(user.value))
    } else {
      localStorage.removeItem(TOKEN_KEY)
      localStorage.removeItem(USER_KEY)
    }
  }

  function setSession(tokenValue, userValue) {
    token.value = tokenValue
    user.value = userValue
    invalidReason.value = null
    authNotice.value = null
    persist()
  }

  // Clear local session state. Used both by manual logout and by forced
  // logout on 401 / expiry so Pinia and localStorage never diverge.
  function clearSession() {
    token.value = null
    user.value = null
    authNotice.value = null
    invalidReason.value = null
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(USER_KEY)
  }

  function logout() {
    // JWT is stateless; logout is purely client-side.
    clearSession()
  }

  // Called by the axios 401 interceptor / expiry watcher. Redirects to the
  // login page with an explanation instead of a silent hard navigation.
  async function forceLogout(reason = 'invalid') {
    // Drop cached page data so the next account can never see content
    // cached for the previous session.
    const [{ useLinksStore }, { useReadLaterStore }] = await Promise.all([
      import('./links'),
      import('./readLater'),
    ])
    useLinksStore().reset()
    useReadLaterStore().reset()

    clearSession()
    invalidReason.value = reason
    authNotice.value = LOGOUT_REASONS[reason] || LOGOUT_REASONS.invalid
    const { default: router } = await import('../router')
    if (router.currentRoute.value.name !== 'Login') {
      router.push({ name: 'Login', query: reason && reason !== 'logout' ? { reason } : {} })
    }
  }

  async function login(username, password) {
    const response = await authApi.login(username, password)
    setSession(response.data.token, response.data.user)
    authNotice.value = null
    return response.data
  }

  async function register(username, email, password) {
    const response = await authApi.register(username, email, password)
    setSession(response.data.token, response.data.user)
    authNotice.value = null
    return response.data
  }

  function consumeNotice() {
    const notice = authNotice.value
    authNotice.value = null
    return notice
  }

  // Synchronous restore from localStorage. MUST run before the first route
  // resolution so guards and the navbar render the correct state on refresh.
  // Expired/invalid tokens are dropped immediately instead of being trusted.
  function loadFromStorage() {
    const storedToken = localStorage.getItem(TOKEN_KEY)
    const storedUser = localStorage.getItem(USER_KEY)

    if (storedToken) {
      const { valid, expired } = isTokenAlive(storedToken)
      if (!valid) {
        localStorage.removeItem(TOKEN_KEY)
        localStorage.removeItem(USER_KEY)
        invalidReason.value = expired ? 'expired' : 'invalid'
        authNotice.value = expired ? LOGOUT_REASONS.expired : LOGOUT_REASONS.invalid
        initialized.value = true
        return
      }
    }

    if (storedToken && storedUser) {
      try {
        token.value = storedToken
        user.value = JSON.parse(storedUser)
      } catch {
        clearSession()
      }
    }
    initialized.value = true
  }

  // Re-validate against the server after mount: role may have changed and
  // the token may have been revoked. Failure (401) is handled by the
  // response interceptor, which calls forceLogout.
  async function validateSession() {
    if (!token.value) return
    try {
      const { data } = await authApi.me()
      user.value = data.user
      localStorage.setItem(USER_KEY, JSON.stringify(data.user))
    } catch {
      // interceptor handles invalid/expired sessions
    }
  }

  // Keep multiple tabs in sync: logout in one tab logs out every tab.
  function watchStorage() {
    window.addEventListener('storage', (event) => {
      if (event.key !== TOKEN_KEY) return
      if (!event.newValue) {
        clearSession()
        invalidReason.value = 'cleared'
        authNotice.value = LOGOUT_REASONS.cleared
        import('../router').then(({ default: router }) => {
          if (router.currentRoute.value.meta.requiresAuth) {
            router.push({ name: 'Login', query: { reason: 'cleared' } })
          }
        })
      } else if (event.newValue !== token.value) {
        // Logged in as someone else in another tab: adopt that session.
        const storedUser = localStorage.getItem(USER_KEY)
        const { valid } = isTokenAlive(event.newValue)
        if (valid && storedUser) {
          invalidReason.value = null
          authNotice.value = null
          token.value = event.newValue
          user.value = JSON.parse(storedUser)
        }
      }
    })

    // Also catch expiry while the tab stays open (visibility / timer).
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible' && token.value) {
        const { valid } = isTokenAlive(token.value)
        if (!valid) forceLogout('expired')
      }
    })

    // Poll once a minute so an idle tab still flips to logged-out exactly
    // when the token expires, rather than waiting for the next click.
    setInterval(() => {
      if (token.value) {
        const { valid } = isTokenAlive(token.value)
        if (!valid) forceLogout('expired')
      }
    }, 60 * 1000)
  }

  return {
    user,
    token,
    authNotice,
    invalidReason,
    initialized,
    isLoggedIn,
    role,
    isReadOnly,
    loadFromStorage,
    validateSession,
    watchStorage,
    login,
    register,
    logout,
    forceLogout,
    consumeNotice,
    isTokenAlive,
  }
})
