import { createApp } from 'vue'
import { createPinia } from 'pinia'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import * as ElementPlusIconsVue from '@element-plus/icons-vue'
import App from './App.vue'
import router from './router'
import { useAuthStore } from './stores/auth'

const app = createApp(App)

// Register all Element Plus icons
for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
  app.component(key, component)
}

const pinia = createPinia()
app.use(pinia)

// Restore the session BEFORE the first route resolution so guards and the
// navbar always render against the current login state/permissions.
const authStore = useAuthStore(pinia)
authStore.loadFromStorage()
authStore.watchStorage()

app.use(router)
app.use(ElementPlus)

router.isReady().then(() => {
  app.mount('#app')
  // Re-validate role/token against the server after first paint.
  authStore.validateSession()
})
