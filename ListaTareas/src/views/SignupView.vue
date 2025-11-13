<template>
  <div class="signup-view">
    <div class="signup-card">
      <div class="signup-header">
        <div class="logo">
          <ClipboardDocumentListIcon class="logo-icon" />
          <h1>Lista de Tareas</h1>
        </div>
        <p>Crea tu cuenta</p>
      </div>

      <form @submit.prevent="handleSignup">
        <div class="form-group">
          <label for="fullName">Nombre completo</label>
          <input 
            type="text" 
            id="fullName" 
            v-model="fullName" 
            placeholder="Tu nombre"
            :disabled="loading"
          />
        </div>

        <div class="form-group">
          <label for="email">Correo electrónico</label>
          <input 
            type="email" 
            id="email" 
            v-model="email" 
            required
            placeholder="tu@email.com"
            :disabled="loading"
          />
        </div>

        <div class="form-group">
          <label for="password">Contraseña</label>
          <input 
            type="password" 
            id="password" 
            v-model="password" 
            required
            placeholder="••••••••"
            minlength="6"
            :disabled="loading"
          />
        </div>

        <div class="form-group">
          <label for="confirmPassword">Confirmar contraseña</label>
          <input 
            type="password" 
            id="confirmPassword" 
            v-model="confirmPassword" 
            required
            placeholder="••••••••"
            :disabled="loading"
          />
        </div>

        <div v-if="errorMessage" class="error-message">
          {{ errorMessage }}
        </div>

        <button type="submit" class="btn-primary" :disabled="loading">
          {{ loading ? 'Creando cuenta...' : 'Registrarse' }}
        </button>
      </form>

      <div class="signup-footer">
        <p>¿Ya tienes cuenta? <router-link to="/login">Inicia sesión aquí</router-link></p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { useToast } from '../composables/useToast'
import { ClipboardDocumentListIcon } from '@heroicons/vue/24/outline'

const router = useRouter()
const authStore = useAuthStore()
const { success, error: showError } = useToast()

const fullName = ref('')
const email = ref('')
const password = ref('')
const confirmPassword = ref('')
const loading = ref(false)
const errorMessage = ref('')

async function handleSignup() {
  loading.value = true
  errorMessage.value = ''

  // Validate passwords match
  if (password.value !== confirmPassword.value) {
    errorMessage.value = 'Las contraseñas no coinciden'
    showError(errorMessage.value)
    loading.value = false
    return
  }

  try {
    const { error } = await authStore.signUp(email.value, password.value, fullName.value)

    if (error) {
      errorMessage.value = error.message || 'Error al crear la cuenta'
      showError(errorMessage.value)
    } else {
      success('¡Cuenta creada exitosamente! Por favor verifica tu correo.')
      router.push('/login')
    }
  } catch (err: any) {
    errorMessage.value = err.message || 'Error inesperado'
    showError(errorMessage.value)
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.signup-view {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, var(--color-primary) 0%, var(--color-sandy) 100%);
  padding: 1rem;
}

.signup-card {
  background: white;
  border-radius: 12px;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
  padding: 2rem;
  width: 100%;
  max-width: 400px;
}

.signup-header {
  text-align: center;
  margin-bottom: 2rem;
}

.logo {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  margin-bottom: 0.5rem;
}

.logo-icon {
  width: 2.5rem;
  height: 2.5rem;
  color: var(--color-primary);
}

.signup-header h1 {
  margin: 0;
  font-size: 2rem;
  color: #111827;
}

.signup-header p {
  margin: 0;
  color: #6b7280;
}

.form-group {
  margin-bottom: 1.5rem;
}

.form-group label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 500;
  color: #374151;
}

.form-group input {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 1rem;
  transition: border-color 0.2s;
}

.form-group input:focus {
  outline: none;
  border-color: #3b82f6;
}

.form-group input:disabled {
  background: #f3f4f6;
  cursor: not-allowed;
}

.error-message {
  background: #fee2e2;
  color: #dc2626;
  padding: 0.75rem;
  border-radius: 6px;
  margin-bottom: 1rem;
  font-size: 0.875rem;
}

.btn-primary {
  width: 100%;
  padding: 0.75rem;
  background: var(--color-primary);
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 1rem;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.2s;
}

.btn-primary:hover:not(:disabled) {
  background: var(--color-primary-dark);
}

.btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.signup-footer {
  margin-top: 1.5rem;
  text-align: center;
  color: #6b7280;
}

.signup-footer a {
  color: var(--color-primary);
  text-decoration: none;
  font-weight: 500;
}

.signup-footer a:hover {
  text-decoration: underline;
}
</style>
