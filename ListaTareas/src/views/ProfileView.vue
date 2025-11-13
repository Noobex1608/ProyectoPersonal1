<template>
  <div class="profile-view">
    <NavBar />
    
    <div class="container">
      <div class="header">
        <h1>Perfil</h1>
      </div>

      <div class="profile-card">
        <div class="profile-section">
          <h2>Información Personal</h2>
          
          <form @submit.prevent="handleUpdateProfile">
            <div class="form-group">
              <label for="email">Correo electrónico</label>
              <input 
                type="email" 
                id="email" 
                :value="profile?.email" 
                disabled
              />
              <small>El correo electrónico no puede ser modificado</small>
            </div>

            <div class="form-group">
              <label for="fullName">Nombre completo</label>
              <input 
                type="text" 
                id="fullName" 
                v-model="formData.full_name" 
                placeholder="Tu nombre"
              />
            </div>

            <div class="form-actions">
              <button type="submit" class="btn-primary" :disabled="loading">
                {{ loading ? 'Guardando...' : 'Guardar Cambios' }}
              </button>
            </div>
          </form>
        </div>

        <div class="profile-section">
          <h2>Notificaciones</h2>
          
          <div class="notification-settings">
            <div class="setting-item">
              <div class="setting-info">
                <h3>Habilitar notificaciones</h3>
                <p>Recibe recordatorios por correo electrónico</p>
              </div>
              <label class="toggle">
                <input 
                  type="checkbox" 
                  v-model="formData.notification_enabled"
                  @change="handleUpdateProfile"
                />
                <span class="slider"></span>
              </label>
            </div>

            <div v-if="formData.notification_enabled" class="form-group">
              <label for="notificationTime">Hora de resumen diario</label>
              <input 
                type="time" 
                id="notificationTime" 
                v-model="formData.notification_time"
                @change="handleUpdateProfile"
              />
            </div>
          </div>
        </div>

        <div class="profile-section danger-zone">
          <h2>Zona de Peligro</h2>
          <p>Una vez que elimines tu cuenta, no hay vuelta atrás. Por favor, ten cuidado.</p>
          <button @click="handleDeleteAccount" class="btn-danger">
            Eliminar Cuenta
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useAuthStore } from '../stores/auth'
import { useToast } from '../composables/useToast'
import NavBar from '../components/NavBar.vue'

const authStore = useAuthStore()
const { success, error } = useToast()

const loading = ref(false)

const profile = computed(() => authStore.profile)

const formData = ref({
  full_name: '',
  notification_enabled: true,
  notification_time: '09:00'
})

onMounted(() => {
  if (profile.value) {
    formData.value = {
      full_name: profile.value.full_name || '',
      notification_enabled: profile.value.notification_enabled,
      notification_time: profile.value.notification_time || '09:00'
    }
  }
})

async function handleUpdateProfile() {
  loading.value = true

  try {
    const result = await authStore.updateProfile({
      full_name: formData.value.full_name || null,
      notification_enabled: formData.value.notification_enabled,
      notification_time: formData.value.notification_time
    })

    if (result?.error) {
      error('Error al actualizar el perfil')
    } else {
      success('Perfil actualizado correctamente')
    }
  } finally {
    loading.value = false
  }
}

async function handleDeleteAccount() {
  const confirmed = confirm(
    '¿Estás seguro de que deseas eliminar tu cuenta? Esta acción no se puede deshacer.'
  )
  
  if (!confirmed) return

  const doubleConfirmed = confirm(
    '¿Estás ABSOLUTAMENTE seguro? Todos tus datos se perderán permanentemente.'
  )

  if (!doubleConfirmed) return

  error('Funcionalidad de eliminación de cuenta no implementada aún')
  // TODO: Implement account deletion
}
</script>

<style scoped>
.profile-view {
  min-height: 100vh;
  background: #f9fafb;
}

.container {
  max-width: 800px;
  margin: 0 auto;
  padding: 2rem;
}

.header {
  margin-bottom: 2rem;
}

.header h1 {
  margin: 0;
  font-size: 2rem;
  color: #111827;
}

.profile-card {
  background: white;
  border-radius: 12px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

.profile-section {
  padding: 2rem;
  border-bottom: 1px solid #e5e7eb;
}

.profile-section:last-child {
  border-bottom: none;
}

.profile-section h2 {
  margin: 0 0 1.5rem 0;
  font-size: 1.25rem;
  color: #111827;
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
}

.form-group input:focus {
  outline: none;
  border-color: #3b82f6;
}

.form-group input:disabled {
  background: #f3f4f6;
  cursor: not-allowed;
}

.form-group small {
  display: block;
  margin-top: 0.25rem;
  color: #6b7280;
  font-size: 0.875rem;
}

.notification-settings {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.setting-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
}

.setting-info h3 {
  margin: 0 0 0.25rem 0;
  font-size: 1rem;
  color: #111827;
}

.setting-info p {
  margin: 0;
  font-size: 0.875rem;
  color: #6b7280;
}

.toggle {
  position: relative;
  display: inline-block;
  width: 50px;
  height: 26px;
  flex-shrink: 0;
}

.toggle input {
  opacity: 0;
  width: 0;
  height: 0;
}

.slider {
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: #cbd5e1;
  transition: 0.4s;
  border-radius: 34px;
}

.slider:before {
  position: absolute;
  content: "";
  height: 20px;
  width: 20px;
  left: 3px;
  bottom: 3px;
  background-color: white;
  transition: 0.4s;
  border-radius: 50%;
}

input:checked + .slider {
  background-color: #3b82f6;
}

input:checked + .slider:before {
  transform: translateX(24px);
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 1.5rem;
}

.btn-primary {
  padding: 0.75rem 1.5rem;
  background: #3b82f6;
  color: white;
  border: none;
  border-radius: 6px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.2s;
}

.btn-primary:hover:not(:disabled) {
  background: #2563eb;
}

.btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.danger-zone {
  background: #fef2f2;
}

.danger-zone h2 {
  color: #dc2626;
}

.danger-zone p {
  color: #6b7280;
  margin-bottom: 1rem;
}

.btn-danger {
  padding: 0.75rem 1.5rem;
  background: #dc2626;
  color: white;
  border: none;
  border-radius: 6px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.2s;
}

.btn-danger:hover {
  background: #b91c1c;
}

@media (max-width: 640px) {
  .container {
    padding: 1rem;
  }

  .profile-section {
    padding: 1.5rem;
  }

  .setting-item {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
