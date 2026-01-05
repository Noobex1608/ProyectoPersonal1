<template>
  <div class="concept-explanation-view">
    <div class="page-header">
      <button @click="goBack" class="back-button">
        <ArrowLeftIcon class="icon" />
        Volver
      </button>
      <h1 class="page-title">Explicación de Conceptos</h1>
    </div>

    <div class="content-container">
      <!-- Selección de tarea si no hay taskId en la ruta -->
      <div v-if="!selectedTask" class="task-selector-section">
        <div class="selector-card">
          <BookOpenIcon class="selector-icon" />
          <h2>Selecciona una tarea para estudiar</h2>
          <p class="selector-description">
            Elige la tarea sobre la que necesitas una explicación detallada del concepto
          </p>
          <select 
            v-model="taskId" 
            @change="loadTask"
            class="task-select"
          >
            <option value="">Elige una tarea...</option>
            <option 
              v-for="task in availableTasks" 
              :key="task.id" 
              :value="task.id"
            >
              {{ task.title }}
            </option>
          </select>
        </div>
      </div>

      <!-- Tarea seleccionada y contenido -->
      <div v-else class="main-content">
        <!-- Card de tarea -->
        <div class="task-card">
          <div class="task-card-header">
            <div class="task-icon">📚</div>
            <div class="task-info">
              <h2 class="task-title">{{ selectedTask.title }}</h2>
              <p v-if="selectedTask.description" class="task-description">
                {{ selectedTask.description }}
              </p>
            </div>
            <button @click="clearTask" class="change-task-button">
              <ArrowPathIcon class="icon" />
              Cambiar tarea
            </button>
          </div>
        </div>

        <!-- Área de explicación -->
        <div class="explanation-section">
          <div v-if="loading" class="loading-state">
            <div class="spinner"></div>
            <p>El tutor está preparando la explicación...</p>
          </div>

          <div v-else-if="error" class="error-state">
            <ExclamationTriangleIcon class="error-icon" />
            <h3>Error al obtener explicación</h3>
            <p>{{ error }}</p>
            <button @click="requestExplanation" class="retry-button">
              <ArrowPathIcon class="icon" />
              Intentar de nuevo
            </button>
          </div>

          <div v-else-if="explanation" class="explanation-content">
            <div class="explanation-header">
              <LightBulbIcon class="header-icon" />
              <h3>Explicación del Concepto</h3>
            </div>
            <div class="explanation-body">
              <p v-html="formatExplanation(explanation)"></p>
            </div>
            <div class="explanation-actions">
              <button @click="requestExplanation" class="action-button secondary">
                <ArrowPathIcon class="icon" />
                Generar nueva explicación
              </button>
              <button @click="copyToClipboard" class="action-button secondary">
                <DocumentDuplicateIcon class="icon" />
                Copiar al portapapeles
              </button>
            </div>
          </div>

          <div v-else class="empty-state">
            <LightBulbIcon class="empty-icon" />
            <h3>¡Comencemos!</h3>
            <p>Solicita una explicación detallada del concepto relacionado con esta tarea</p>
            <button @click="requestExplanation" class="request-button">
              <SparklesIcon class="icon" />
              Obtener explicación
            </button>
          </div>
        </div>

        <!-- Sección de acciones rápidas -->
        <div v-if="explanation" class="quick-actions">
          <h4>¿Qué más puedo hacer?</h4>
          <div class="actions-grid">
            <router-link to="/todos" class="quick-action-card">
              <CheckCircleIcon class="action-icon" />
              <span>Ver todas las tareas</span>
            </router-link>
            <button @click="goBack" class="quick-action-card">
              <AcademicCapIcon class="action-icon" />
              <span>Volver al tutor</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAITutor } from '@/composables/useAITutor';
import { useTodosStore } from '@/stores/todos';
import { useToast } from '@/composables/useToast';
import {
  ArrowLeftIcon,
  BookOpenIcon,
  LightBulbIcon,
  ArrowPathIcon,
  ExclamationTriangleIcon,
  SparklesIcon,
  CheckCircleIcon,
  AcademicCapIcon,
  DocumentDuplicateIcon
} from '@heroicons/vue/24/outline';

const route = useRoute();
const router = useRouter();
const todosStore = useTodosStore();
const { explainConcept, loading, error } = useAITutor();
const { success: showSuccess, error: showError } = useToast();

const taskId = ref('');
const selectedTask = ref<any>(null);
const explanation = ref('');

const availableTasks = computed(() => {
  return todosStore.todos.filter(todo => 
    todo.status === 'pending' || todo.status === 'in_progress'
  );
});

onMounted(async () => {
  await todosStore.fetchTodos();
  
  // Si viene un taskId en la query, cargar la tarea
  if (route.query.taskId) {
    taskId.value = route.query.taskId as string;
    loadTask();
    await requestExplanation();
  }
});

function loadTask() {
  if (taskId.value) {
    selectedTask.value = todosStore.todos.find(t => t.id === taskId.value);
  }
}

function clearTask() {
  taskId.value = '';
  selectedTask.value = null;
  explanation.value = '';
  router.replace({ query: {} });
}

async function requestExplanation() {
  if (!taskId.value) return;
  
  explanation.value = '';
  const response = await explainConcept(taskId.value);
  
  if (response?.success && response.content?.explanation) {
    explanation.value = response.content.explanation;
  }
}

function formatExplanation(text: string) {
  // Convertir saltos de línea en párrafos
  return text
    .split('\n\n')
    .map(paragraph => `<p>${paragraph.replace(/\n/g, '<br>')}</p>`)
    .join('');
}

function copyToClipboard() {
  if (!explanation.value) return;
  
  navigator.clipboard.writeText(explanation.value)
    .then(() => {
      showSuccess('Explicación copiada al portapapeles');
    })
    .catch(() => {
      showError('Error al copiar al portapapeles');
    });
}

function goBack() {
  router.back();
}
</script>

<style scoped>
.concept-explanation-view {
  min-height: 100vh;
  background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
  padding: 20px;
}

.page-header {
  max-width: 1200px;
  margin: 0 auto 30px;
  display: flex;
  align-items: center;
  gap: 20px;
}

.back-button {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 20px;
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  color: #374151;
  transition: all 0.2s;
}

.back-button:hover {
  background: #f9fafb;
  border-color: #06b6d4;
  color: #06b6d4;
}

.back-button .icon {
  width: 20px;
  height: 20px;
}

.page-title {
  font-size: 32px;
  font-weight: 700;
  color: #0891b2;
  margin: 0;
}

.content-container {
  max-width: 1200px;
  margin: 0 auto;
}

/* Task Selector Section */
.task-selector-section {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 500px;
}

.selector-card {
  background: white;
  border-radius: 20px;
  padding: 60px;
  text-align: center;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.1);
  max-width: 500px;
  width: 100%;
}

.selector-icon {
  width: 64px;
  height: 64px;
  color: #06b6d4;
  margin: 0 auto 20px;
}

.selector-card h2 {
  font-size: 24px;
  font-weight: 700;
  color: #111827;
  margin: 0 0 12px;
}

.selector-description {
  font-size: 16px;
  color: #6b7280;
  margin: 0 0 30px;
  line-height: 1.6;
}

.task-select {
  width: 100%;
  padding: 14px 18px;
  font-size: 15px;
  border: 2px solid #e5e7eb;
  border-radius: 12px;
  background: white;
  cursor: pointer;
  transition: border-color 0.2s;
}

.task-select:focus {
  outline: none;
  border-color: #06b6d4;
}

/* Main Content */
.main-content {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.task-card {
  background: white;
  border-radius: 16px;
  padding: 24px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
}

.task-card-header {
  display: flex;
  gap: 20px;
  align-items: flex-start;
}

.task-icon {
  font-size: 48px;
  flex-shrink: 0;
}

.task-info {
  flex: 1;
}

.task-title {
  font-size: 24px;
  font-weight: 700;
  color: #111827;
  margin: 0 0 8px;
}

.task-description {
  font-size: 15px;
  color: #6b7280;
  margin: 0;
  line-height: 1.6;
}

.change-task-button {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  background: #f3f4f6;
  border: none;
  border-radius: 10px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  color: #374151;
  transition: background 0.2s;
}

.change-task-button:hover {
  background: #e5e7eb;
}

.change-task-button .icon {
  width: 18px;
  height: 18px;
}

/* Explanation Section */
.explanation-section {
  background: white;
  border-radius: 16px;
  padding: 40px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
  min-height: 400px;
}

/* Loading State */
.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 400px;
  gap: 20px;
}

.spinner {
  width: 50px;
  height: 50px;
  border: 4px solid #e5e7eb;
  border-top-color: #06b6d4;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.loading-state p {
  font-size: 16px;
  color: #6b7280;
  margin: 0;
}

/* Error State */
.error-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 400px;
  gap: 16px;
  text-align: center;
}

.error-icon {
  width: 64px;
  height: 64px;
  color: #ef4444;
}

.error-state h3 {
  font-size: 20px;
  font-weight: 600;
  color: #111827;
  margin: 0;
}

.error-state p {
  font-size: 15px;
  color: #6b7280;
  margin: 0;
  max-width: 500px;
}

.retry-button {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 24px;
  background: #06b6d4;
  border: none;
  border-radius: 12px;
  color: white;
  font-size: 15px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.2s;
}

.retry-button:hover {
  background: #0891b2;
}

.retry-button .icon {
  width: 20px;
  height: 20px;
}

/* Explanation Content */
.explanation-content {
  display: flex;
  flex-direction: column;
  gap: 30px;
}

.explanation-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding-bottom: 20px;
  border-bottom: 2px solid #e5e7eb;
}

.header-icon {
  width: 32px;
  height: 32px;
  color: #06b6d4;
}

.explanation-header h3 {
  font-size: 22px;
  font-weight: 700;
  color: #111827;
  margin: 0;
}

.explanation-body {
  font-size: 16px;
  line-height: 1.8;
  color: #374151;
}

.explanation-body :deep(p) {
  margin: 0 0 16px;
}

.explanation-body :deep(p:last-child) {
  margin: 0;
}

.explanation-actions {
  display: flex;
  gap: 12px;
  padding-top: 20px;
  border-top: 2px solid #e5e7eb;
}

.action-button {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 20px;
  border: none;
  border-radius: 12px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.action-button.secondary {
  background: #f3f4f6;
  color: #374151;
}

.action-button.secondary:hover {
  background: #e5e7eb;
}

.action-button .icon {
  width: 18px;
  height: 18px;
}

/* Empty State */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 400px;
  gap: 20px;
  text-align: center;
}

.empty-icon {
  width: 80px;
  height: 80px;
  color: #06b6d4;
}

.empty-state h3 {
  font-size: 24px;
  font-weight: 700;
  color: #111827;
  margin: 0;
}

.empty-state p {
  font-size: 16px;
  color: #6b7280;
  margin: 0;
  max-width: 500px;
}

.request-button {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 16px 32px;
  background: linear-gradient(135deg, #06b6d4 0%, #0891b2 100%);
  border: none;
  border-radius: 14px;
  color: white;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  box-shadow: 0 4px 20px rgba(6, 182, 212, 0.3);
  transition: transform 0.2s, box-shadow 0.2s;
}

.request-button:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 25px rgba(6, 182, 212, 0.4);
}

.request-button .icon {
  width: 22px;
  height: 22px;
}

/* Quick Actions */
.quick-actions {
  background: white;
  border-radius: 16px;
  padding: 30px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
}

.quick-actions h4 {
  font-size: 18px;
  font-weight: 600;
  color: #111827;
  margin: 0 0 20px;
}

.actions-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
}

.quick-action-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px 20px;
  background: #f9fafb;
  border: 2px solid #e5e7eb;
  border-radius: 12px;
  text-decoration: none;
  color: #374151;
  font-size: 15px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.quick-action-card:hover {
  background: #f3f4f6;
  border-color: #06b6d4;
  color: #06b6d4;
}

.action-icon {
  width: 24px;
  height: 24px;
}

/* Responsive */
@media (max-width: 768px) {
  .concept-explanation-view {
    padding: 16px;
  }

  .page-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }

  .page-title {
    font-size: 24px;
  }

  .selector-card {
    padding: 40px 30px;
  }

  .explanation-section {
    padding: 24px;
  }

  .task-card-header {
    flex-direction: column;
  }

  .actions-grid {
    grid-template-columns: 1fr;
  }
}
</style>
