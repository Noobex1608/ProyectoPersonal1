<template>
  <div class="telegram-integration">
    <div class="integration-card">
      <div class="card-header">
        <div class="header-icon">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="telegram-icon">
            <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.562 8.161l-1.84 8.673c-.138.613-.5.76-1.013.474l-2.8-2.062-1.35 1.3c-.15.15-.275.275-.563.275l.2-2.85 5.188-4.687c.225-.2-.05-.312-.35-.112l-6.4 4.037-2.763-.863c-.6-.187-.612-.6.125-.887l10.8-4.162c.5-.187.938.112.775.887z"/>
          </svg>
        </div>
        <div class="header-content">
          <h3>Integración con Telegram</h3>
          <p>Crea tareas enviando audios a tu bot personal</p>
        </div>
      </div>

      <div v-if="!telegramLinked" class="link-section">
        <div class="info-box">
          <p>📱 Vincula tu cuenta de Telegram para poder crear tareas mediante mensajes de voz.</p>
        </div>

        <!-- Opción 1: Deep Link (requiere Telegram Desktop) -->
        <div class="link-option">
          <h4>Método 1: Abrir directamente</h4>
          <p class="method-description">Si tienes Telegram Desktop instalado</p>
          <button @click="linkTelegramAccount" class="link-btn">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="icon">
              <path stroke-linecap="round" stroke-linejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
            </svg>
            Abrir Telegram
          </button>
        </div>

        <!-- Opción 2: Código de vinculación (funciona siempre) -->
        <div class="link-option">
          <h4>Método 2: Código de vinculación</h4>
          <p class="method-description">Funciona en cualquier dispositivo</p>
          
          <div v-if="!linkCode" class="code-generate">
            <button @click="generateLinkCode" class="secondary-btn" :disabled="generatingCode">
              {{ generatingCode ? 'Generando...' : 'Generar código de vinculación' }}
            </button>
          </div>

          <div v-else class="code-display">
            <div class="code-box">
              <span class="code-label">Tu código:</span>
              <span class="code-value">{{ linkCode }}</span>
              <button @click="copyCode" class="copy-btn" title="Copiar">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="icon-sm">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184" />
                </svg>
              </button>
            </div>
            
            <ol class="code-steps">
              <li>Abre Telegram en tu dispositivo</li>
              <li>Busca el bot: <strong>@{{ TELEGRAM_BOT_USERNAME }}</strong></li>
              <li>Envía el comando: <code>/link {{ linkCode }}</code></li>
            </ol>

            <button @click="checkLinkStatus" class="check-btn" :disabled="checkingStatus">
              {{ checkingStatus ? 'Verificando...' : '🔄 Verificar vinculación' }}
            </button>
          </div>
        </div>
      </div>

      <div v-else class="linked-section">
        <div class="success-box">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="success-icon">
            <path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h4>¡Cuenta vinculada!</h4>
          <p>Telegram ID: <code>{{ telegramId }}</code></p>
        </div>

        <div class="usage-info">
          <h4>Cómo usar:</h4>
          <ul>
            <li>🎤 Graba un mensaje de voz describiendo tu tarea</li>
            <li>📤 Envíalo al bot de Telegram</li>
            <li>⚡ La tarea se creará automáticamente aquí</li>
          </ul>
          
          <div class="examples">
            <p><strong>Ejemplos:</strong></p>
            <ul class="example-list">
              <li>"Comprar leche mañana"</li>
              <li>"Llamar al doctor el viernes, es urgente"</li>
              <li>"Estudiar para el examen de matemáticas"</li>
            </ul>
          </div>
        </div>

        <button @click="unlinkTelegramAccount" class="unlink-btn">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="icon">
            <path stroke-linecap="round" stroke-linejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
          </svg>
          Desvincular cuenta
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { supabase } from '@/lib/supabase'

const authStore = useAuthStore()
const telegramId = ref<number | null>(null)
const linkCode = ref<string | null>(null)
const generatingCode = ref(false)
const checkingStatus = ref(false)

const TELEGRAM_BOT_USERNAME = import.meta.env.VITE_TELEGRAM_BOT_USERNAME || 'tu_bot_username'

const userId = computed(() => authStore.user?.id)
const telegramLinked = computed(() => telegramId.value !== null)

onMounted(async () => {
  await checkTelegramLink()
})

async function checkTelegramLink() {
  if (!authStore.user) return
  
  const { data, error } = await supabase
    .from('profiles')
    .select('telegram_id')
    .eq('id', authStore.user.id)
    .single()
  
  if (data && !error) {
    telegramId.value = data.telegram_id
  }
}

function linkTelegramAccount() {
  if (!userId.value) return
  
  // Crear deep link con el user ID codificado
  const deepLink = `https://t.me/${TELEGRAM_BOT_USERNAME}?start=${userId.value}`
  window.open(deepLink, '_blank')
  
  // Recargar después de 5 segundos para verificar la vinculación
  setTimeout(() => {
    checkTelegramLink()
  }, 5000)
}

async function generateLinkCode() {
  if (!authStore.user) return
  
  generatingCode.value = true
  
  try {
    // Generar código de 6 dígitos
    const code = Math.floor(100000 + Math.random() * 900000).toString()
    
    // Guardar en Supabase con expiración de 10 minutos
    const { error } = await supabase
      .from('telegram_link_codes')
      .insert({
        user_id: authStore.user.id,
        code: code,
        expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString()
      })
    
    if (error) {
      console.error('Error generando código:', error)
      alert('Error al generar código. Intenta de nuevo.')
      return
    }
    
    linkCode.value = code
  } catch (error) {
    console.error('Error:', error)
    alert('Error al generar código')
  } finally {
    generatingCode.value = false
  }
}

async function copyCode() {
  if (!linkCode.value) return
  
  try {
    await navigator.clipboard.writeText(linkCode.value)
    alert('Código copiado al portapapeles')
  } catch (error) {
    console.error('Error copiando:', error)
  }
}

async function checkLinkStatus() {
  checkingStatus.value = true
  await checkTelegramLink()
  checkingStatus.value = false
  
  if (!telegramLinked.value) {
    alert('Aún no vinculado. Asegúrate de enviar el código al bot.')
  }
}

async function unlinkTelegramAccount() {
  if (!authStore.user) return
  
  const confirmed = confirm('¿Estás seguro de que quieres desvincular tu cuenta de Telegram?')
  if (!confirmed) return
  
  const { error } = await supabase
    .from('profiles')
    .update({ telegram_id: null })
    .eq('id', authStore.user.id)
  
  if (!error) {
    telegramId.value = null
  }
}
</script>

<style scoped>
.telegram-integration {
  max-width: 600px;
  margin: 0 auto;
}

.integration-card {
  background: white;
  border-radius: 1rem;
  border: 2px solid #e5e7eb;
  overflow: hidden;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
}

.card-header {
  background: linear-gradient(135deg, #0088cc 0%, #00aced 100%);
  color: white;
  padding: 2rem;
  display: flex;
  align-items: center;
  gap: 1.5rem;
}

.header-icon {
  width: 4rem;
  height: 4rem;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 1rem;
  display: flex;
  align-items: center;
  justify-content: center;
  backdrop-filter: blur(8px);
}

.telegram-icon {
  width: 2.5rem;
  height: 2.5rem;
}

.header-content h3 {
  margin: 0 0 0.5rem 0;
  font-size: 1.5rem;
  font-weight: 700;
}

.header-content p {
  margin: 0;
  opacity: 0.9;
  font-size: 0.95rem;
}

.link-section,
.linked-section {
  padding: 2rem;
}

.info-box {
  background: #eff6ff;
  border: 2px solid #dbeafe;
  border-radius: 0.75rem;
  padding: 1.5rem;
  margin-bottom: 1.5rem;
}

.info-box p {
  margin: 0 0 0.75rem 0;
  color: #1e40af;
}

.info-box p:last-child {
  margin-bottom: 0;
}

.info-small {
  font-size: 0.875rem;
  color: #6b7280;
}

code {
  background: rgba(0, 136, 204, 0.1);
  padding: 0.25rem 0.5rem;
  border-radius: 0.25rem;
  font-family: 'Courier New', monospace;
  font-size: 0.875rem;
  color: #0088cc;
}

.link-btn,
.unlink-btn {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  padding: 1rem 1.5rem;
  border: none;
  border-radius: 0.75rem;
  font-weight: 600;
  font-size: 1rem;
  cursor: pointer;
  transition: all 0.2s;
}

.link-btn {
  background: #0088cc;
  color: white;
}

.link-btn:hover {
  background: #0077b3;
  transform: translateY(-2px);
  box-shadow: 0 10px 20px rgba(0, 136, 204, 0.3);
}

.unlink-btn {
  background: #fee2e2;
  color: #dc2626;
  margin-top: 1.5rem;
}

.unlink-btn:hover {
  background: #fecaca;
}

.icon {
  width: 1.5rem;
  height: 1.5rem;
}

.steps {
  margin-top: 2rem;
  padding: 1.5rem;
  background: #f9fafb;
  border-radius: 0.75rem;
}

.steps h4 {
  margin: 0 0 1rem 0;
  color: #374151;
  font-size: 1rem;
}

.steps ol {
  margin: 0;
  padding-left: 1.5rem;
}

.steps li {
  margin-bottom: 0.75rem;
  color: #6b7280;
  line-height: 1.6;
}

.steps li:last-child {
  margin-bottom: 0;
}

.success-box {
  background: linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%);
  border: 2px solid #6ee7b7;
  border-radius: 0.75rem;
  padding: 2rem;
  text-align: center;
  margin-bottom: 2rem;
}

.success-icon {
  width: 4rem;
  height: 4rem;
  color: #059669;
  margin: 0 auto 1rem;
}

.success-box h4 {
  margin: 0 0 0.5rem 0;
  color: #047857;
  font-size: 1.25rem;
}

.success-box p {
  margin: 0;
  color: #065f46;
}

.usage-info {
  background: #f9fafb;
  padding: 1.5rem;
  border-radius: 0.75rem;
}

.usage-info h4 {
  margin: 0 0 1rem 0;
  color: #374151;
}

.usage-info ul {
  margin: 0;
  padding-left: 1.5rem;
}

.usage-info li {
  margin-bottom: 0.75rem;
  color: #6b7280;
  line-height: 1.6;
}

.examples {
  margin-top: 1.5rem;
  padding-top: 1.5rem;
  border-top: 2px solid #e5e7eb;
}

.examples p {
  margin: 0 0 0.75rem 0;
  color: #374151;
}

.example-list {
  padding-left: 1.5rem;
}

.example-list li {
  font-style: italic;
  color: #0088cc;
}
</style>
