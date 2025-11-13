<template>
  <div class="chatbot-container">
    <!-- Botón flotante para abrir/cerrar -->
    <button 
      v-if="!isOpen" 
      @click="toggleChat" 
      class="chat-button"
      aria-label="Abrir asistente"
    >
      <ChatBubbleLeftRightIcon class="icon" />
    </button>

    <!-- Ventana de chat -->
    <transition name="slide-up">
      <div v-if="isOpen" class="chat-window">
        <div class="chat-header">
          <div class="header-content">
            <div class="bot-avatar">🤖</div>
            <div>
              <h3>Asistente de Tareas</h3>
              <p class="status">
                <span class="status-dot"></span>
                En línea
              </p>
            </div>
          </div>
          <button @click="toggleChat" class="close-button">
            <XMarkIcon class="icon" />
          </button>
        </div>

        <div class="chat-messages" ref="messagesContainer">
          <div 
            v-for="message in messages" 
            :key="message.id"
            :class="['message', message.role]"
          >
            <div class="message-content">
              <div v-if="message.role === 'assistant'" class="avatar">🤖</div>
              <div class="bubble">
                <p v-html="formatMessage(message.content)"></p>
                <span class="timestamp">{{ formatTime(message.timestamp) }}</span>
              </div>
            </div>
          </div>

          <div v-if="isTyping" class="message assistant">
            <div class="message-content">
              <div class="avatar">🤖</div>
              <div class="bubble typing">
                <span></span>
                <span></span>
                <span></span>
              </div>
            </div>
          </div>
        </div>

        <!-- Botones de acción según el estado -->
        <div class="action-buttons">
          <!-- Botones iniciales -->
          <div v-if="creationPhase === 'idle'" class="button-grid">
            <button 
              @click="sendMessage('Crear tarea')"
              class="action-btn primary"
              :disabled="isTyping"
            >
              ✨ Crear nueva tarea
            </button>
            <button 
              @click="sendMessage('¿Qué tareas tengo pendientes?')"
              class="action-btn"
              :disabled="isTyping"
            >
              📋 Ver tareas pendientes
            </button>
            <button 
              @click="sendMessage('¿Cuáles son urgentes?')"
              class="action-btn"
              :disabled="isTyping"
            >
              ⚠️ Tareas urgentes
            </button>
            <button 
              @click="sendMessage('Tareas de hoy')"
              class="action-btn"
              :disabled="isTyping"
            >
              📅 Tareas de hoy
            </button>
          </div>

          <!-- Botones para seleccionar prioridad -->
          <div v-else-if="creationPhase === 'priority'" class="button-grid">
            <button 
              @click="sendMessage('Baja')"
              class="action-btn priority-low"
              :disabled="isTyping"
            >
              🟢 Baja
            </button>
            <button 
              @click="sendMessage('Media')"
              class="action-btn priority-medium"
              :disabled="isTyping"
            >
              🟡 Media
            </button>
            <button 
              @click="sendMessage('Alta')"
              class="action-btn priority-high"
              :disabled="isTyping"
            >
              🟠 Alta
            </button>
            <button 
              @click="sendMessage('Urgente')"
              class="action-btn priority-urgent"
              :disabled="isTyping"
            >
              🔴 Urgente
            </button>
          </div>

          <!-- Botones para seleccionar fecha -->
          <div v-else-if="creationPhase === 'date'" class="button-grid">
            <button 
              @click="sendMessage('Hoy')"
              class="action-btn"
              :disabled="isTyping"
            >
              📅 Hoy
            </button>
            <button 
              @click="sendMessage('Mañana')"
              class="action-btn"
              :disabled="isTyping"
            >
              📅 Mañana
            </button>
            <button 
              @click="sendMessage('Sin fecha')"
              class="action-btn"
              :disabled="isTyping"
            >
              ⏳ Sin fecha
            </button>
          </div>

          <!-- Input de texto solo para el título -->
          <div v-else-if="creationPhase === 'title'" class="chat-input">
            <input 
              v-model="userInput"
              @keydown.enter="handleSend"
              placeholder="Escribe el nombre de la tarea..."
              :disabled="isTyping"
              ref="titleInput"
            />
            <button 
              @click="handleSend" 
              :disabled="!userInput.trim() || isTyping"
              class="send-button"
            >
              <PaperAirplaneIcon class="icon" />
            </button>
          </div>
        </div>
      </div>
    </transition>
  </div>
</template>

<script setup lang="ts">
import { ref, nextTick, onMounted } from 'vue'
import { useTodosStore } from '../stores/todos'
import { ChatBubbleLeftRightIcon, XMarkIcon, PaperAirplaneIcon } from '@heroicons/vue/24/outline'
import type { TodoInsert } from '../interfaces'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

type CreationPhase = 'idle' | 'priority' | 'date' | 'title'

interface TaskCreationData {
  priority?: 'low' | 'medium' | 'high' | 'urgent'
  date?: 'today' | 'tomorrow' | 'none'
  title?: string
}

const todosStore = useTodosStore()

const isOpen = ref(false)
const userInput = ref('')
const isTyping = ref(false)
const messages = ref<Message[]>([])
const messagesContainer = ref<HTMLElement | null>(null)
const titleInput = ref<HTMLInputElement | null>(null)

// Estado del flujo de creación de tareas
const creationPhase = ref<CreationPhase>('idle')
const taskData = ref<TaskCreationData>({})

onMounted(() => {
  // Mensaje de bienvenida
  addMessage('assistant', '👋 ¡Hola! Soy tu asistente de tareas.\n\nSelecciona una opción de los botones de abajo para comenzar:')
})

function toggleChat() {
  isOpen.value = !isOpen.value
  if (isOpen.value) {
    nextTick(() => scrollToBottom())
  }
}

function addMessage(role: 'user' | 'assistant', content: string) {
  messages.value.push({
    id: Date.now().toString(),
    role,
    content,
    timestamp: new Date()
  })
  nextTick(() => scrollToBottom())
}

function scrollToBottom() {
  if (messagesContainer.value) {
    messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
  }
}

async function handleSend() {
  if (!userInput.value.trim() || isTyping.value) return

  const message = userInput.value.trim()
  addMessage('user', message)
  userInput.value = ''
  
  isTyping.value = true
  await processMessage(message)
  isTyping.value = false
}

function sendMessage(text: string) {
  userInput.value = text
  handleSend()
}

async function processMessage(message: string) {
  const lowerMessage = message.toLowerCase().trim()

  // Si estamos en proceso de crear una tarea, manejar el flujo
  if (creationPhase.value !== 'idle') {
    await handleCreationFlow(message)
    return
  }

  // Asegurar que los datos estén cargados para cualquier consulta
  if (todosStore.todos.length === 0) {
    await todosStore.fetchTodos()
  }

  // Detectar intención de crear tarea
  if (lowerMessage.includes('crear') || lowerMessage === 'crear tarea') {
    startTaskCreation()
    return
  }

  // Detectar tareas urgentes
  if (lowerMessage.includes('urgente')) {
    const urgentTasks = todosStore.todos.filter(t => 
      t.priority === 'urgent' && t.status !== 'completed'
    )
    
    if (urgentTasks.length === 0) {
      addMessage('assistant', '🎉 ¡Genial! No tienes tareas urgentes en este momento.\n\n¿Qué deseas hacer ahora?')
    } else {
      let response = `⚠️ Tienes ${urgentTasks.length} tarea${urgentTasks.length > 1 ? 's' : ''} urgente${urgentTasks.length > 1 ? 's' : ''}:\n\n`
      urgentTasks.forEach((task, i) => {
        response += `${i + 1}. 🔴 ${task.title}\n`
        response += `   ⏳ ${getStatusText(task.status)}`
        if (task.due_date) {
          const date = new Date(task.due_date)
          response += ` • ${date.toLocaleDateString('es')}`
        }
        response += '\n\n'
      })
      response += '¿Qué deseas hacer ahora?'
      addMessage('assistant', response)
    }
    return
  }

  // Detectar tareas de hoy
  if (lowerMessage.includes('hoy')) {
    const todayTasks = todosStore.todayTodos
    
    if (todayTasks.length === 0) {
      addMessage('assistant', '📅 No tienes tareas programadas para hoy.\n\n¿Qué deseas hacer ahora?')
    } else {
      let response = `📅 Tareas de hoy (${todayTasks.length}):\n\n`
      todayTasks.forEach((task, i) => {
        const priority = getPriorityEmoji(task.priority)
        const time = task.due_date ? new Date(task.due_date).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' }) : ''
        response += `${i + 1}. ${priority} ${task.title}`
        if (time) response += ` - ${time}`
        response += '\n'
      })
      response += '\n¿Qué deseas hacer ahora?'
      addMessage('assistant', response)
    }
    return
  }

  // Detectar intención de consultar tareas
  if (
    lowerMessage.includes('pendiente') || 
    lowerMessage.includes('tareas') ||
    lowerMessage.includes('qué tengo') ||
    lowerMessage.includes('lista')
  ) {
    await handleListTasks(lowerMessage)
    return
  }

  // Respuesta por defecto
  addMessage('assistant', '🤔 No estoy seguro de cómo ayudarte con eso. Puedo:\n\n• Mostrar tus tareas pendientes\n• Crear nuevas tareas\n• Buscar tareas urgentes\n• Mostrar tareas de hoy\n\n¿Qué te gustaría hacer?')
}

function startTaskCreation() {
  taskData.value = {}
  creationPhase.value = 'priority'
  
  addMessage('assistant', '✨ ¡Perfecto! Vamos a crear una tarea nueva.\n\n🎯 **Paso 1/3: Prioridad**\n\n¿Qué prioridad tiene esta tarea?\n\n🟢 Baja\n🟡 Media\n🟠 Alta\n🔴 Urgente')
}

async function handleCreationFlow(message: string) {
  const lowerMessage = message.toLowerCase().trim()

  if (creationPhase.value === 'priority') {
    // Detectar prioridad
    let priority: 'low' | 'medium' | 'high' | 'urgent' = 'medium'
    
    if (lowerMessage.includes('baja') || lowerMessage.includes('🟢') || lowerMessage === 'baja') {
      priority = 'low'
    } else if (lowerMessage.includes('alta') || lowerMessage.includes('🟠') || lowerMessage === 'alta') {
      priority = 'high'
    } else if (lowerMessage.includes('urgente') || lowerMessage.includes('🔴') || lowerMessage === 'urgente') {
      priority = 'urgent'
    } else if (lowerMessage.includes('media') || lowerMessage.includes('🟡') || lowerMessage === 'media') {
      priority = 'medium'
    } else {
      addMessage('assistant', '❓ No entendí la prioridad. Por favor elige:\n\n🟢 Baja\n� Media\n🟠 Alta\n🔴 Urgente')
      return
    }
    
    taskData.value.priority = priority
    creationPhase.value = 'date'
    
    const priorityText = getPriorityEmoji(priority) + ' ' + getPriorityText(priority)
    addMessage('assistant', `Perfecto, prioridad: ${priorityText}\n\n📅 **Paso 2/3: Fecha**\n\n¿Para cuándo es esta tarea?\n\n• Hoy\n• Mañana\n• Sin fecha`)
    return
  }

  if (creationPhase.value === 'date') {
    // Detectar fecha
    let date: 'today' | 'tomorrow' | 'none' = 'none'
    
    if (lowerMessage.includes('hoy')) {
      date = 'today'
    } else if (lowerMessage.includes('mañana')) {
      date = 'tomorrow'
    } else if (lowerMessage.includes('sin') || lowerMessage.includes('no') || lowerMessage.includes('ninguna')) {
      date = 'none'
    } else {
      addMessage('assistant', '❓ No entendí la fecha. Por favor elige:\n\n• Hoy\n• Mañana\n• Sin fecha')
      return
    }
    
    taskData.value.date = date
    creationPhase.value = 'title'
    
    const dateText = date === 'today' ? '📅 Hoy' : date === 'tomorrow' ? '📅 Mañana' : '⏳ Sin fecha'
    addMessage('assistant', `Entendido: ${dateText}\n\n📝 **Paso 3/3: Título**\n\n¿Cómo se llama la tarea?`)
    
    // Enfocar el input después de un pequeño delay
    nextTick(() => {
      setTimeout(() => {
        titleInput.value?.focus()
      }, 100)
    })
    return
  }

  if (creationPhase.value === 'title') {
    // Guardar título y crear la tarea
    const title = message.trim()
    
    if (title.length < 3) {
      addMessage('assistant', '❓ El título es muy corto. Por favor, proporciona un título descriptivo para la tarea.')
      return
    }
    
    taskData.value.title = title
    
    // Crear la tarea
    await createTaskFromFlow()
    
    // Reset
    creationPhase.value = 'idle'
    taskData.value = {}
  }
}

async function createTaskFromFlow() {
  const { priority, date, title } = taskData.value
  
  if (!priority || !title) {
    addMessage('assistant', '❌ Error: Faltan datos para crear la tarea.')
    return
  }

  let dueDate: string | null = null
  
  if (date === 'today') {
    const today = new Date()
    today.setHours(23, 59, 59, 999)
    dueDate = today.toISOString()
  } else if (date === 'tomorrow') {
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    tomorrow.setHours(23, 59, 59, 999)
    dueDate = tomorrow.toISOString()
  }

  const taskInsert: TodoInsert = {
    title,
    description: null,
    category_id: null,
    priority,
    status: 'pending',
    due_date: dueDate
  }

  isTyping.value = true
  const result = await todosStore.createTodo(taskInsert)
  isTyping.value = false

  if (result.success) {
    let response = '✅ ¡Tarea creada exitosamente!\n\n'
    response += `📝 **${title}**\n`
    response += `🎯 Prioridad: ${getPriorityText(priority)}\n`
    if (dueDate) {
      response += `📅 Fecha: ${date === 'today' ? 'Hoy' : 'Mañana'}\n`
    }
    response += '\n¿Qué deseas hacer ahora?'
    
    addMessage('assistant', response)
  } else {
    addMessage('assistant', '❌ Lo siento, hubo un error al crear la tarea. Por favor, intenta nuevamente.')
  }
}

async function handleListTasks(query: string) {
  // Asegurar que los datos estén cargados
  if (todosStore.todos.length === 0) {
    await todosStore.fetchTodos()
  }

  let tasks = todosStore.todos

  // Filtrar por estado si se especifica
  if (query.includes('pendiente')) {
    tasks = todosStore.pendingTodos
  } else if (query.includes('progreso')) {
    tasks = todosStore.inProgressTodos
  } else if (query.includes('completada')) {
    tasks = todosStore.completedTodos
  }

  if (tasks.length === 0) {
    addMessage('assistant', '✨ ¡Excelente! No tienes tareas en esa categoría.\n\n¿Qué deseas hacer ahora?')
    return
  }

  let response = `📋 Tienes ${tasks.length} tarea${tasks.length > 1 ? 's' : ''}:\n\n`
  
  tasks.slice(0, 10).forEach((task, i) => {
    const priority = getPriorityEmoji(task.priority)
    const status = getStatusText(task.status)
    response += `${i + 1}. ${priority} ${task.title}\n   ${status}`
    
    if (task.due_date) {
      const date = new Date(task.due_date)
      const isOverdue = date < new Date() && task.status !== 'completed'
      response += ` • ${isOverdue ? '⚠️ ' : ''}${date.toLocaleDateString('es')}`
    }
    
    response += '\n\n'
  })

  if (tasks.length > 10) {
    response += `... y ${tasks.length - 10} más\n\n`
  }
  
  response += '¿Qué deseas hacer ahora?'

  addMessage('assistant', response)
}

function getPriorityEmoji(priority: string): string {
  const emojis: Record<string, string> = {
    low: '🟢',
    medium: '🟡',
    high: '🟠',
    urgent: '🔴'
  }
  return emojis[priority] || '⚪'
}

function getPriorityText(priority: string): string {
  const texts: Record<string, string> = {
    low: 'Baja',
    medium: 'Media',
    high: 'Alta',
    urgent: 'Urgente'
  }
  return texts[priority] || 'Media'
}

function getStatusText(status: string): string {
  const texts: Record<string, string> = {
    pending: '⏳ Pendiente',
    in_progress: '🔄 En progreso',
    completed: '✅ Completada',
    cancelled: '❌ Cancelada'
  }
  return texts[status] || status
}

function formatMessage(content: string): string {
  // Convertir saltos de línea a <br>
  return content.replace(/\n/g, '<br>')
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })
}
</script>

<style scoped>
.chatbot-container {
  position: fixed;
  bottom: 2rem;
  right: 2rem;
  z-index: 999;
}

.chat-button {
  width: 60px;
  height: 60px;
  border-radius: 50%;
  background: linear-gradient(135deg, #F06543 0%, #F09D51 100%);
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 12px rgba(240, 101, 67, 0.4);
  transition: all 0.3s ease;
}

.chat-button:hover {
  transform: scale(1.1);
  box-shadow: 0 6px 16px rgba(240, 101, 67, 0.6);
}

.chat-button .icon {
  width: 28px;
  height: 28px;
  color: white;
}

.chat-window {
  width: 400px;
  height: 600px;
  background: white;
  border-radius: 16px;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.2);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.chat-header {
  background: linear-gradient(135deg, #F06543 0%, #F09D51 100%);
  color: white;
  padding: 1.25rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-content {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.bot-avatar {
  width: 40px;
  height: 40px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.25rem;
}

.chat-header h3 {
  margin: 0;
  font-size: 1.1rem;
  font-weight: 600;
}

.status {
  margin: 0;
  font-size: 0.75rem;
  opacity: 0.9;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.status-dot {
  width: 8px;
  height: 8px;
  background: #4ade80;
  border-radius: 50%;
  animation: pulse 2s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.close-button {
  background: rgba(255, 255, 255, 0.2);
  border: none;
  padding: 0.5rem;
  border-radius: 8px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.2s;
}

.close-button:hover {
  background: rgba(255, 255, 255, 0.3);
}

.close-button .icon {
  width: 1.25rem;
  height: 1.25rem;
  color: white;
}

.chat-messages {
  flex: 1;
  overflow-y: auto;
  padding: 1.5rem;
  background: #f9fafb;
}

.message {
  margin-bottom: 1.5rem;
  animation: fadeIn 0.3s ease;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.message-content {
  display: flex;
  gap: 0.75rem;
}

.message.user .message-content {
  flex-direction: row-reverse;
}

.avatar {
  width: 32px;
  height: 32px;
  background: linear-gradient(135deg, #F06543 0%, #F09D51 100%);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1rem;
  flex-shrink: 0;
}

.bubble {
  max-width: 75%;
  padding: 0.875rem 1.125rem;
  border-radius: 18px;
  position: relative;
}

.message.assistant .bubble {
  background: white;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  border-bottom-left-radius: 4px;
}

.message.user .bubble {
  background: linear-gradient(135deg, #F06543 0%, #F09D51 100%);
  color: white;
  border-bottom-right-radius: 4px;
  margin-left: auto;
}

.bubble p {
  margin: 0;
  line-height: 1.5;
  white-space: pre-line;
}

.timestamp {
  display: block;
  font-size: 0.7rem;
  margin-top: 0.5rem;
  opacity: 0.6;
}

.bubble.typing {
  display: flex;
  gap: 0.5rem;
  padding: 1rem 1.5rem;
}

.bubble.typing span {
  width: 8px;
  height: 8px;
  background: #F06543;
  border-radius: 50%;
  animation: bounce 1.4s ease-in-out infinite;
}

.bubble.typing span:nth-child(2) {
  animation-delay: 0.2s;
}

.bubble.typing span:nth-child(3) {
  animation-delay: 0.4s;
}

@keyframes typing {
  0%, 60%, 100% {
    transform: translateY(0);
  }
  30% {
    transform: translateY(-10px);
  }
}

.quick-actions {
  padding: 1rem;
  border-top: 1px solid #e5e7eb;
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  background: white;
}

.suggestion-btn {
  padding: 0.5rem 1rem;
  background: #f3f4f6;
  border: 1px solid #e5e7eb;
  border-radius: 20px;
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 0.2s;
  color: #374151;
}

.suggestion-btn:hover {
  background: #e5e7eb;
  border-color: #d1d5db;
}

.action-buttons {
  padding: 1rem;
  background: white;
  border-top: 1px solid #e5e7eb;
}

.button-grid {
  display: grid;
  gap: 0.75rem;
  grid-template-columns: 1fr;
}

.action-btn {
  padding: 1rem;
  border: 2px solid #e5e7eb;
  border-radius: 12px;
  background: white;
  font-size: 0.95rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  color: #374151;
  text-align: left;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.action-btn:hover:not(:disabled) {
  border-color: #F06543;
  background: #fcb3a6;
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(240, 101, 67, 0.15);
}

.action-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.action-btn.primary {
  background: linear-gradient(135deg, #F06543 0%, #F09D51 100%);
  color: rgb(255, 255, 255);
  border-color: transparent;
}

.action-btn.primary:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(240, 101, 67, 0.4);
}

.action-btn.priority-low {
  border-color: #10b981;
}

.action-btn.priority-low:hover:not(:disabled) {
  border-color: #10b981;
  background: #f0fdf4;
}

.action-btn.priority-medium {
  border-color: #F09D51;
}

.action-btn.priority-medium:hover:not(:disabled) {
  border-color: #F09D51;
  background: #fffbeb;
}

.action-btn.priority-high {
  border-color: #F06543;
}

.action-btn.priority-high:hover:not(:disabled) {
  border-color: #F06543;
  background: #fff7ed;
}

.action-btn.priority-urgent {
  border-color: #ef4444;
}

.action-btn.priority-urgent:hover:not(:disabled) {
  border-color: #ef4444;
  background: #fef2f2;
}

.chat-input {
  display: flex;
  gap: 0.75rem;
  padding: 1rem;
  background: white;
  border-top: 1px solid #e5e7eb;
}

.chat-input input {
  flex: 1;
  padding: 0.75rem 1rem;
  border: 1px solid #e5e7eb;
  border-radius: 24px;
  font-size: 0.9rem;
  transition: border-color 0.2s;
}

.chat-input input:focus {
  outline: none;
  border-color: #F06543;
}

.chat-input input:disabled {
  background: #f9fafb;
  cursor: not-allowed;
}

.send-button {
  width: 44px;
  height: 44px;
  background: linear-gradient(135deg, #F06543 0%, #F09D51 100%);
  border: none;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s;
}

.send-button:hover:not(:disabled) {
  transform: scale(1.05);
  box-shadow: 0 4px 12px rgba(240, 101, 67, 0.4);
}

.send-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.send-button .icon {
  width: 20px;
  height: 20px;
  color: white;
  transform: rotate(45deg);
}

.slide-up-enter-active,
.slide-up-leave-active {
  transition: all 0.3s ease;
}

.slide-up-enter-from {
  opacity: 0;
  transform: translateY(20px) scale(0.95);
}

.slide-up-leave-to {
  opacity: 0;
  transform: translateY(20px) scale(0.95);
}

@media (max-width: 640px) {
  .chatbot-container {
    bottom: 1rem;
    right: 1rem;
  }

  .chat-button {
    width: 56px;
    height: 56px;
  }

  .chat-window {
    width: calc(100vw - 2rem);
    height: calc(100vh - 2rem);
    max-height: 600px;
  }
}
</style>
