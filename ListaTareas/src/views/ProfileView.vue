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

        <!-- Sección de Integración con Moodle -->
        <div class="profile-section moodle-section">
          <h2>🎓 Integración con Moodle</h2>
          <p>Conecta tu calendario de Moodle para importar tareas automáticamente.</p>
          
          <div v-if="!isMoodleConfigured" class="moodle-setup">
            <div class="info-box">
              <h4>¿Cómo obtener tu URL de calendario iCal?</h4>
              <ol>
                <li>Ingresa a tu plataforma Moodle</li>
                <li>Ve a <strong>Calendario</strong></li>
                <li>Busca la opción <strong>"Exportar calendario"</strong> o <strong>"iCal"</strong></li>
                <li>Copia la URL del calendario (termina en .ics)</li>
              </ol>
            </div>
            
            <div class="form-group">
              <label for="moodleUrl">URL del calendario iCal</label>
              <input 
                type="url" 
                id="moodleUrl" 
                v-model="moodleUrlInput" 
                placeholder="https://moodle.ejemplo.edu/calendar/export_execute.php?..."
              />
            </div>
            
            <button 
              @click="handleSaveMoodleUrl" 
              class="btn-primary"
              :disabled="!moodleUrlInput || moodleSyncing"
            >
              Guardar y Conectar
            </button>
          </div>
          
          <div v-else class="moodle-connected">
            <div class="connection-status">
              <span class="status-badge success">✅ Conectado</span>
              <p class="url-preview">{{ truncateUrl(moodleUrl) }}</p>
            </div>
            
            <div class="moodle-actions">
              <button 
                @click="handleSyncMoodle" 
                class="btn-primary"
                :disabled="moodleSyncing"
              >
                <span v-if="moodleSyncing">⏳ Sincronizando...</span>
                <span v-else>🔄 Sincronizar Tareas</span>
              </button>
              
              <button 
                @click="handleRemoveMoodle" 
                class="btn-secondary"
                :disabled="moodleSyncing"
              >
                Desconectar
              </button>
            </div>
            
            <div v-if="lastSyncDate" class="last-sync">
              Última sincronización: {{ formatDate(lastSyncDate) }}
            </div>
            
            <div v-if="syncResult" class="sync-result" :class="{ 'has-errors': syncResult.errors.length > 0 }">
              <p v-if="syncResult.added > 0">✅ {{ syncResult.added }} tarea(s) importada(s)</p>
              <p v-if="syncResult.skipped > 0">⏭️ {{ syncResult.skipped }} tarea(s) ya existían</p>
              <div v-if="syncResult.errors.length > 0" class="sync-errors">
                <p>⚠️ Errores:</p>
                <ul>
                  <li v-for="(err, i) in syncResult.errors" :key="i">{{ err }}</li>
                </ul>
              </div>
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
import { useMoodleSync } from '../composables/useMoodleSync'
import NavBar from '../components/NavBar.vue'

const authStore = useAuthStore()
const { success, error } = useToast()

// Moodle integration
const {
  syncing: moodleSyncing,
  lastSyncDate,
  syncResult,
  moodleUrl,
  isMoodleConfigured,
  saveMoodleUrl,
  removeMoodleConfig,
  syncMoodleTasks
} = useMoodleSync()

const moodleUrlInput = ref('')

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

// Moodle handlers
async function handleSaveMoodleUrl() {
  if (moodleUrlInput.value) {
    const saved = await saveMoodleUrl(moodleUrlInput.value)
    if (saved) {
      moodleUrlInput.value = ''
      // Auto-sync after connecting
      await syncMoodleTasks()
    }
  }
}

async function handleSyncMoodle() {
  await syncMoodleTasks()
}

async function handleRemoveMoodle() {
  const confirmed = confirm('¿Estás seguro de que deseas desconectar Moodle?')
  if (confirmed) {
    await removeMoodleConfig()
  }
}

function truncateUrl(url: string | null): string {
  if (!url) return ''
  if (url.length <= 50) return url
  return url.substring(0, 47) + '...'
}

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('es', {
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(date)
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

/* Moodle Integration Styles */
.moodle-section {
  background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%);
  border: 1px solid #86efac;
}

.moodle-section h2 {
  color: #16a34a;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.moodle-section h2::before {
  content: "📚";
}

.moodle-setup {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.info-box {
  background: #fff;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  padding: 1rem;
  font-size: 0.875rem;
  color: #4b5563;
}

.info-box ol {
  margin: 0.5rem 0 0 1.25rem;
  padding: 0;
}

.info-box li {
  margin-bottom: 0.25rem;
}

.moodle-setup input[type="text"] {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 0.875rem;
}

.moodle-setup input[type="text"]:focus {
  outline: none;
  border-color: #16a34a;
  box-shadow: 0 0 0 3px rgba(22, 163, 74, 0.1);
}

.moodle-actions {
  display: flex;
  gap: 0.75rem;
}

.btn-success {
  padding: 0.75rem 1.5rem;
  background: #16a34a;
  color: white;
  border: none;
  border-radius: 6px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.2s;
}

.btn-success:hover:not(:disabled) {
  background: #15803d;
}

.btn-success:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-secondary {
  padding: 0.75rem 1.5rem;
  background: #6b7280;
  color: white;
  border: none;
  border-radius: 6px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.2s;
}

.btn-secondary:hover:not(:disabled) {
  background: #4b5563;
}

.btn-secondary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.moodle-connected {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.connection-status {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 1rem;
  background: #fff;
  border-radius: 8px;
  border: 1px solid #86efac;
}

.status-indicator {
  width: 12px;
  height: 12px;
  background: #22c55e;
  border-radius: 50%;
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}

.connection-status span {
  font-weight: 500;
  color: #16a34a;
}

.sync-actions {
  display: flex;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.sync-result {
  background: #fff;
  border-radius: 8px;
  padding: 1rem;
  border: 1px solid #d1d5db;
}

.sync-result h4 {
  margin: 0 0 0.75rem 0;
  color: #1f2937;
  font-size: 0.95rem;
}

.sync-result ul {
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.sync-result li {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
  color: #374151;
  padding: 0.5rem;
  background: #f9fafb;
  border-radius: 4px;
}

.sync-result li::before {
  content: "✓";
  color: #22c55e;
  font-weight: bold;
}
</style>
