import { createApp } from 'vue'
import { createPinia } from 'pinia'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import * as ElementPlusIconsVue from '@element-plus/icons-vue'
import App from './App.vue'
import router from './router'
import { setUnauthorizedHandler } from './api'
import { useAuthStore } from './stores/auth'

const app = createApp(App)

// Register all Element Plus icons
for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
  app.component(key, component)
}

app.use(createPinia())

// 必须在路由初始化（首次导航守卫）之前同步恢复登录态，
// 否则刷新页面时守卫读到的是空状态，导航登录态会显示错误
const authStore = useAuthStore()
authStore.loadFromStorage()

// 令牌失效（401）时：立即清空会话、导航切回未登录，并跳转登录页说明原因
setUnauthorizedHandler(() => {
  if (!authStore.isLoggedIn) return
  authStore.clearSession()
  if (router.currentRoute.value.name !== 'Login') {
    router.push({ name: 'Login', query: { reason: 'expired' } }).catch(() => {})
  }
})

app.use(router)
app.use(ElementPlus)

app.mount('#app')
