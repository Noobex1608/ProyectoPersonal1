<template>
  <div class="exam-generator">
    <!-- Vista de examen activo -->
    <div v-if="exam && !showResults" class="exam-container">
      <div class="exam-header">
        <div class="header-content">
          <ClipboardDocumentCheckIcon class="exam-icon" />
          <div>
            <h2 class="exam-title">{{ exam.topic }}</h2>
            <p class="exam-meta">
              {{ exam.questions.length }} preguntas • {{ exam.totalPoints }} puntos totales
            </p>
          </div>
        </div>
        
        <!-- Temporizador -->
        <div v-if="exam.timeLimit && isTimerActive" class="timer" :class="{ warning: timeRemaining < 300 }">
          <ClockIcon class="timer-icon" />
          <span>{{ formatTime(timeRemaining) }}</span>
        </div>
      </div>

      <!-- Progreso -->
      <div class="exam-progress">
        <div class="progress-bar">
          <div class="progress-fill" :style="{ width: `${progressPercentage}%` }"></div>
        </div>
        <p class="progress-text">
          {{ answeredCount }} de {{ exam.questions.length }} respondidas
        </p>
      </div>

      <!-- Preguntas -->
      <div class="questions-container">
        <div 
          v-for="(question, index) in exam.questions" 
          :key="question.id"
          class="question-card"
        >
          <div class="question-header">
            <span class="question-number">Pregunta {{ index + 1 }}</span>
            <span class="question-points">{{ question.points }} pts</span>
            <span class="question-difficulty" :class="question.difficulty">
              {{ difficultyLabels[question.difficulty] }}
            </span>
          </div>

          <h3 class="question-text">{{ question.question }}</h3>

          <!-- Opción múltiple -->
          <div v-if="question.type === 'multiple-choice'" class="options-list">
            <label 
              v-for="(option, optionIndex) in question.options" 
              :key="optionIndex"
              class="option-item"
            >
              <input
                type="radio"
                :name="`question-${question.id}`"
                :value="option"
                v-model="answers[question.id]"
                class="option-input"
              />
              <span class="option-label">{{ option }}</span>
            </label>
          </div>

          <!-- Verdadero/Falso -->
          <div v-else-if="question.type === 'true-false'" class="true-false-options">
            <label class="option-item">
              <input
                type="radio"
                :name="`question-${question.id}`"
                value="true"
                v-model="answers[question.id]"
                class="option-input"
              />
              <span class="option-label">✓ Verdadero</span>
            </label>
            <label class="option-item">
              <input
                type="radio"
                :name="`question-${question.id}`"
                value="false"
                v-model="answers[question.id]"
                class="option-input"
              />
              <span class="option-label">✗ Falso</span>
            </label>
          </div>

          <!-- Respuesta corta -->
          <div v-else-if="question.type === 'short-answer'" class="short-answer">
            <input
              type="text"
              v-model="answers[question.id]"
              placeholder="Escribe tu respuesta..."
              class="answer-input"
            />
          </div>

          <!-- Ensayo -->
          <div v-else-if="question.type === 'essay'" class="essay-answer">
            <textarea
              v-model="answers[question.id]"
              placeholder="Desarrolla tu respuesta aquí..."
              rows="6"
              class="essay-textarea"
            ></textarea>
          </div>
        </div>
      </div>

      <!-- Acciones del examen -->
      <div class="exam-actions">
        <button @click.prevent="handleClose" class="action-btn secondary">
          <XMarkIcon class="btn-icon" />
          Cancelar
        </button>
        <button 
          @click="submitExam" 
          :disabled="!canSubmit || loading"
          class="action-btn primary"
        >
          <CheckCircleIcon v-if="!loading" class="btn-icon" />
          <span class="spinner-sm" v-else></span>
          {{ loading ? 'Evaluando...' : 'Enviar examen' }}
        </button>
      </div>
    </div>

    <!-- Resultados del examen -->
    <div v-else-if="showResults && examResult" class="results-container">
      <div class="results-header">
        <div class="score-card" :class="getScoreClass(examResult.percentage)">
          <div class="score-circle">
            <svg class="score-svg" viewBox="0 0 120 120">
              <circle
                cx="60"
                cy="60"
                r="50"
                class="score-bg"
              />
              <circle
                cx="60"
                cy="60"
                r="50"
                class="score-progress"
                :stroke-dasharray="`${examResult.percentage * 3.14}, 314`"
              />
            </svg>
            <div class="score-value">
              <span class="score-number">{{ examResult.percentage }}</span>
              <span class="score-percent">%</span>
            </div>
          </div>
          <h2 class="score-label">{{ getScoreLabel(examResult.percentage) }}</h2>
          <p class="score-description">
            {{ examResult.correctAnswers }} de {{ examResult.details?.length || 0 }} correctas
          </p>
        </div>
      </div>

      <!-- Detalles de las respuestas -->
      <div class="answers-review">
        <h3 class="review-title">Revisión de respuestas</h3>
        
        <div 
          v-for="(detail, index) in examResult.details" 
          :key="detail.questionId"
          class="answer-card"
          :class="{ correct: detail.isCorrect, incorrect: !detail.isCorrect }"
        >
          <div class="answer-header">
            <span class="answer-number">Pregunta {{ index + 1 }}</span>
            <span class="answer-status">
              <CheckCircleIcon v-if="detail.isCorrect" class="status-icon correct" />
              <XCircleIcon v-else class="status-icon incorrect" />
              {{ detail.isCorrect ? 'Correcta' : 'Incorrecta' }}
            </span>
          </div>

          <p class="answer-question">{{ getQuestion(detail.questionId)?.question || 'Pregunta no disponible' }}</p>

          <div class="answer-details">
            <div class="detail-row">
              <span class="detail-label">Tu respuesta:</span>
              <span class="detail-value user-answer">
                {{ formatAnswer(detail.userAnswer) }}
              </span>
            </div>
            <div v-if="!detail.isCorrect" class="detail-row">
              <span class="detail-label">Respuesta correcta:</span>
              <span class="detail-value correct-answer">
                {{ formatAnswer(detail.correctAnswer) }}
              </span>
            </div>
          </div>

          <div v-if="getQuestion(detail.questionId)?.explanation" class="explanation-box">
            <LightBulbIcon class="explanation-icon" />
            <p class="explanation-text">{{ getQuestion(detail.questionId)?.explanation }}</p>
          </div>
        </div>
      </div>

      <!-- Acciones de resultados -->
      <div class="results-actions">
        <button @click.prevent="handleClose" class="action-btn primary" >
          <ArrowLeftIcon class="btn-icon" />
          Volver al modo estudio
        </button>
      </div>
    </div>

    <!-- Estado vacío -->
    <div v-else-if="!loading" class="empty-state">
      <ClipboardDocumentListIcon class="empty-icon" />
      <h3>No hay examen activo</h3>
      <p>Genera un examen desde el modo de estudio libre o con PDF</p>
    </div>

    <!-- Loading -->
    <div v-if="loading && !exam" class="loading-state">
      <div class="spinner-large"></div>
      <p>Generando examen...</p>
    </div>

    <!-- Modal de confirmación para salir -->
    <div v-if="showExitModal" class="modal-overlay" @click="showExitModal = false">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h3 class="modal-title">¿Salir del examen?</h3>
        </div>
        <div class="modal-body">
          <p>¿Estás seguro de que quieres salir?</p>
          <p class="modal-warning">Se perderán todas las respuestas no enviadas.</p>
        </div>
        <div class="modal-actions">
          <button @click="showExitModal = false" class="modal-btn secondary">
            Cancelar
          </button>
          <button @click="confirmExit" class="modal-btn primary">
            Sí, salir
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onUnmounted } from 'vue'
import {
  ClipboardDocumentCheckIcon,
  ClipboardDocumentListIcon,
  ClockIcon,
  XMarkIcon,
  CheckCircleIcon,
  XCircleIcon,
  LightBulbIcon,
  ArrowLeftIcon
} from '@heroicons/vue/24/outline'
import type { Exam, ExamQuestion, ExamResult } from '@/composables/useStudyMode'

// Props
interface Props {
  exam: Exam | null
  loading?: boolean
  preloadedResult?: ExamResult | null
}

const props = withDefaults(defineProps<Props>(), {
  loading: false,
  preloadedResult: null
})

// Emits
const emit = defineEmits<{
  'submit-exam': [answers: Record<number, string | string[]>]
  'close-exam': []
}>()

// Estado
const answers = ref<Record<number, string | string[]>>({})
const showResults = ref(false)
const examResult = ref<ExamResult | null>(null)
const isTimerActive = ref(false)
const timeRemaining = ref(0)
const showExitModal = ref(false)
const cachedExam = ref<Exam | null>(null) // Guardar examen para mostrar resultados
let timerInterval: number | null = null

// Labels
const difficultyLabels = {
  easy: 'Fácil',
  medium: 'Media',
  hard: 'Difícil'
}

// Computed
const answeredCount = computed(() => Object.keys(answers.value).length)

const progressPercentage = computed(() => {
  if (!props.exam) return 0
  return (answeredCount.value / props.exam.questions.length) * 100
})

const canSubmit = computed(() => {
  if (!props.exam) return false
  return answeredCount.value === props.exam.questions.length
})

// Watchers
watch(() => props.exam, (newExam, oldExam) => {
  // Si el examen se vuelve null, limpiar todo
  if (!newExam && oldExam) {
    console.log('Examen eliminado, limpiando estado')
    resetExam()
    cachedExam.value = null
    showExitModal.value = false
    return
  }
  
  if (newExam && newExam !== oldExam) {
    // Guardar copia del examen solo si es diferente
    cachedExam.value = JSON.parse(JSON.stringify(newExam))
    
    // Solo resetear si no estamos mostrando resultados precargados
    if (!props.preloadedResult) {
      resetExam()
    }
    
    // Si hay un resultado precargado, mostrarlo directamente
    if (props.preloadedResult) {
      showResults.value = true
      examResult.value = props.preloadedResult
    } else if (newExam.timeLimit) {
      startTimer(newExam.timeLimit * 60) // Convertir minutos a segundos
    }
  }
})

// Watcher para el resultado precargado
watch(() => props.preloadedResult, (newResult, oldResult) => {
  // Si el resultado se vuelve null, limpiar
  if (!newResult && oldResult) {
    console.log('Resultado precargado eliminado, limpiando')
    resetExam()
    cachedExam.value = null
    return
  }
  
  if (newResult && newResult !== oldResult) {
    // Guardar copia del examen antes de mostrar resultados
    if (props.exam) {
      cachedExam.value = JSON.parse(JSON.stringify(props.exam))
    }
    showResults.value = true
    examResult.value = newResult
  }
})

// Funciones
function resetExam() {
  answers.value = {}
  showResults.value = false
  examResult.value = null
  stopTimer()
}

function startTimer(seconds: number) {
  timeRemaining.value = seconds
  isTimerActive.value = true
  
  timerInterval = window.setInterval(() => {
    if (timeRemaining.value > 0) {
      timeRemaining.value--
    } else {
      stopTimer()
      autoSubmitExam()
    }
  }, 1000)
}

function stopTimer() {
  if (timerInterval) {
    clearInterval(timerInterval)
    timerInterval = null
  }
  isTimerActive.value = false
}

function autoSubmitExam() {
  alert('¡Tiempo agotado! El examen se enviará automáticamente.')
  submitExam()
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
}

function submitExam() {
  if (!props.exam || !canSubmit.value) return
  
  stopTimer()
  emit('submit-exam', answers.value)
  
  // Simular resultados (en producción vendrían del composable)
  setTimeout(() => {
    showResults.value = true
    // En producción, los resultados vendrían del emit
  }, 500)
}

function handleClose() {
  console.log('handleClose llamado', {
    showResults: showResults.value,
    answersCount: Object.keys(answers.value).length,
    showExitModal: showExitModal.value
  })
  
  // Si hay resultados (examen completado o viendo histórico), cerrar directamente
  if (showResults.value) {
    console.log('Cerrando con resultados')
    stopTimer()
    emit('close-exam')
    return
  }
  
  // Si hay respuestas en progreso, mostrar modal de confirmación
  if (Object.keys(answers.value).length > 0) {
    console.log('Mostrando modal de confirmación')
    showExitModal.value = true
    return
  }
  
  // Si no hay respuestas, cerrar directamente
  console.log('Cerrando sin respuestas')
  stopTimer()
  emit('close-exam')
}

function confirmExit() {
  showExitModal.value = false
  stopTimer()
  emit('close-exam')
}

function getQuestion(questionId: number): ExamQuestion | null {
  // Usar el examen en caché si estamos mostrando resultados
  const examToUse = cachedExam.value || props.exam
  if (!examToUse || !examToUse.questions) return null
  return examToUse.questions.find(q => q.id === questionId) || null
}

function formatAnswer(answer: string | string[]): string {
  if (Array.isArray(answer)) {
    return answer.join(', ')
  }
  return answer
}

function getScoreClass(percentage: number): string {
  if (percentage >= 90) return 'excellent'
  if (percentage >= 70) return 'good'
  if (percentage >= 50) return 'regular'
  return 'poor'
}

function getScoreLabel(percentage: number): string {
  if (percentage >= 90) return '¡Excelente!'
  if (percentage >= 70) return 'Bien hecho'
  if (percentage >= 50) return 'Puedes mejorar'
  return 'Sigue practicando'
}

// Cleanup
onUnmounted(() => {
  stopTimer()
  // Limpiar referencias para evitar memory leaks
  answers.value = {}
  examResult.value = null
  cachedExam.value = null
})
</script>

<style scoped>
.exam-generator {
  width: 100%;
}

/* Exam Container */
.exam-container {
  max-width: 900px;
  margin: 0 auto;
}

.exam-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 2rem;
  padding: 1.5rem;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 1rem;
  color: white;
}

.header-content {
  display: flex;
  gap: 1rem;
}

.exam-icon {
  width: 2.5rem;
  height: 2.5rem;
  flex-shrink: 0;
}

.exam-title {
  margin: 0 0 0.5rem 0;
  font-size: 1.5rem;
  font-weight: 700;
}

.exam-meta {
  margin: 0;
  opacity: 0.9;
  font-size: 0.875rem;
}

/* Timer */
.timer {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 0.5rem;
  font-weight: 600;
  font-size: 1.125rem;
}

.timer.warning {
  background: #fef3c7;
  color: #92400e;
  animation: pulse 1s infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.7; }
}

.timer-icon {
  width: 1.5rem;
  height: 1.5rem;
}

/* Progress */
.exam-progress {
  margin-bottom: 2rem;
}

.progress-bar {
  width: 100%;
  height: 0.75rem;
  background: #e5e7eb;
  border-radius: 9999px;
  overflow: hidden;
  margin-bottom: 0.5rem;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);
  transition: width 0.3s;
}

.progress-text {
  margin: 0;
  text-align: right;
  color: #6b7280;
  font-size: 0.875rem;
  font-weight: 600;
}

/* Questions */
.questions-container {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  margin-bottom: 2rem;
}

.question-card {
  padding: 2rem;
  background: white;
  border: 2px solid #e5e7eb;
  border-radius: 1rem;
  transition: all 0.2s;
}

.question-card:hover {
  border-color: #667eea;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
}

.question-header {
  display: flex;
  gap: 1rem;
  margin-bottom: 1rem;
}

.question-number {
  padding: 0.25rem 0.75rem;
  background: #f3f4f6;
  border-radius: 9999px;
  font-weight: 600;
  font-size: 0.875rem;
  color: #374151;
}

.question-points {
  padding: 0.25rem 0.75rem;
  background: #dbeafe;
  border-radius: 9999px;
  font-weight: 600;
  font-size: 0.875rem;
  color: #1e40af;
}

.question-difficulty {
  padding: 0.25rem 0.75rem;
  border-radius: 9999px;
  font-weight: 600;
  font-size: 0.875rem;
}

.question-difficulty.easy {
  background: #d1fae5;
  color: #065f46;
}

.question-difficulty.medium {
  background: #fef3c7;
  color: #92400e;
}

.question-difficulty.hard {
  background: #fee2e2;
  color: #991b1b;
}

.question-text {
  margin: 0 0 1.5rem 0;
  font-size: 1.125rem;
  font-weight: 600;
  color: #1f2937;
  line-height: 1.6;
}

/* Options */
.options-list,
.true-false-options {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.option-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 1rem;
  background: #f9fafb;
  border: 2px solid #e5e7eb;
  border-radius: 0.5rem;
  cursor: pointer;
  transition: all 0.2s;
}

.option-item:hover {
  background: #f3f4f6;
  border-color: #d1d5db;
}

.option-item:has(.option-input:checked) {
  background: #eef2ff;
  border-color: #667eea;
}

.option-input {
  width: 1.25rem;
  height: 1.25rem;
  cursor: pointer;
}

.option-label {
  flex: 1;
  color: #374151;
  font-weight: 500;
}

/* Short Answer & Essay */
.short-answer,
.essay-answer {
  margin-top: 1rem;
}

.answer-input,
.essay-textarea {
  width: 100%;
  padding: 0.75rem 1rem;
  border: 2px solid #e5e7eb;
  border-radius: 0.5rem;
  font-family: inherit;
  font-size: 1rem;
  transition: border-color 0.2s;
}

.answer-input:focus,
.essay-textarea:focus {
  outline: none;
  border-color: #667eea;
}

.essay-textarea {
  resize: vertical;
  min-height: 150px;
}

/* Exam Actions */
.exam-actions {
  display: flex;
  gap: 1rem;
  justify-content: flex-end;
  padding: 1.5rem;
  background: #f9fafb;
  border-radius: 1rem;
}

.action-btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.875rem 1.5rem;
  border: none;
  border-radius: 0.5rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.action-btn.primary {
  background: #10b981;
  color: white;
}

.action-btn.primary:hover:not(:disabled) {
  background: #059669;
  transform: translateY(-2px);
  box-shadow: 0 10px 20px rgba(16, 185, 129, 0.3);
}

.action-btn.secondary {
  background: white;
  color: #6b7280;
  border: 2px solid #e5e7eb;
}

.action-btn.secondary:hover {
  background: #f9fafb;
  color: #374151;
}

.action-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-icon {
  width: 1.25rem;
  height: 1.25rem;
}

.spinner-sm {
  width: 1.25rem;
  height: 1.25rem;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: white;
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* Results */
.results-container {
  max-width: 900px;
  margin: 0 auto;
}

.results-header {
  margin-bottom: 3rem;
}

.score-card {
  padding: 3rem;
  background: white;
  border-radius: 1rem;
  text-align: center;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
}

.score-circle {
  position: relative;
  width: 200px;
  height: 200px;
  margin: 0 auto 2rem;
}

.score-svg {
  width: 100%;
  height: 100%;
  transform: rotate(-90deg);
}

.score-bg {
  fill: none;
  stroke: #e5e7eb;
  stroke-width: 10;
}

.score-progress {
  fill: none;
  stroke-width: 10;
  stroke-linecap: round;
  transition: stroke-dasharray 1s;
}

.score-card.excellent .score-progress {
  stroke: #10b981;
}

.score-card.good .score-progress {
  stroke: #3b82f6;
}

.score-card.regular .score-progress {
  stroke: #f59e0b;
}

.score-card.poor .score-progress {
  stroke: #ef4444;
}

.score-value {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  font-weight: 700;
}

.score-number {
  font-size: 3rem;
}

.score-percent {
  font-size: 2rem;
}

.score-card.excellent .score-value {
  color: #10b981;
}

.score-card.good .score-value {
  color: #3b82f6;
}

.score-card.regular .score-value {
  color: #f59e0b;
}

.score-card.poor .score-value {
  color: #ef4444;
}

.score-label {
  margin: 0 0 0.5rem 0;
  font-size: 2rem;
  font-weight: 700;
  color: #1f2937;
}

.score-description {
  margin: 0;
  color: #6b7280;
  font-size: 1.125rem;
}

/* Answers Review */
.answers-review {
  margin-bottom: 2rem;
}

.review-title {
  margin: 0 0 1.5rem 0;
  font-size: 1.5rem;
  font-weight: 700;
  color: #1f2937;
}

.answer-card {
  margin-bottom: 1.5rem;
  padding: 1.5rem;
  background: white;
  border: 2px solid #e5e7eb;
  border-radius: 1rem;
}

.answer-card.correct {
  border-color: #10b981;
  background: #f0fdf4;
}

.answer-card.incorrect {
  border-color: #ef4444;
  background: #fef2f2;
}

.answer-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.answer-number {
  font-weight: 600;
  color: #6b7280;
}

.answer-status {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-weight: 600;
}

.status-icon {
  width: 1.25rem;
  height: 1.25rem;
}

.status-icon.correct {
  color: #10b981;
}

.status-icon.incorrect {
  color: #ef4444;
}

.answer-question {
  margin: 0 0 1rem 0;
  font-weight: 600;
  color: #1f2937;
}

.answer-details {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-bottom: 1rem;
}

.detail-row {
  display: flex;
  gap: 0.5rem;
}

.detail-label {
  font-weight: 600;
  color: #6b7280;
}

.detail-value {
  flex: 1;
}

.user-answer {
  color: #374151;
}

.correct-answer {
  color: #10b981;
  font-weight: 500;
}

.explanation-box {
  display: flex;
  gap: 0.75rem;
  padding: 1rem;
  background: rgba(102, 126, 234, 0.1);
  border-radius: 0.5rem;
  border-left: 4px solid #667eea;
}

.explanation-icon {
  width: 1.5rem;
  height: 1.5rem;
  color: #667eea;
  flex-shrink: 0;
}

.explanation-text {
  margin: 0;
  color: #374151;
  line-height: 1.6;
}

/* Results Actions */
.results-actions {
  display: flex;
  justify-content: center;
  padding: 1.5rem;
}

/* Empty State */
.empty-state {
  text-align: center;
  padding: 4rem 2rem;
  color: #9ca3af;
}

.empty-icon {
  width: 4rem;
  height: 4rem;
  margin: 0 auto 1rem;
  color: #d1d5db;
}

.empty-state h3 {
  color: #6b7280;
  margin-bottom: 0.5rem;
}

/* Loading State */
.loading-state {
  text-align: center;
  padding: 4rem 2rem;
}

.spinner-large {
  width: 4rem;
  height: 4rem;
  margin: 0 auto 1rem;
  border: 4px solid #e5e7eb;
  border-top-color: #667eea;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

.loading-state p {
  color: #6b7280;
  font-weight: 600;
}

/* Responsive */
@media (max-width: 768px) {
  .exam-header {
    flex-direction: column;
    gap: 1rem;
  }

  .timer {
    width: 100%;
    justify-content: center;
  }

  .question-card {
    padding: 1.5rem;
  }

  .exam-actions {
    flex-direction: column;
  }

  .action-btn {
    width: 100%;
    justify-content: center;
  }

  .score-circle {
    width: 150px;
    height: 150px;
  }

  .score-number {
    font-size: 2rem;
  }

  .score-percent {
    font-size: 1.5rem;
  }
}

/* Modal */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  animation: fadeIn 0.2s ease;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.modal-content {
  background: white;
  border-radius: 1rem;
  max-width: 450px;
  width: 90%;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
  animation: slideUp 0.3s ease;
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.modal-header {
  padding: 1.5rem 1.5rem 1rem 1.5rem;
  border-bottom: 1px solid #e5e7eb;
}

.modal-title {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 700;
  color: #1f2937;
}

.modal-body {
  padding: 1.5rem;
}

.modal-body p {
  margin: 0 0 0.5rem 0;
  color: #4b5563;
  font-size: 1rem;
}

.modal-warning {
  color: #dc2626 !important;
  font-weight: 600;
  font-size: 0.875rem !important;
}

.modal-actions {
  display: flex;
  gap: 0.75rem;
  padding: 1rem 1.5rem 1.5rem 1.5rem;
  border-top: 1px solid #e5e7eb;
}

.modal-btn {
  flex: 1;
  padding: 0.75rem 1rem;
  border: none;
  border-radius: 0.5rem;
  font-weight: 600;
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 0.2s;
}

.modal-btn.secondary {
  background: #f3f4f6;
  color: #4b5563;
}

.modal-btn.secondary:hover {
  background: #e5e7eb;
}

.modal-btn.primary {
  background: #dc2626;
  color: white;
}

.modal-btn.primary:hover {
  background: #b91c1c;
}
</style>
