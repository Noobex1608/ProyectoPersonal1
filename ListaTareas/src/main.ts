import { createApp } from 'vue'
import { createPinia } from 'pinia'
import './style.css'
import App from './App.vue'
import router from './router'
import { useAuthStore } from './stores/auth'

const app = createApp(App)
const pinia = createPinia()

// Configurar plugins
app.use(pinia)
app.use(router)

// Inicializar autenticación ANTES de montar la app (patrón encuestas)
const authStore = useAuthStore()
authStore.initialize().then(() => {
  app.mount('#app')
})
