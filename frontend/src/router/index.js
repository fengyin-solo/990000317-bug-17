import { createRouter, createWebHistory } from 'vue-router'
import { ElMessage } from 'element-plus'
import { useAuthStore } from '../stores/auth'
import Home from '../views/Home.vue'
import Login from '../views/Login.vue'
import Register from '../views/Register.vue'
import Import from '../views/Import.vue'
import DeadLinks from '../views/DeadLinks.vue'
import ReadLater from '../views/ReadLater.vue'

const routes = [
  {
    path: '/',
    name: 'Home',
    component: Home,
    meta: { requiresAuth: true },
  },
  {
    path: '/login',
    name: 'Login',
    component: Login,
    meta: { guest: true },
  },
  {
    path: '/register',
    name: 'Register',
    component: Register,
    meta: { guest: true },
  },
  {
    path: '/import',
    name: 'Import',
    component: Import,
    meta: { requiresAuth: true, requiresWrite: true },
  },
  {
    path: '/dead-links',
    name: 'DeadLinks',
    component: DeadLinks,
    meta: { requiresAuth: true },
  },
  {
    path: '/read-later',
    name: 'ReadLater',
    component: ReadLater,
    meta: { requiresAuth: true },
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

router.beforeEach((to, from, next) => {
  const authStore = useAuthStore()

  // 防御：确保登录态已从本地恢复（正常流程在 main.js 中已完成）
  if (!authStore.hydrated) {
    authStore.loadFromStorage()
  }

  if (to.meta.requiresAuth && !authStore.isLoggedIn) {
    next({ name: 'Login', query: { redirect: to.fullPath } })
  } else if (to.meta.guest && authStore.isLoggedIn) {
    next({ name: 'Home' })
  } else if (to.meta.requiresWrite && !authStore.canWrite) {
    // 权限不足时给出说明
    ElMessage.warning('当前账号为只读权限，仅可查看内容，无法使用该功能')
    next(from.name ? false : { name: 'Home' })
  } else {
    next()
  }
})

export default router
