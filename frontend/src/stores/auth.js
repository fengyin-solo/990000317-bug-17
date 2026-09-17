import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { authApi } from '../api'
import { useLinksStore } from './links'
import { useReadLaterStore } from './readLater'

export const useAuthStore = defineStore('auth', () => {
  const user = ref(null)
  const token = ref(null)
  // 是否已从 localStorage 恢复过登录态（路由守卫依赖它避免误判）
  const hydrated = ref(false)

  const isLoggedIn = computed(() => !!token.value && !!user.value)
  // 只读账号：只能查看，不能改动
  const isReadOnly = computed(() => user.value?.role === 'viewer')
  const canWrite = computed(() => isLoggedIn.value && !isReadOnly.value)

  function loadFromStorage() {
    const storedToken = localStorage.getItem('token')
    const storedUser = localStorage.getItem('user')
    if (storedToken && storedUser) {
      try {
        user.value = JSON.parse(storedUser)
        token.value = storedToken
      } catch {
        // 本地数据损坏时按未登录处理
        localStorage.removeItem('token')
        localStorage.removeItem('user')
      }
    }
    hydrated.value = true
  }

  function persistSession() {
    localStorage.setItem('token', token.value)
    localStorage.setItem('user', JSON.stringify(user.value))
  }

  // 清空其他 store 中残留的用户数据，避免退出/换号后看到上一个使用者的内容
  function resetUserData() {
    useLinksStore().reset()
    useReadLaterStore().reset()
  }

  async function login(username, password) {
    const response = await authApi.login(username, password)
    resetUserData()
    token.value = response.data.token
    user.value = response.data.user
    persistSession()
    return response.data
  }

  async function register(username, email, password) {
    const response = await authApi.register(username, email, password)
    resetUserData()
    token.value = response.data.token
    user.value = response.data.user
    persistSession()
    return response.data
  }

  // 向服务端校验当前会话，并按最新用户信息（含权限角色）刷新本地状态。
  // 令牌失效时由响应拦截器统一清理会话并跳转登录页，这里只需返回结果。
  async function validateSession() {
    if (!token.value) return false
    try {
      const response = await authApi.me()
      user.value = response.data
      localStorage.setItem('user', JSON.stringify(user.value))
      return true
    } catch {
      return false
    }
  }

  // 清空登录态与所有用户数据，导航随之切回未登录形态
  function clearSession() {
    user.value = null
    token.value = null
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    resetUserData()
  }

  function logout() {
    clearSession()
  }

  return {
    user,
    token,
    hydrated,
    isLoggedIn,
    isReadOnly,
    canWrite,
    loadFromStorage,
    validateSession,
    login,
    register,
    logout,
    clearSession,
  }
})
