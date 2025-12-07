<template>
  <div class="tutor-container">
    <!-- Botón flotante para abrir/cerrar -->
    <button 
      v-if="!isOpen" 
      @click="togglePanel" 
      class="tutor-button"
      aria-label="Abrir tutor IA"
    >
      <AcademicCapIcon class="icon" />
    </button>

    <!-- Panel del tutor -->
    <transition name="slide-up">
      <div v-if="isOpen" class="tutor-panel">
        <!-- Header -->
        <div class="tutor-header">
          <div class="header-content">
            <div class="tutor-avatar">🎓</div>
            <div>
              <h3>Tutor con IA</h3>
              <p class="status">
                <span class="status-dot"></span>
                {{ loading ? 'Pensando...' : 'Listo para ayudar' }}
              </p>
            </div>
          </div>
          <button @click="togglePanel" class="close-button">
            <XMarkIcon class="icon" />
          </button>
        </div>

        <!-- Selección de tarea -->
        <div class="task-selector" v-if="!selectedTask">
          <label class="selector-label">
            <BookOpenIcon class="label-icon" />
            Selecciona una tarea para estudiar
          </label>
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

        <!-- Tarea seleccionada -->
        <div v-if="selectedTask" class="selected-task">
          <div class="task-header">
            <h4 class="task-title">{{ selectedTask.title }}</h4>
            <button @click="clearTask" class="change-task-btn">
              <ArrowPathIcon class="icon-sm" />
              Cambiar
            </button>
          </div>
          <p v-if="selectedTask.description" class="task-description">
            {{ selectedTask.description }}
          </p>
        </div>

        <!-- Botones de acción -->
        <div v-if="selectedTask" class="action-grid">
          <button 
            @click="requestExplanation" 
            :disabled="loading"
            class="action-card"
          >
            <LightBulbIcon class="card-icon" />
            <span class="card-title">Explicar concepto</span>
            <span class="card-desc">Entender mejor el tema</span>
          </button>

          <button 
            @click="requestStudyTips" 
            :disabled="loading"
            class="action-card"
          >
            <SparklesIcon class="card-icon" />
            <span class="card-title">Tips de estudio</span>
            <span class="card-desc">Estrategias personalizadas</span>
          </button>

          <button 
            @click="requestResources" 
            :disabled="loading"
            class="action-card"
          >
            <GlobeAltIcon class="card-icon" />
            <span class="card-title">Recursos</span>
            <span class="card-desc">Videos, artículos, cursos</span>
          </button>

          <button 
            @click="requestFlashcards" 
            :disabled="loading"
            class="action-card"
          >
            <RectangleStackIcon class="card-icon" />
            <span class="card-title">Flashcards</span>
            <span class="card-desc">Tarjetas de memorización</span>
          </button>

          <button 
            @click="requestStudyTechniques" 
            :disabled="loading"
            class="action-card"
          >
            <ClockIcon class="card-icon" />
            <span class="card-title">Técnicas</span>
            <span class="card-desc">Pomodoro, active recall...</span>
          </button>

          <button 
            @click="toggleAudio" 
            :disabled="loading"
            class="action-card"
            :class="{ 'active': audioEnabled }"
          >
            <SpeakerWaveIcon v-if="audioEnabled" class="card-icon" />
            <SpeakerXMarkIcon v-else class="card-icon" />
            <span class="card-title">{{ audioEnabled ? 'Audio ON' : 'Audio OFF' }}</span>
            <span class="card-desc">Síntesis de voz</span>
          </button>
        </div>

        <!-- Área de contenido -->
        <div v-if="currentContent" class="content-area">
          <div class="content-header">
            <component :is="getActionIcon(currentAction)" class="content-icon" />
            <h4>{{ getActionTitle(currentAction) }}</h4>
          </div>

          <!-- Explicación -->
          <div v-if="currentAction === 'explain'" class="content-body">
            <p class="explanation-text">{{ currentContent.explanation }}</p>
            <button 
              v-if="audioEnabled && currentContent.explanation" 
              @click="speakText(currentContent.explanation)"
              :disabled="loading"
              class="audio-btn"
            >
              <SpeakerWaveIcon class="icon-sm" />
              Escuchar explicación
            </button>
          </div>

          <!-- Tips de estudio -->
          <div v-else-if="currentAction === 'tips'" class="content-body">
            <ul class="tips-list">
              <li v-for="(tip, index) in currentContent.tips" :key="index" class="tip-item">
                <CheckCircleIcon class="tip-icon" />
                <span>{{ tip }}</span>
              </li>
            </ul>
          </div>

          <!-- Recursos -->
          <div v-else-if="currentAction === 'resources'" class="content-body">
            <div 
              v-for="(resource, index) in currentContent.resources" 
              :key="index" 
              class="resource-card"
            >
              <div class="resource-header">
                <component :is="getResourceIcon(resource.type)" class="resource-icon" />
                <div class="resource-info">
                  <h5 class="resource-title">{{ resource.title }}</h5>
                  <span class="resource-type">{{ resource.type }}</span>
                </div>
              </div>
              <p class="resource-description">{{ resource.description }}</p>
              <a 
                :href="resource.url" 
                target="_blank" 
                rel="noopener noreferrer"
                class="resource-link"
              >
                <ArrowTopRightOnSquareIcon class="icon-sm" />
                Abrir recurso
              </a>
            </div>
          </div>

          <!-- Flashcards -->
          <div v-else-if="currentAction === 'flashcards'" class="content-body">
            <div class="flashcard-container">
              <div 
                v-for="(card, index) in currentContent.flashcards" 
                :key="index"
                class="flashcard"
                :class="{ 'flipped': flippedCards.includes(index) }"
                @click="toggleCard(index)"
              >
                <div class="flashcard-inner">
                  <div class="flashcard-front">
                    <div class="card-label">Pregunta {{ index + 1 }}</div>
                    <p class="card-text">{{ card.front }}</p>
                    <div class="card-hint">👆 Toca para ver respuesta</div>
                  </div>
                  <div class="flashcard-back">
                    <div class="card-label">Respuesta {{ index + 1 }}</div>
                    <p class="card-text">{{ card.back }}</p>
                    <div 
                      class="difficulty-badge"
                      :class="`difficulty-${card.difficulty}`"
                    >
                      {{ card.difficulty }}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Técnicas de estudio -->
          <div v-else-if="currentAction === 'study_techniques'" class="content-body">
            <div class="study-plan">
              <h5 class="plan-title">{{ currentContent.study_plan.technique }}</h5>
              <p class="plan-description">{{ currentContent.study_plan.description }}</p>
              <div class="plan-duration">
                <ClockIcon class="icon-sm" />
                {{ currentContent.study_plan.duration }}
              </div>
              <ol class="plan-steps">
                <li 
                  v-for="(step, index) in currentContent.study_plan.steps" 
                  :key="index"
                  class="plan-step"
                >
                  <span class="step-number">{{ index + 1 }}</span>
                  <span class="step-text">{{ step }}</span>
                </li>
              </ol>
            </div>
          </div>

          <!-- Botón cerrar contenido -->
          <button @click="clearContent" class="close-content-btn">
            <XMarkIcon class="icon-sm" />
            Cerrar
          </button>
        </div>

        <!-- Error message -->
        <div v-if="error" class="error-message">
          <ExclamationTriangleIcon class="error-icon" />
          <p>{{ error }}</p>
        </div>
      </div>
    </transition>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useAITutor } from '@/composables/useAITutor';
import { useTodosStore } from '@/stores/todos';
import {
  AcademicCapIcon,
  XMarkIcon,
  BookOpenIcon,
  LightBulbIcon,
  SparklesIcon,
  GlobeAltIcon,
  RectangleStackIcon,
  ClockIcon,
  SpeakerWaveIcon,
  SpeakerXMarkIcon,
  CheckCircleIcon,
  ArrowTopRightOnSquareIcon,
  ArrowPathIcon,
  ExclamationTriangleIcon,
  PlayCircleIcon,
  DocumentTextIcon,
  AcademicCapIcon as CourseIcon
} from '@heroicons/vue/24/outline';

const todosStore = useTodosStore();
const { 
  explainConcept, 
  getStudyTips, 
  getResources, 
  generateFlashcards,
  getStudyTechniques,
  generateAudio,
  playAudio,
  loading, 
  error 
} = useAITutor();

const isOpen = ref(false);
const taskId = ref('');
const selectedTask = ref<any>(null);
const currentAction = ref<string>('');
const currentContent = ref<any>(null);
const audioEnabled = ref(false);
const flippedCards = ref<number[]>([]);

const availableTasks = computed(() => {
  return todosStore.todos.filter(todo => 
    todo.status === 'pending' || todo.status === 'in_progress'
  );
});

onMounted(() => {
  todosStore.fetchTodos();
});

function togglePanel() {
  isOpen.value = !isOpen.value;
  if (!isOpen.value) {
    clearContent();
  }
}

function loadTask() {
  if (taskId.value) {
    selectedTask.value = todosStore.todos.find(t => t.id === taskId.value);
  }
}

function clearTask() {
  taskId.value = '';
  selectedTask.value = null;
  clearContent();
}

function clearContent() {
  currentAction.value = '';
  currentContent.value = null;
  flippedCards.value = [];
}

async function requestExplanation() {
  if (!taskId.value) return;
  
  currentAction.value = 'explain';
  const response = await explainConcept(taskId.value);
  
  if (response?.success) {
    currentContent.value = response.content;
  }
}

async function requestStudyTips() {
  if (!taskId.value) return;
  
  currentAction.value = 'tips';
  const response = await getStudyTips(taskId.value);
  
  if (response?.success) {
    currentContent.value = response.content;
  }
}

async function requestResources() {
  if (!taskId.value) return;
  
  currentAction.value = 'resources';
  const response = await getResources(taskId.value);
  
  if (response?.success) {
    currentContent.value = response.content;
  }
}

async function requestFlashcards() {
  if (!taskId.value) return;
  
  currentAction.value = 'flashcards';
  const response = await generateFlashcards(taskId.value);
  
  if (response?.success) {
    currentContent.value = response.content;
    flippedCards.value = [];
  }
}

async function requestStudyTechniques() {
  if (!taskId.value) return;
  
  currentAction.value = 'study_techniques';
  const response = await getStudyTechniques(taskId.value);
  
  if (response?.success) {
    currentContent.value = response.content;
  }
}

function toggleAudio() {
  audioEnabled.value = !audioEnabled.value;
}

async function speakText(text: string) {
  if (!taskId.value) return;
  
  const response = await generateAudio(taskId.value, text);
  
  if (response?.success && response.content?.audio_url) {
    playAudio(response.content.audio_url);
  }
}

function toggleCard(index: number) {
  const cardIndex = flippedCards.value.indexOf(index);
  if (cardIndex > -1) {
    flippedCards.value.splice(cardIndex, 1);
  } else {
    flippedCards.value.push(index);
  }
}

function getActionIcon(action: string) {
  const icons: Record<string, any> = {
    explain: LightBulbIcon,
    tips: SparklesIcon,
    resources: GlobeAltIcon,
    flashcards: RectangleStackIcon,
    study_techniques: ClockIcon
  };
  return icons[action] || BookOpenIcon;
}

function getActionTitle(action: string) {
  const titles: Record<string, string> = {
    explain: 'Explicación del concepto',
    tips: 'Tips de estudio',
    resources: 'Recursos recomendados',
    flashcards: 'Flashcards para memorizar',
    study_techniques: 'Técnicas de estudio'
  };
  return titles[action] || 'Contenido';
}

function getResourceIcon(type: string) {
  const icons: Record<string, any> = {
    video: PlayCircleIcon,
    article: DocumentTextIcon,
    course: CourseIcon,
    tool: GlobeAltIcon
  };
  return icons[type] || DocumentTextIcon;
}
</script>

<style scoped>
.tutor-container {
  position: fixed;
  bottom: 100px;
  right: 20px;
  z-index: 1000;
}

/* Botón flotante */
.tutor-button {
  width: 60px;
  height: 60px;
  border-radius: 50%;
  background: linear-gradient(135deg, #06b6d4 0%, #0891b2 100%);
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 20px rgba(6, 182, 212, 0.4);
  transition: transform 0.3s ease, box-shadow 0.3s ease;
}

.tutor-button:hover {
  transform: scale(1.1);
  box-shadow: 0 6px 25px rgba(6, 182, 212, 0.6);
}

.tutor-button .icon {
  width: 28px;
  height: 28px;
  color: white;
}

/* Panel del tutor */
.tutor-panel {
  width: 450px;
  max-height: 700px;
  background: white;
  border-radius: 16px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* Header */
.tutor-header {
  padding: 20px;
  background: linear-gradient(135deg, #06b6d4 0%, #0891b2 100%);
  color: white;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-content {
  display: flex;
  gap: 12px;
  align-items: center;
}

.tutor-avatar {
  font-size: 32px;
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 50%;
}

.tutor-header h3 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
}

.status {
  margin: 4px 0 0;
  font-size: 12px;
  opacity: 0.9;
  display: flex;
  align-items: center;
  gap: 6px;
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #4ade80;
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

.close-button {
  background: rgba(255, 255, 255, 0.2);
  border: none;
  border-radius: 8px;
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: background 0.2s;
}

.close-button:hover {
  background: rgba(255, 255, 255, 0.3);
}

.close-button .icon {
  width: 20px;
  height: 20px;
  color: white;
}

/* Selector de tarea */
.task-selector {
  padding: 20px;
  border-bottom: 1px solid #e5e7eb;
}

.selector-label {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 500;
  color: #374151;
  margin-bottom: 8px;
}

.label-icon {
  width: 18px;
  height: 18px;
  color: #06b6d4;
}

.task-select {
  width: 100%;
  padding: 10px 12px;
  border: 2px solid #e5e7eb;
  border-radius: 8px;
  font-size: 14px;
  transition: border-color 0.2s;
  cursor: pointer;
}

.task-select:focus {
  outline: none;
  border-color: #06b6d4;
}

/* Tarea seleccionada */
.selected-task {
  padding: 16px 20px;
  background: #f9fafb;
  border-bottom: 1px solid #e5e7eb;
}

.task-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.task-title {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: #111827;
}

.change-task-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px 12px;
  background: white;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 12px;
  color: #6b7280;
  cursor: pointer;
  transition: all 0.2s;
}

.change-task-btn:hover {
  border-color: #06b6d4;
  color: #06b6d4;
}

.task-description {
  margin: 0;
  font-size: 13px;
  color: #6b7280;
  line-height: 1.5;
}

/* Grid de acciones */
.action-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
  padding: 20px;
  max-height: 300px;
  overflow-y: auto;
}

.action-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 16px;
  background: white;
  border: 2px solid #e5e7eb;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s;
  text-align: center;
}

.action-card:hover:not(:disabled) {
  border-color: #06b6d4;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(6, 182, 212, 0.2);
}

.action-card:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.action-card.active {
  background: linear-gradient(135deg, #06b6d4 0%, #0891b2 100%);
  border-color: #06b6d4;
  color: white;
}

.card-icon {
  width: 32px;
  height: 32px;
  color: #06b6d4;
  margin-bottom: 8px;
}

.action-card.active .card-icon {
  color: white;
}

.card-title {
  font-size: 14px;
  font-weight: 600;
  margin-bottom: 4px;
  display: block;
}

.card-desc {
  font-size: 11px;
  color: #6b7280;
  display: block;
}

.action-card.active .card-desc {
  color: rgba(255, 255, 255, 0.9);
}

/* Área de contenido */
.content-area {
  padding: 20px;
  max-height: 400px;
  overflow-y: auto;
  border-top: 1px solid #e5e7eb;
}

.content-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 16px;
}

.content-icon {
  width: 24px;
  height: 24px;
  color: #06b6d4;
}

.content-header h4 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: #111827;
}

.content-body {
  margin-bottom: 16px;
}

/* Explicación */
.explanation-text {
  margin: 0 0 16px;
  font-size: 14px;
  line-height: 1.6;
  color: #374151;
}

.audio-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  background: linear-gradient(135deg, #06b6d4 0%, #0891b2 100%);
  border: none;
  border-radius: 8px;
  color: white;
  font-size: 14px;
  cursor: pointer;
  transition: transform 0.2s;
}

.audio-btn:hover:not(:disabled) {
  transform: scale(1.02);
}

.audio-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Tips */
.tips-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.tip-item {
  display: flex;
  gap: 10px;
  align-items: start;
  padding: 12px;
  margin-bottom: 8px;
  background: #f9fafb;
  border-radius: 8px;
  font-size: 14px;
  line-height: 1.5;
  color: #374151;
}

.tip-icon {
  width: 20px;
  height: 20px;
  color: #10b981;
  flex-shrink: 0;
  margin-top: 2px;
}

/* Recursos */
.resource-card {
  padding: 16px;
  background: #f9fafb;
  border-radius: 12px;
  margin-bottom: 12px;
}

.resource-header {
  display: flex;
  gap: 12px;
  align-items: center;
  margin-bottom: 8px;
}

.resource-icon {
  width: 24px;
  height: 24px;
  color: #06b6d4;
}

.resource-info {
  flex: 1;
}

.resource-title {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  color: #111827;
}

.resource-type {
  font-size: 12px;
  color: #6b7280;
  text-transform: uppercase;
}

.resource-description {
  margin: 0 0 12px;
  font-size: 13px;
  color: #374151;
  line-height: 1.5;
}

.resource-link {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  background: white;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 13px;
  color: #06b6d4;
  text-decoration: none;
  transition: all 0.2s;
}

.resource-link:hover {
  border-color: #06b6d4;
  background: #06b6d4;
  color: white;
}

/* Flashcards */
.flashcard-container {
  display: grid;
  gap: 16px;
}

.flashcard {
  perspective: 1000px;
  cursor: pointer;
  height: 200px;
}

.flashcard-inner {
  position: relative;
  width: 100%;
  height: 100%;
  transition: transform 0.6s;
  transform-style: preserve-3d;
}

.flashcard.flipped .flashcard-inner {
  transform: rotateY(180deg);
}

.flashcard-front,
.flashcard-back {
  position: absolute;
  width: 100%;
  height: 100%;
  backface-visibility: hidden;
  display: flex;
  flex-direction: column;
  padding: 20px;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.flashcard-front {
  background: linear-gradient(135deg, #06b6d4 0%, #0891b2 100%);
  color: white;
}

.flashcard-back {
  background: white;
  border: 2px solid #e5e7eb;
  transform: rotateY(180deg);
}

.card-label {
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  opacity: 0.8;
  margin-bottom: 12px;
}

.flashcard-back .card-label {
  color: #06b6d4;
}

.card-text {
  flex: 1;
  margin: 0;
  font-size: 16px;
  line-height: 1.5;
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
}

.flashcard-back .card-text {
  color: #111827;
}

.card-hint {
  font-size: 12px;
  opacity: 0.8;
  text-align: center;
}

.difficulty-badge {
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  text-align: center;
}

.difficulty-easy {
  background: #d1fae5;
  color: #065f46;
}

.difficulty-medium {
  background: #fef3c7;
  color: #92400e;
}

.difficulty-hard {
  background: #fee2e2;
  color: #991b1b;
}

/* Plan de estudio */
.study-plan {
  padding: 16px;
  background: #f9fafb;
  border-radius: 12px;
}

.plan-title {
  margin: 0 0 8px;
  font-size: 16px;
  font-weight: 600;
  color: #111827;
}

.plan-description {
  margin: 0 0 12px;
  font-size: 14px;
  color: #374151;
  line-height: 1.5;
}

.plan-duration {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  background: white;
  border-radius: 6px;
  font-size: 13px;
  color: #06b6d4;
  font-weight: 500;
  margin-bottom: 16px;
}

.plan-steps {
  list-style: none;
  padding: 0;
  margin: 0;
}

.plan-step {
  display: flex;
  gap: 12px;
  align-items: start;
  padding: 12px;
  margin-bottom: 8px;
  background: white;
  border-radius: 8px;
  font-size: 14px;
  line-height: 1.5;
}

.step-number {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  background: linear-gradient(135deg, #06b6d4 0%, #0891b2 100%);
  color: white;
  border-radius: 50%;
  font-size: 12px;
  font-weight: 600;
  flex-shrink: 0;
}

.step-text {
  color: #374151;
  flex: 1;
}

/* Botones */
.close-content-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  width: 100%;
  padding: 10px;
  background: #f3f4f6;
  border: none;
  border-radius: 8px;
  color: #6b7280;
  font-size: 14px;
  cursor: pointer;
  transition: background 0.2s;
}

.close-content-btn:hover {
  background: #e5e7eb;
}

.icon-sm {
  width: 16px;
  height: 16px;
}

/* Error */
.error-message {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 20px;
  background: #fee2e2;
  border-top: 1px solid #fecaca;
  color: #991b1b;
  font-size: 13px;
}

.error-icon {
  width: 20px;
  height: 20px;
  flex-shrink: 0;
}

/* Animaciones */
.slide-up-enter-active,
.slide-up-leave-active {
  transition: all 0.3s ease;
}

.slide-up-enter-from {
  transform: translateY(20px);
  opacity: 0;
}

.slide-up-leave-to {
  transform: translateY(20px);
  opacity: 0;
}

/* Responsive */
@media (max-width: 768px) {
  .tutor-panel {
    width: calc(100vw - 40px);
    max-height: calc(100vh - 100px);
  }

  .action-grid {
    grid-template-columns: 1fr;
  }
}

/* Scrollbar personalizado */
.content-area::-webkit-scrollbar,
.action-grid::-webkit-scrollbar {
  width: 6px;
}

.content-area::-webkit-scrollbar-track,
.action-grid::-webkit-scrollbar-track {
  background: #f3f4f6;
  border-radius: 10px;
}

.content-area::-webkit-scrollbar-thumb,
.action-grid::-webkit-scrollbar-thumb {
  background: #d1d5db;
  border-radius: 10px;
}

.content-area::-webkit-scrollbar-thumb:hover,
.action-grid::-webkit-scrollbar-thumb:hover {
  background: #9ca3af;
}
</style>
