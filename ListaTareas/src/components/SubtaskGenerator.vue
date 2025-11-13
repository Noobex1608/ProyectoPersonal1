<template>
  <div class="subtask-generator">
    <div class="header">
      <h3>Generador de Subtareas</h3>
    </div>

    <div class="input-section">
      <input
        v-model="taskTitle"
        type="text"
        placeholder="Título de la tarea (ej: Preparar presentación)"
        class="task-input"
        @keyup.enter="generateSubtasks"
      />
      <textarea
        v-model="taskDescription"
        placeholder="Descripción opcional para más contexto"
        class="task-textarea"
        rows="3"
      ></textarea>
      <button @click="generateSubtasks" :disabled="!taskTitle || isGenerating" class="generate-btn">
        <svg v-if="!isGenerating" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
        <span v-else class="spinner"></span>
        {{ isGenerating ? 'Generando...' : 'Generar Subtareas' }}
      </button>
    </div>

    <div v-if="error" class="error-message">
      <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      {{ error }}
    </div>

    <div v-if="subtasks.length > 0" class="subtasks-list">
      <div class="list-header">
        <h4>Subtareas generadas ({{ subtasks.length }})</h4>
        <button @click="clear" class="clear-btn">
          <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
          Limpiar
        </button>
      </div>

      <div class="subtasks-container">
        <div v-for="subtask in subtasks" :key="subtask.order" class="subtask-card">
          <div class="subtask-header">
            <span class="subtask-number">{{ subtask.order }}</span>
            <h5>{{ subtask.title }}</h5>
          </div>
          <p class="subtask-description">{{ subtask.description }}</p>
          <div class="subtask-time">
            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{{ subtask.estimatedTime }}</span>
          </div>
        </div>
      </div>
    </div>

    <div v-else-if="!isGenerating" class="empty-state">
      <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
      </svg>
      <p>Describe una tarea compleja y la IA la dividirá en pasos accionables</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useSmartSubtasks } from '../composables/useSmartSubtasks'

const { subtasks, isGenerating, error, generate, clear } = useSmartSubtasks()

const taskTitle = ref('')
const taskDescription = ref('')

const generateSubtasks = async () => {
  if (!taskTitle.value) return
  await generate(taskTitle.value, taskDescription.value || undefined)
}
</script>

<style scoped>
.subtask-generator {
  width: 100%;
}

.header {
  margin-bottom: 1.5rem;
}

.header h3 {
  margin: 0;
  color: #313638;
  font-size: 1.25rem;
  font-weight: 600;
}

.input-section {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.task-input {
  width: 100%;
  padding: 0.75rem 1rem;
  border: 2px solid #e9ecef;
  border-radius: 8px;
  font-size: 1rem;
  transition: all 0.3s ease;
}

.task-input:focus {
  outline: none;
  border-color: #F06543;
  box-shadow: 0 0 0 3px rgba(240, 101, 67, 0.1);
}

.task-textarea {
  width: 100%;
  padding: 0.75rem 1rem;
  border: 2px solid #e9ecef;
  border-radius: 8px;
  font-size: 0.875rem;
  font-family: inherit;
  resize: vertical;
  transition: all 0.3s ease;
}

.task-textarea:focus {
  outline: none;
  border-color: #F06543;
  box-shadow: 0 0 0 3px rgba(240, 101, 67, 0.1);
}

.generate-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
  color: white;
  border: none;
  padding: 0.75rem 1.5rem;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
}

.generate-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 5px 15px rgba(245, 87, 108, 0.3);
}

.generate-btn:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.generate-btn svg {
  width: 20px;
  height: 20px;
}

.spinner {
  width: 16px;
  height: 16px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: white;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.error-message {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 1rem;
  background: #fee;
  border: 1px solid #fcc;
  border-radius: 8px;
  color: #c33;
  margin-bottom: 1.5rem;
}

.error-message svg {
  width: 20px;
  height: 20px;
  flex-shrink: 0;
}

.subtasks-list {
  margin-top: 1.5rem;
}

.list-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.list-header h4 {
  margin: 0;
  color: #313638;
  font-size: 1rem;
  font-weight: 600;
}

.clear-btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: transparent;
  color: #6c757d;
  border: 1px solid #dee2e6;
  padding: 0.5rem 1rem;
  border-radius: 6px;
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 0.3s ease;
}

.clear-btn:hover {
  background: #f8f9fa;
  color: #495057;
}

.clear-btn svg {
  width: 16px;
  height: 16px;
}

.subtasks-container {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.subtask-card {
  background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
  border-radius: 12px;
  padding: 1.25rem;
  border-left: 4px solid #f093fb;
  transition: all 0.3s ease;
}

.subtask-card:hover {
  transform: translateX(5px);
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.1);
}

.subtask-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 0.75rem;
}

.subtask-number {
  width: 28px;
  height: 28px;
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
  color: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: 0.875rem;
  flex-shrink: 0;
}

.subtask-header h5 {
  margin: 0;
  color: #313638;
  font-size: 1rem;
  font-weight: 600;
}

.subtask-description {
  margin: 0 0 0.75rem;
  color: #495057;
  line-height: 1.6;
  font-size: 0.875rem;
  padding-left: 2.5rem;
}

.subtask-time {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: #6c757d;
  font-size: 0.875rem;
  padding-left: 2.5rem;
}

.subtask-time svg {
  width: 16px;
  height: 16px;
}

.empty-state {
  text-align: center;
  padding: 3rem 1rem;
  color: #6c757d;
}

.empty-state svg {
  width: 64px;
  height: 64px;
  margin: 0 auto 1rem;
  color: #dee2e6;
}

.empty-state p {
  margin: 0;
  font-size: 1rem;
}
</style>
