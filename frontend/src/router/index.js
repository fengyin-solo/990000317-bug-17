import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import Home from '../views/Home.vue'
import Login from '../views/Login.vue'
import Register from '../views/Register.vue'
import Import from '../views/Import.vue'
import DeadLinks from '../views/DeadLinks.vue'
import ReadLater from '../views/ReadLater.vue'
import Forbidden from '../views/Forbidden.vue'

const routes = [
  {
    path: '/',
    name: 'Home',
    component: Home,
    meta: { requiresAuth: true, permission: 'links:read' },
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
    // Importing writes user data, so it is owner-only.
    path: '/import',
    name: 'Import',
    component: Import,
    meta: { requiresAuth: true, permission: 'links:write' },
  },
  {
    // Viewing the report is read-only; running a check is a write action
    // gated inside the page/backend.
    path: '/dead-links',
    name: 'DeadLinks',
    component: DeadLinks,
    meta: { requiresAuth: true, permission: 'links:read' },
  },
  {
    path: '/read-later',
    name: 'ReadLater',
    component: ReadLater,
    meta: { requiresAuth: true, permission: 'links:read' },
  },
  {
    path: '/403',
    name: 'Forbidden',
    component: Forbidden,
    meta: { requiresAuth: true },
  },
  { path: '/:pathMatch(.*)*', redirect: '/' },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

router.beforeEach((to) => {
  // Session must already be restored synchronously in main.js (see
  // loadFromStorage), so the store is the single source of truth here.
  const authStore = useAuthStore()

  if (to.meta.requiresAuth && !authStore.isLoggedIn) {
    return {
      name: 'Login',
      query: {
        redirect: to.fullPath,
        reason: authStore.invalidReason || 'missing',
      },
    }
  }

  if (to.meta.guest && authStore.isLoggedIn) {
    return { name: 'Home' }
  }

  if (to.meta.permission === 'links:write' && authStore.isReadOnly) {
    return { name: 'Forbidden' }
  }

  return true
})

export default router
