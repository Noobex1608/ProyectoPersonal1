import { createRouter, createWebHistory } from 'vue-router'
import { watch } from 'vue'
import { useAuthStore } from '../stores/auth'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/login',
      name: 'login',
      component: () => import('../views/LoginView.vue'),
      meta: { requiresGuest: true }
    },
    {
      path: '/signup',
      name: 'signup',
      component: () => import('../views/SignupView.vue'),
      meta: { requiresGuest: true }
    },
    {
      path: '/',
      name: 'dashboard',
      component: () => import('../views/DashboardView.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/todos',
      name: 'todos',
      component: () => import('../views/TodosView.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/categories',
      name: 'categories',
      component: () => import('../views/CategoriesView.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/profile',
      name: 'profile',
      component: () => import('../views/ProfileView.vue'),
      meta: { requiresAuth: true }
    }
  ],
  scrollBehavior(_to, _from, savedPosition) {
    if (savedPosition) {
      return savedPosition
    } else {
      return { top: 0 }
    }
  }
})

// Guard de navegación con patrón encuestas
router.beforeEach(async (to, from, next) => {
  const authStore = useAuthStore()

  // Esperar a que loading termine antes de continuar (con timeout)
  if (authStore.loading) {
    await new Promise<void>((resolve) => {
      const timeout = setTimeout(() => {
        resolve()
      }, 5000)

      const stop = watch(
        () => authStore.loading,
        (loading) => {
          if (!loading) {
            clearTimeout(timeout)
            stop()
            resolve()
          }
        }
      )
    })
  }

  // Si hay user pero no hay profile, esperar un poco más
  if (authStore.user && !authStore.profile && !authStore.loading) {
    await new Promise<void>((resolve) => {
      const timeout = setTimeout(() => {
        resolve()
      }, 3000)

      const stop = watch(
        () => authStore.profile,
        (profile) => {
          if (profile) {
            clearTimeout(timeout)
            stop()
            resolve()
          }
        }
      )
    })
  }

  const requiresAuth = to.matched.some(record => record.meta.requiresAuth)
  const requiresGuest = to.matched.some(record => record.meta.requiresGuest)
  const isAuthenticated = authStore.isAuthenticated

  // Si la ruta requiere autenticación y no está autenticado
  if (requiresAuth && !isAuthenticated) {
    return next({
      path: '/login',
      query: { redirect: to.fullPath }
    })
  }

  // Si intenta acceder a Login/Signup estando autenticado
  if (requiresGuest && isAuthenticated) {
    // Evitar bucle de redirección
    if (from.path === '/') {
      return next(false)
    }
    return next({ path: '/' })
  }

  return next()
})

export default router
