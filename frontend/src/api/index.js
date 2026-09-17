import axios from 'axios'
import { ElMessage } from 'element-plus'

const api = axios.create({
  baseURL: '/api',
  timeout: 30000,
})

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

// Response interceptor: keep the Pinia auth store in sync with the server's
// view of the session, instead of only wiping localStorage and hard-redirecting.
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const status = error.response?.status
    const code = error.response?.data?.code
    const url = error.config?.url || ''
    const isAuthCall = url.startsWith('/auth/')

    if (status === 401 && !isAuthCall) {
      // Dynamic import avoids a circular dependency (store -> api -> store)
      const { useAuthStore } = await import('../stores/auth')
      const authStore = useAuthStore()
      const reasonMap = {
        TOKEN_EXPIRED: 'expired',
        TOKEN_INVALID: 'invalid',
        USER_MISSING: 'user_missing',
        NO_TOKEN: 'missing',
      }
      await authStore.forceLogout(reasonMap[code] || 'invalid')
    } else if (status === 403) {
      ElMessage.error(error.response?.data?.error || '权限不足，无法执行该操作')
    }
    return Promise.reject(error)
  }
)

// Auth API
export const authApi = {
  login: (username, password) => api.post('/auth/login', { username, password }),
  register: (username, email, password) => api.post('/auth/register', { username, email, password }),
  me: () => api.get('/auth/me'),
}

// Links API
export const linksApi = {
  getLinks: (params) => api.get('/links', { params }),
  createLink: (data) => api.post('/links', data),
  updateLink: (id, data) => api.put(`/links/${id}`, data),
  deleteLink: (id) => api.delete(`/links/${id}`),
  getReadLater: (params) => api.get('/links/read-later', { params }),
  addToReadLater: (id, review_date) => api.post(`/links/${id}/read-later`, { review_date }),
  removeFromReadLater: (id) => api.delete(`/links/${id}/read-later`),
  updateReviewStatus: (id, review_status) => api.put(`/links/${id}/review-status`, { review_status }),
}

// Categories API
export const categoriesApi = {
  getCategories: () => api.get('/categories'),
  createCategory: (data) => api.post('/categories', data),
  updateCategory: (id, data) => api.put(`/categories/${id}`, data),
  deleteCategory: (id) => api.delete(`/categories/${id}`),
}

// Tags API
export const tagsApi = {
  getTags: () => api.get('/categories/tags'),
}

// Import API
export const importApi = {
  importBookmarks: (file) => {
    const formData = new FormData()
    formData.append('file', file)
    return api.post('/import/bookmarks', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },
}

// Health Check API
export const healthCheckApi = {
  checkAll: () => api.post('/health-check/all', {}, { timeout: 600000 }),
  getDeadLinks: () => api.get('/health-check/dead'),
}

export default api
