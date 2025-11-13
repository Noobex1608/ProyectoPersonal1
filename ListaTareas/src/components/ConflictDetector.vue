<template>
  <div class="conflict-detector">
    <div class="header">
      <h3>Detector de Conflictos</h3>
      <button @click="detectConflicts" :disabled="isDetecting" class="detect-btn">
        <svg v-if="!isDetecting" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <span v-else class="spinner"></span>
        {{ isDetecting ? 'Detectando...' : 'Detectar' }}
      </button>
    </div>

    <div v-if="error" class="error-message">
      <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      {{ error }}
    </div>

    <div v-if="conflicts.length > 0" class="conflicts-list">
      <div class="conflicts-header">
        <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
        <h4>{{ conflicts.length }} conflicto{{ conflicts.length > 1 ? 's' : '' }} detectado{{ conflicts.length > 1 ? 's' : '' }}</h4>
      </div>

      <div class="conflicts-container">
        <div v-for="(conflict, index) in conflicts" :key="index" class="conflict-card">
          <div class="conflict-header">
            <div class="date-badge">
              <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              {{ formatDate(conflict.date) }}
            </div>
            <span class="task-count">{{ conflict.tasks.length }} tareas</span>
          </div>

          <div class="tasks-list">
            <div 
              v-for="task in conflict.tasks" 
              :key="task.id" 
              class="task-item"
              :class="getPriorityClass(task.priority)"
            >
              <span class="priority-dot"></span>
              <span class="task-title">{{ task.title }}</span>
              <span class="priority-label">{{ getPriorityLabel(task.priority) }}</span>
            </div>
          </div>

          <div class="conflict-reason">
            <h5>⚠️ Motivo del conflicto</h5>
            <p>{{ conflict.reason }}</p>
          </div>

          <div class="conflict-suggestion">
            <h5>💡 Sugerencia</h5>
            <p>{{ conflict.suggestion }}</p>
          </div>
        </div>
      </div>
    </div>

    <div v-else-if="!isDetecting && hasRun" class="no-conflicts">
      <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <h4>¡Todo bien!</h4>
      <p>No se detectaron conflictos de tiempo en tus tareas</p>
    </div>

    <div v-else-if="!isDetecting" class="empty-state">
      <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <p>Analiza tus tareas para detectar días sobrecargados o conflictos</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useTimeConflictDetector } from '../composables/useTimeConflictDetector'

const { conflicts, isDetecting, error, detect } = useTimeConflictDetector()
const hasRun = ref(false)

const detectConflicts = async () => {
  await detect()
  hasRun.value = true
}

const formatDate = (dateString: string) => {
  const date = new Date(dateString)
  return date.toLocaleDateString('es-ES', { 
    weekday: 'long',
    day: 'numeric',
    month: 'long'
  })
}

const getPriorityClass = (priority: string) => {
  return `priority-${priority}`
}

const getPriorityLabel = (priority: string) => {
  const labels: Record<string, string> = {
    urgent: 'Urgente',
    high: 'Alta',
    medium: 'Media',
    low: 'Baja'
  }
  return labels[priority] || priority
}
</script>

<style scoped>
.conflict-detector {
  width: 100%;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
}

.header h3 {
  margin: 0;
  color: #313638;
  font-size: 1.25rem;
  font-weight: 600;
}

.detect-btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: linear-gradient(135deg, #fa709a 0%, #fee140 100%);
  color: white;
  border: none;
  padding: 0.75rem 1.5rem;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
}

.detect-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 5px 15px rgba(250, 112, 154, 0.3);
}

.detect-btn:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.detect-btn svg {
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

.conflicts-list {
  width: 100%;
}

.conflicts-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 1.5rem;
  padding: 1rem;
  background: linear-gradient(135deg, #ffe8e8 0%, #fff5e8 100%);
  border-radius: 12px;
  border-left: 4px solid #fa709a;
}

.conflicts-header svg {
  width: 24px;
  height: 24px;
  color: #fa709a;
  flex-shrink: 0;
}

.conflicts-header h4 {
  margin: 0;
  color: #313638;
  font-size: 1rem;
  font-weight: 600;
}

.conflicts-container {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.conflict-card {
  background: #f8f9fa;
  border-radius: 12px;
  padding: 1.5rem;
  border: 2px solid #fa709a;
}

.conflict-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.date-badge {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: linear-gradient(135deg, #fa709a 0%, #fee140 100%);
  color: white;
  padding: 0.5rem 1rem;
  border-radius: 50px;
  font-weight: 600;
  font-size: 0.875rem;
}

.date-badge svg {
  width: 16px;
  height: 16px;
}

.task-count {
  background: white;
  color: #6c757d;
  padding: 0.5rem 1rem;
  border-radius: 50px;
  font-size: 0.875rem;
  font-weight: 600;
}

.tasks-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  margin-bottom: 1.25rem;
}

.task-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  background: white;
  padding: 0.75rem 1rem;
  border-radius: 8px;
  border-left: 4px solid;
}

.task-item.priority-urgent {
  border-left-color: #e74c3c;
}

.task-item.priority-high {
  border-left-color: #F06543;
}

.task-item.priority-medium {
  border-left-color: #3498db;
}

.task-item.priority-low {
  border-left-color: #95a5a6;
}

.priority-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}

.priority-urgent .priority-dot {
  background: #e74c3c;
}

.priority-high .priority-dot {
  background: #F06543;
}

.priority-medium .priority-dot {
  background: #3498db;
}

.priority-low .priority-dot {
  background: #95a5a6;
}

.task-title {
  flex: 1;
  color: #313638;
  font-weight: 500;
}

.priority-label {
  color: #6c757d;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  padding: 0.25rem 0.5rem;
  background: #e9ecef;
  border-radius: 4px;
}

.conflict-reason,
.conflict-suggestion {
  margin-top: 1rem;
}

.conflict-reason h5,
.conflict-suggestion h5 {
  margin: 0 0 0.5rem;
  color: #313638;
  font-size: 0.875rem;
  font-weight: 600;
}

.conflict-reason p,
.conflict-suggestion p {
  margin: 0;
  color: #495057;
  line-height: 1.6;
  font-size: 0.875rem;
}

.conflict-reason {
  padding: 1rem;
  background: rgba(250, 112, 154, 0.1);
  border-radius: 8px;
}

.conflict-suggestion {
  padding: 1rem;
  background: rgba(79, 172, 254, 0.1);
  border-radius: 8px;
}

.no-conflicts {
  text-align: center;
  padding: 3rem 1rem;
  background: linear-gradient(135deg, #e8f8f5 0%, #d5f4e6 100%);
  border-radius: 16px;
  border: 2px solid #38ef7d;
}

.no-conflicts svg {
  width: 64px;
  height: 64px;
  margin: 0 auto 1rem;
  color: #38ef7d;
}

.no-conflicts h4 {
  margin: 0 0 0.5rem;
  color: #313638;
  font-size: 1.5rem;
  font-weight: 700;
}

.no-conflicts p {
  margin: 0;
  color: #495057;
  font-size: 1rem;
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
