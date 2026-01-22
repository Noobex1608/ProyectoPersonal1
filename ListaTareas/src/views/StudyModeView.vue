<template>
  <div class="study-mode-view">
    <NavBar />
    <div class="container">
      <!-- Header -->
      <div class="page-header">
        <div class="header-content">
          <AcademicCapIcon class="page-icon" />
          <div>
            <h1 class="page-title">Modo Estudio</h1>
            <p class="page-subtitle">Aprende con ayuda de IA y exámenes personalizados</p>
          </div>
        </div>
      </div>

      <!-- Tabs - Segmented Control -->
      <div class="tabs-wrapper">
        <div class="tabs-container">
          <button 
            @click="activeTab = 'free'"
            :class="['tab', { active: activeTab === 'free' }]"
          >
            <ChatBubbleLeftRightIcon class="tab-icon" />
            Estudio Libre
          </button>
          <button 
            @click="activeTab = 'pdf'"
            :class="['tab', { active: activeTab === 'pdf' }]"
          >
            <DocumentTextIcon class="tab-icon" />
            Estudio con PDF
          </button>
          <button 
            @click="activeTab = 'exams'"
            :class="['tab', { active: activeTab === 'exams' }]"
          >
            <ClipboardDocumentCheckIcon class="tab-icon" />
            Mis Exámenes
          </button>
        </div>
      </div>

      <!-- Dashboard Layout: 2 Columnas -->
      <div class="dashboard-layout">
        <!-- Columna Principal (Izquierda - 70%) -->
        <div class="main-content">
          <!-- Contenido de Tabs -->
          <div class="tab-content">
            <!-- Tab: Estudio Libre -->
            <div v-if="activeTab === 'free'" class="free-study-tab">
              <div class="study-card">
                <div class="card-header-content">
                  <div class="header-with-icon">
                    <div class="icon-circle">
                      <AcademicCapIcon class="birrete-icon" />
                    </div>
                    <div class="text-content">
                      <h2 class="card-title">Estudia cualquier tema</h2>
                      <p class="card-description">
                    Pregúntale al tutor de IA sobre cualquier concepto que necesites aprender
                  </p>
                </div>
              </div>
            </div>

            <div class="input-section">
              <label for="topic" class="input-label">¿Qué quieres estudiar?</label>
              <div class="input-wrapper">
                <SparklesIcon class="input-icon" />
                <input
                  id="topic"
                  v-model="freeTopic"
                  type="text"
                  :placeholder="currentPlaceholder"
                  class="topic-input"
                  @keyup.enter="startFreeStudy"
                />
              </div>
              <button
                @click="startFreeStudy"
                :disabled="!freeTopic.trim() || loadingFreeStudy"
                class="start-button"
              >
                <SparklesIcon v-if="!loadingFreeStudy" class="button-icon" />
                <span class="spinner" v-else></span>
                {{ loadingFreeStudy ? 'Generando...' : 'Comenzar estudio' }}
              </button>
              
              <!-- Chips de tareas pendientes del usuario -->
              <div v-if="!freeStudyContent && pendingTodos.length > 0" class="suggestions-chips">
                <p class="chips-label">Mis tareas pendientes:</p>
                <div class="chips-container">
                  <button 
                    v-for="todo in pendingTodos.slice(0, 6)" 
                    :key="todo.id"
                    @click="selectTaskTopic(todo)"
                    class="chip task-chip"
                    :class="`priority-${todo.priority}`"
                  >
                    <span class="chip-emoji">📚</span>
                    {{ todo.title }}
                  </button>
                </div>
              </div>
            </div>

            <!-- Explicación generada -->
            <div v-if="freeStudyContent" class="study-content">
              <div class="content-header">
                <h3>Explicación del tema</h3>
                <button @click="clearFreeStudy" class="clear-button">
                  <XMarkIcon class="icon-sm" />
                  Limpiar
                </button>
              </div>
              
              <!-- Explicación principal -->
              <div class="explanation-content" v-html="formatContent(processedContent?.explanation || '')"></div>
              
              <!-- Puntos clave -->
              <div v-if="processedContent?.keyPoints && processedContent.keyPoints.length > 0" class="key-points-section">
                <h4 class="section-title">💡 Puntos Clave</h4>
                <ul class="key-points-list">
                  <li v-for="(point, index) in processedContent.keyPoints" :key="index">
                    {{ point }}
                  </li>
                </ul>
              </div>
              
              <!-- Ejemplos -->
              <div v-if="processedContent?.examples && processedContent.examples.length > 0" class="examples-section">
                <h4 class="section-title">📝 Ejemplos</h4>
                <ul class="examples-list">
                  <li v-for="(example, index) in processedContent.examples" :key="index">
                    {{ example }}
                  </li>
                </ul>
              </div>
              
              <!-- Generar examen desde estudio libre -->
              <div class="exam-actions">
                <button
                  @click="generateExamFromFreeStudy"
                  :disabled="loadingExam"
                  class="exam-button"
                >
                  <ClipboardDocumentListIcon class="button-icon" />
                  {{ loadingExam ? 'Generando examen...' : 'Generar examen sobre este tema' }}
                </button>
                <button
                  @click="generateMindMapFromFreeStudy(freeTopic)"
                  :disabled="loadingMindMap"
                  class="mindmap-button"
                >
                  <MapIcon class="button-icon" />
                  {{ loadingMindMap ? 'Generando mapa...' : 'Generar Mapa Mental' }}
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Tab: Estudio con PDF -->
        <div v-if="activeTab === 'pdf'" class="pdf-study-tab">
          <PDFUploader
            @pdf-uploaded="handlePDFUploaded"
            @pdf-analyzed="handlePDFAnalyzed"
            :loading="loadingPDF"
          />

          <!-- Mensaje de error -->
          <div v-if="errorPDF" class="error-message">
            <ExclamationCircleIcon class="error-icon" />
            <div class="error-content">
              <h4>Error al analizar el PDF</h4>
              <p v-html="errorPDF.replace(/\\n/g, '<br>')"></p>
            </div>
            <button @click="errorPDF = null" class="close-error">
              <XMarkIcon class="icon-sm" />
            </button>
          </div>

          <!-- Contenido del PDF analizado -->
          <div v-if="pdfAnalysis" class="pdf-analysis-section">
            <div class="analysis-card">
              <div class="card-header">
                <DocumentCheckIcon class="header-icon" />
                <div>
                  <h3>Análisis del documento</h3>
                  <p class="text-sm text-gray-500">{{ pdfAnalysis.fileName }}</p>
                </div>
              </div>

              <div class="analysis-content">
                <div class="summary-section">
                  <h4 class="section-title">📝 Resumen</h4>
                  <p class="summary-text">{{ pdfAnalysis.summary }}</p>
                </div>

                <div class="topics-section">
                  <h4 class="section-title">📚 Temas principales</h4>
                  <ul class="topics-list">
                    <li v-for="(topic, index) in pdfAnalysis.mainTopics" :key="index">
                      <CheckCircleIcon class="topic-icon" />
                      {{ topic }}
                    </li>
                  </ul>
                </div>

                <div class="concepts-section">
                  <h4 class="section-title">💡 Conceptos clave</h4>
                  <div class="concepts-grid">
                    <div 
                      v-for="(concept, index) in pdfAnalysis.keyConcepts" 
                      :key="index"
                      class="concept-card"
                    >
                      <h5>{{ concept.term }}</h5>
                      <p>{{ concept.definition }}</p>
                    </div>
                  </div>
                </div>

                <div class="explanation-section">
                  <h4 class="section-title">📖 Explicación detallada</h4>
                  <div class="explanation-text" v-html="formatContent(pdfAnalysis.explanation)"></div>
                </div>
              </div>

              <!-- Acciones con el PDF -->
              <div class="pdf-actions">
                <button
                  @click="generateExamFromPDF"
                  :disabled="loadingExam"
                  class="action-button primary"
                >
                  <ClipboardDocumentCheckIcon class="button-icon" />
                  {{ loadingExam ? 'Generando examen...' : 'Generar examen' }}
                </button>
                <button
                  @click="generateMindMapFromPDF"
                  :disabled="loadingMindMap"
                  class="action-button mindmap"
                >
                  <MapIcon class="button-icon" />
                  {{ loadingMindMap ? 'Generando mapa...' : 'Generar Mapa Mental' }}
                </button>
                <button
                  @click="clearPDFAnalysis"
                  class="action-button secondary"
                >
                  <ArrowPathIcon class="button-icon" />
                  Subir otro PDF
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Tab: Mis Exámenes -->
        <div v-if="activeTab === 'exams'" class="exams-tab">
          <ExamGenerator
            :exam="currentExam"
            :loading="loadingExam"
            :preloaded-result="viewingExamResult"
            @submit-exam="handleExamSubmit"
            @close-exam="handleCloseExam"
          />

          <!-- Historial de exámenes -->
          <div v-if="examHistory.length > 0" class="exam-history">
            <h3 class="history-title">
              <ClockIcon class="title-icon" />
              Historial de exámenes
            </h3>
            <div class="history-grid">
              <div 
                v-for="exam in examHistory" 
                :key="exam.id"
                class="history-card"
              >
                <div class="exam-info">
                  <h4>{{ exam.topic }}</h4>
                  <p class="exam-date">{{ formatDate(exam.date) }}</p>
                </div>
                <div class="exam-score" :class="getScoreClass(exam.score)">
                  <span class="score-number">{{ exam.score }}%</span>
                  <span class="score-label">{{ getScoreLabel(exam.score) }}</span>
                </div>
                <button 
                  @click="viewExamResults(exam)"
                  class="view-button"
                >
                  Ver detalles
                </button>
              </div>
            </div>
          </div>

          <div v-else-if="!currentExam" class="empty-state">
            <ClipboardDocumentListIcon class="empty-icon" />
            <h3>No hay exámenes disponibles</h3>
            <p>Genera un examen desde el modo de estudio libre o con PDF</p>
          </div>
        </div>
      </div>
        </div><!-- .main-content -->

        <!-- Columna de Herramientas (Derecha - 30%) -->
        <aside class="tools-sidebar">
          <h3 class="sidebar-title">Herramientas</h3>
          
          <!-- Widget Pomodoro -->
          <div class="pomodoro-card">
            <div class="pomodoro-header">
              <span class="pomodoro-title">🍅 Técnica Pomodoro</span>
            </div>
            <div class="timer-display" :class="{ 'break-time': pomodoroSession.isBreak }">
              <span class="time">{{ formatTime(pomodoroSession.timeRemaining) }}</span>
              <span class="session-label">
                {{ pomodoroSession.isBreak ? 'Descanso' : 'Estudio' }}
                ({{ pomodoroSession.sessionCount }}/4)
              </span>
            </div>
            <div class="pomodoro-controls">
              <button @click="startPomodoro" :disabled="pomodoroSession.isActive" class="pomodoro-btn start">
                Iniciar
              </button>
              <button @click="togglePomodoro" :disabled="!pomodoroSession.isActive" class="pomodoro-btn pause">
                {{ pomodoroSession.isPaused ? 'Reanudar' : 'Pausar' }}
              </button>
              <button @click="resetPomodoro" class="pomodoro-btn reset">
                Reset
              </button>
            </div>
          </div>
          
          <!-- Placeholder para futuras herramientas -->
          <div class="future-tools">
            <p class="placeholder-text">Más herramientas próximamente...</p>
          </div>
        </aside>
      </div><!-- .dashboard-layout -->

      <!-- Modal de Mapa Mental -->
      <Transition name="modal">
        <div v-if="currentMindMap || currentMindMapImage" class="modal-overlay" @click="clearMindMap">
          <div class="modal-content" @click.stop>
            <MindMapViewer
              :mermaid-code="currentMindMap ?? undefined"
              :image-url="currentMindMapImage ?? undefined"
              :loading="loadingMindMap"
              :error="errorMindMap"
              :service="mindMapService"
              @close="clearMindMap"
              @retry="currentMindMap ? null : null"
            />
          </div>
        </div>
      </Transition>
    </div><!-- .container -->
  </div><!-- .study-mode-view -->
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { 
  AcademicCapIcon, 
  ChatBubbleLeftRightIcon,
  DocumentTextIcon,
  ClipboardDocumentCheckIcon,
  SparklesIcon,
  XMarkIcon,
  ExclamationCircleIcon,
  ClipboardDocumentListIcon,
  DocumentCheckIcon,
  CheckCircleIcon,
  ArrowPathIcon,
  ClockIcon,
  MapIcon
} from '@heroicons/vue/24/outline'
import NavBar from '@/components/NavBar.vue'
import PDFUploader from '@/components/PDFUploader.vue'
import ExamGenerator from '@/components/ExamGenerator.vue'
import MindMapViewer from '@/components/MindMapViewer.vue'
import { useStudyMode } from '@/composables/useStudyMode'
import { useTodosStore } from '@/stores/todos'
import type { TodoWithRelations } from '@/interfaces'

import { format } from 'date-fns'
import { es } from 'date-fns/locale'


const activeTab = ref<'free' | 'pdf' | 'exams'>('free')
const todosStore = useTodosStore()

// Cargar tareas al montar
onMounted(() => {
  todosStore.fetchTodos()
})

// Tareas pendientes del usuario
const pendingTodos = computed(() => todosStore.pendingTodos)

// Placeholder animado
const placeholders = [
  'Ej: Ecuaciones cuadráticas',
  'Ej: Fotosíntesis',
  'Ej: Sintaxis Python',
  'Ej: Segunda Guerra Mundial',
  'Ej: Tabla periódica'
]
const currentPlaceholder = ref(placeholders[0])
let placeholderIndex = 0

// Animar placeholder
setInterval(() => {
  placeholderIndex = (placeholderIndex + 1) % placeholders.length
  currentPlaceholder.value = placeholders[placeholderIndex]
}, 3000)

// Computed para procesar el contenido y asegurar formato correcto
const processedContent = computed(() => {
  if (!freeStudyContent.value) return null
  
  // Si explanation es un string que parece JSON, intentar parsearlo
  if (typeof freeStudyContent.value.explanation === 'string' && 
      freeStudyContent.value.explanation.trim().startsWith('{')) {
    try {
      // El contenido completo es un JSON string, parsearlo
      const parsed = JSON.parse(freeStudyContent.value.explanation)
      return parsed
    } catch (e) {
      // Si falla, usar el contenido original
      return freeStudyContent.value
    }
  }
  
  return freeStudyContent.value
})

// Composable
const {
  // Estados
  loadingFreeStudy,
  loadingPDF,
  loadingExam,
  loadingMindMap,
  errorPDF,
  errorMindMap,
  freeStudyContent,
  pdfAnalysis,
  currentExam,
  examHistory,
  pomodoroSession,
  currentMindMap,
  currentMindMapImage,
  mindMapService,
  
  // Acciones
  studyFreeTopic,
  analyzePDF,
  generateExam,
  submitExam,
  getExamDetails,
  loadExamHistory,
  startPomodoro,
  togglePomodoro,
  resetPomodoro,
  clearFreeStudy,
  clearPDFAnalysis,
  clearCurrentExam,
  generateMindMapFromFreeStudy,
  generateMindMapFromPDF,
  clearMindMap
} = useStudyMode()

// Estudio libre
const freeTopic = ref('')
const viewingExamResult = ref<any>(null)

function selectTaskTopic(todo: TodoWithRelations) {
  freeTopic.value = `${todo.title}${todo.description ? ': ' + todo.description : ''}`
  startFreeStudy()
}

async function startFreeStudy() {
  if (!freeTopic.value.trim()) return
  await studyFreeTopic(freeTopic.value)
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
}

async function generateExamFromFreeStudy() {
  if (!freeStudyContent.value) return
  await generateExam({
    topic: freeTopic.value,
    source: 'free',
    content: freeStudyContent.value.explanation
  })
  activeTab.value = 'exams'
}

// Estudio con PDF
async function handlePDFUploaded(file: File) {
  console.log('PDF uploaded:', file.name)
}

async function handlePDFAnalyzed(file: File, text: string) {
  await analyzePDF(file, text)
}

async function generateExamFromPDF() {
  if (!pdfAnalysis.value) return
  await generateExam({
    topic: pdfAnalysis.value.fileName,
    source: 'pdf',
    content: pdfAnalysis.value.explanation
  })
  activeTab.value = 'exams'
}

// Exámenes
async function handleExamSubmit(answers: Record<number, string | string[]>) {
  if (!currentExam.value) return
  const result = await submitExam(currentExam.value.id, answers)
  if (result) {
    // Mostrar resultados
    console.log('Exam results:', result)
  }
}

async function viewExamResults(exam: any) {
  // Cargar el examen completo con sus detalles
  const { exam: fullExam, result } = await getExamDetails(exam.id)
  
  if (fullExam && result) {
    // Establecer el examen y resultado para que ExamGenerator lo muestre
    currentExam.value = fullExam
    viewingExamResult.value = result
    
    // Hacer scroll al examen
    window.scrollTo({ top: 0, behavior: 'smooth' })
  } else {
    alert('No se pudieron cargar los detalles del examen')
  }
}

function handleCloseExam() {
  console.log('handleCloseExam llamado')
  clearCurrentExam()
  viewingExamResult.value = null
  // Recargar historial para mostrar el examen actualizado si se completó
  loadExamHistory()
  console.log('Examen cerrado y historial recargado')
}

// Utilidades
function formatContent(content: string): string {
  if (!content) return ''
  
  // Limpiar SOLO caracteres de control problemáticos (preservar caracteres normales)
  // Eliminar: \u0000-\u0008, \u000B, \u000C, \u000E-\u001F, \u007F
  // Preservar: \u0009 (tab), \u000A (line feed), \u000D (carriage return)
  let text = content
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
    .trim()
  
  // Dividir en párrafos
  const paragraphs = text.split(/\n\n+/)
  let formatted = ''
  
  for (const para of paragraphs) {
    const cleanPara = para.trim()
    if (!cleanPara) continue
    
    // Detectar encabezados markdown
    if (/^#{1,6}\s/.test(cleanPara)) {
      const match = cleanPara.match(/^(#{1,6})\s+(.+)$/)
      if (match && match[1] && match[2]) {
        const level = match[1].length
        const title = match[2]
        formatted += `<h${level} class="markdown-heading">${title}</h${level}>`
        continue
      }
    }
    
    // Detectar listas con viñetas, guiones o números
    if (/^[-•*]\s/.test(cleanPara) || /^\d+[.)\s]/.test(cleanPara)) {
      const lines = cleanPara.split(/\n/)
      formatted += '<ul class="content-list">'
      for (const line of lines) {
        const cleanLine = line.replace(/^[-•*]\s+/, '').replace(/^\d+[.)\s]+/, '').trim()
        if (cleanLine) {
          // Aplicar formato inline en los items de lista
          const formattedLine = cleanLine
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
          formatted += `<li>${formattedLine}</li>`
        }
      }
      formatted += '</ul>'
    } else {
      // Aplicar formato markdown básico
      const formattedPara = cleanPara
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        .replace(/\n/g, '<br>')
      formatted += `<p class="content-paragraph">${formattedPara}</p>`
    }
  }
  
  return formatted
}

function formatDate(date: string): string {
  return format(new Date(date), "d 'de' MMMM 'a las' HH:mm", { locale: es })
}

function getScoreClass(score: number): string {
  if (score >= 90) return 'excellent'
  if (score >= 70) return 'good'
  if (score >= 50) return 'regular'
  return 'poor'
}

function getScoreLabel(score: number): string {
  if (score >= 90) return 'Excelente'
  if (score >= 70) return 'Bien'
  if (score >= 50) return 'Regular'
  return 'Necesita mejorar'
}


</script>

<style scoped>
.study-mode-view {
  min-height: 100vh;
  background: #f9fafb;
  
}

.container {
  max-width: 1200px;
  margin: 0 auto;
}

/* Header */
.page-header {
  position: relative;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 1rem;
  padding: 2rem;
  margin-bottom: 2rem;
  box-shadow: 0 10px 25px -5px rgba(240, 101, 67, 0.15),
              0 8px 16px -8px rgba(240, 157, 81, 0.1);
}

.back-button {
  position: absolute;
  top: 1.5rem;
  left: 1.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2.5rem;
  height: 2.5rem;
  background: rgba(241, 245, 249, 0.8);
  backdrop-filter: blur(10px);
  border: none;
  border-radius: 0.5rem;
  cursor: pointer;
  transition: all 0.2s;
  z-index: 10;
}

.back-button:hover {
  background: linear-gradient(135deg, #F06543 0%, #F09D51 100%);
  transform: translateX(-2px);
  box-shadow: 0 4px 12px rgba(240, 101, 67, 0.3);
}

.back-button:hover .back-icon {
  color: white;
}

.back-icon {
  width: 1.25rem;
  height: 1.25rem;
  color: #6b7280;
  transition: color 0.2s;
}

.header-content {
  display: flex;
  align-items: center;
  gap: 1.5rem;
}

.page-icon {
  width: 3rem;
  height: 3rem;
  color: #F06543;
}

.page-title {
  font-size: 2rem;
  font-weight: 700;
  color: #1f2937;
  margin: 0;
}

.page-subtitle {
  color: #6b7280;
  margin: 0.25rem 0 0 0;
}

/* Dashboard Layout - 2 Columnas */
.dashboard-layout {
  display: grid;
  grid-template-columns: 1fr 360px;
  gap: 2rem;
  align-items: start;
}

/* Columna Principal */
.main-content {
  min-width: 0; /* Para prevenir overflow en grid */
}

/* Sidebar de Herramientas */
.tools-sidebar {
  position: sticky;
  top: 2rem;
  background: white;
  border-radius: 1rem;
  padding: 1.5rem;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
  border: 1px solid rgba(240, 101, 67, 0.1);
}

.sidebar-title {
  font-size: 1.25rem;
  font-weight: 700;
  color: #1f2937;
  margin: 0 0 1.5rem 0;
  padding-bottom: 0.75rem;
  border-bottom: 2px solid #f3f4f6;
}

/* Widget Pomodoro en Sidebar */
.pomodoro-card {
  display: flex;
  flex-direction: column;
  background: linear-gradient(135deg, #FFF1F1 0%, #FFFFFF 100%);
  border: 2px solid #ef4444;
  border-radius: 1rem;
  padding: 1.25rem;
  margin-bottom: 1.5rem;
}

.pomodoro-header {
  margin-bottom: 1rem;
}

.pomodoro-title {
  font-weight: 700;
  color: #ef4444;
  font-size: 1.1rem;
}

.timer-display {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 1.5rem;
  background: white;
  border-radius: 0.75rem;
  margin-bottom: 1rem;
  box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.05);
}

.timer-display.break-time {
  background: linear-gradient(135deg, #DCFCE7 0%, #F0FDF4 100%);
}

.time {
  font-size: 2.5rem;
  font-weight: 700;
  color: #ef4444;
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.02em;
}

.timer-display.break-time .time {
  color: #10b981;
}

.session-label {
  margin-top: 0.5rem;
  color: #6b7280;
  font-size: 0.875rem;
  text-align: center;
  font-weight: 500;
}

.pomodoro-controls {
  display: flex;
  gap: 0.5rem;
}

.pomodoro-btn {
  flex: 1;
  padding: 0.625rem;
  border-radius: 0.5rem;
  border: none;
  font-weight: 600;
  font-size: 0.8rem;
  cursor: pointer;
  transition: all 0.2s;
  text-transform: uppercase;
  letter-spacing: 0.02em;
}

.pomodoro-btn.start {
  background: #10b981;
  color: white;
}

.pomodoro-btn.start:hover:not(:disabled) {
  background: #059669;
  transform: translateY(-1px);
}

.pomodoro-btn.pause {
  background: #f59e0b;
  color: white;
}

.pomodoro-btn.pause:hover:not(:disabled) {
  background: #d97706;
  transform: translateY(-1px);
}

.pomodoro-btn.reset {
  background: #ef4444;
  color: white;
}

.pomodoro-btn.reset:hover:not(:disabled) {
  background: #dc2626;
  transform: translateY(-1px);
}

.pomodoro-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Placeholder para futuras herramientas */
.future-tools {
  padding: 1rem;
  background: #f9fafb;
  border-radius: 0.75rem;
  text-align: center;
}

.placeholder-text {
  color: #9ca3af;
  font-size: 0.875rem;
  margin: 0;
  font-style: italic;
}

/* Tabs - Segmented Control */
.tabs-wrapper {
  display: flex;
  justify-content: center;
  margin-bottom: 2rem;
}

.tabs-container {
  display: inline-flex;
  gap: 0;
  padding: 0.375rem;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 0.875rem;
  box-shadow: 0 4px 12px rgba(240, 101, 67, 0.12),
              0 2px 6px rgba(240, 157, 81, 0.08);
}

.tab {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.75rem 1.5rem;
  background: transparent;
  border: none;
  border-radius: 0.625rem;
  font-weight: 600;
  font-size: 0.9rem;
  color: #6b7280;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  white-space: nowrap;
}

.tab:hover:not(.active) {
  color: #F06543;
  background: rgba(240, 101, 67, 0.05);
}

.tab.active {
  background: white;
  color: #F06543;
  box-shadow: 0 2px 8px rgba(240, 101, 67, 0.15),
              0 4px 16px rgba(240, 157, 81, 0.1);
  transform: translateY(-1px);
}

.tab-icon {
  width: 1.25rem;
  height: 1.25rem;
  transition: transform 0.3s;
}

.tab.active .tab-icon {
  transform: scale(1.1);
}

/* Tab Content */
.tab-content {
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 1rem;
  padding: 2rem;
  box-shadow: 0 10px 25px -5px rgba(240, 101, 67, 0.15),
              0 8px 16px -8px rgba(240, 157, 81, 0.1);
  min-height: 500px;
}

/* Estudio Libre */
.study-card {
  max-width: 900px;
  margin: 0 auto;
  border-top: 4px solid #F06543;
  border-radius: 0.75rem;
  padding-top: 0.5rem;
}

.card-header-content {
  margin-bottom: 2rem;
}

.header-with-icon {
  display: flex;
  align-items: flex-start;
  gap: 1rem;
}

.icon-circle {
  flex-shrink: 0;
  width: 56px;
  height: 56px;
  background: #FED7AA;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.birrete-icon {
  width: 32px;
  height: 32px;
  color: #F06543;
}

.text-content {
  flex: 1;
}



.card-title {
  font-size: 1.5rem;
  font-weight: 700;
  color: #1f2937;
  margin: 0 0 0.5rem 0;
}

.card-description {
  color: #6b7280;
  margin-bottom: 2rem;
}

.input-section {
  margin-bottom: 2rem;
}

.input-label {
  display: block;
  font-weight: 600;
  color: #374151;
  margin-bottom: 0.75rem;
  font-size: 1.05rem;
}

.input-wrapper {
  position: relative;
  margin-bottom: 1rem;
}

.input-icon {
  position: absolute;
  left: 1.25rem;
  top: 50%;
  transform: translateY(-50%);
  width: 1.5rem;
  height: 1.5rem;
  color: #F06543;
  pointer-events: none;
  z-index: 1;
}

.topic-input {
  width: 100%;
  padding: 1.25rem 1.25rem 1.25rem 3.5rem;
  border: 2px solid #E2E8F0;
  border-radius: 0.75rem;
  font-size: 1.05rem;
  transition: all 0.3s;
  background: #F8FAFC;
}

.topic-input:focus {
  outline: none;
  border-color: #F06543;
  background: white;
  box-shadow: 0 0 0 3px rgba(240, 101, 67, 0.1),
              0 4px 12px rgba(240, 101, 67, 0.15);
}

.start-button {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 1.125rem 1.5rem;
  background: linear-gradient(135deg, #F06543 0%, #F09D51 100%);
  color: white;
  border: none;
  border-radius: 0.75rem;
  font-weight: 600;
  font-size: 1.05rem;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 10px 25px -5px rgba(240, 101, 67, 0.5),
              0 8px 16px -8px rgba(240, 157, 81, 0.4);
  position: relative;
  overflow: hidden;
}

.start-button::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.3), transparent);
  transition: left 0.5s;
}

.start-button:hover::before {
  left: 100%;
}

.start-button:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 15px 35px -5px rgba(240, 101, 67, 0.6),
              0 12px 24px -8px rgba(240, 157, 81, 0.5),
              0 0 30px 0 rgba(240, 101, 67, 0.25);
}

.start-button:active:not(:disabled) {
  transform: translateY(0);
}

.start-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  box-shadow: 0 4px 12px 0 rgba(240, 101, 67, 0.2);
}

.button-icon {
  width: 1.25rem;
  height: 1.25rem;
}

/* Chips de sugerencias */
.suggestions-chips {
  margin-top: 2rem;
  padding-top: 1.5rem;
  border-top: 1px solid #e5e7eb;
}

.chips-label {
  margin: 0 0 1rem 0;
  color: #6b7280;
  font-weight: 500;
  font-size: 0.9rem;
}

.chips-container {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
}

.chip {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.625rem 1.125rem;
  background: var(--chip-bg, #F1F5F9);
  color: var(--chip-text, #475569);
  border: 2px solid transparent;
  border-radius: 9999px;
  font-weight: 500;
  font-size: 0.9rem;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 2px 4px rgba(240, 101, 67, 0.08);
}

.chip:hover {
  background: linear-gradient(135deg, #F06543 0%, #F09D51 100%);
  color: white;
  border-color: transparent;
  transform: translateY(-2px) scale(1.05);
  box-shadow: 0 8px 20px rgba(240, 101, 67, 0.4),
              0 4px 12px rgba(240, 157, 81, 0.2);
}

.chip-emoji {
  font-size: 1.1rem;
}

.spinner {
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

/* Contenido de estudio */
.study-content {
  margin-top: 2rem;
  padding: 2rem;
  background: #f9fafb;
  border-radius: 0.75rem;
  border: 2px solid #e5e7eb;
}

.content-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
}

.content-header h3 {
  font-size: 1.25rem;
  font-weight: 700;
  color: #1f2937;
}

.clear-button {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.5rem 1rem;
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 0.5rem;
  color: #6b7280;
  cursor: pointer;
  transition: all 0.2s;
}

.clear-button:hover {
  background: #f3f4f6;
  color: #374151;
}

.icon-sm {
  width: 1rem;
  height: 1rem;
}

.explanation-content {
  color: #374151;
  line-height: 1.8;
  margin-bottom: 1.5rem;
}

.explanation-content :deep(p),
.explanation-content :deep(.content-paragraph) {
  margin-bottom: 1rem;
  text-align: justify;
}

.explanation-content :deep(strong) {
  color: #F06543;
  font-weight: 600;
}

.explanation-content :deep(ul),
.explanation-content :deep(.content-list) {
  margin: 1rem 0;
  padding-left: 1.5rem;
  list-style-type: disc;
}

.explanation-content :deep(li) {
  margin-bottom: 0.5rem;
  line-height: 1.6;
}

.explanation-content :deep(.markdown-heading) {
  color: #1f2937;
  font-weight: 600;
  margin-top: 1.5rem;
  margin-bottom: 1rem;
}

.explanation-content :deep(h2.markdown-heading) {
  font-size: 1.5rem;
  color: #F06543;
  border-bottom: 2px solid #F06543;
  padding-bottom: 0.5rem;
}

.explanation-content :deep(h3.markdown-heading) {
  font-size: 1.25rem;
  color: #E9724D;
}

.explanation-content :deep(h4.markdown-heading) {
  font-size: 1.1rem;
  color: #4b5563;
}

.explanation-content :deep(br) {
  content: "";
  display: block;
  margin: 0.5rem 0;
}

/* Secciones de puntos clave y ejemplos */
.key-points-section,
.examples-section {
  margin-top: 1.5rem;
  padding: 1.5rem;
  background: linear-gradient(135deg, #FFF5F1 0%, #FFFAF7 100%);
  border-left: 4px solid #F06543;
  border-radius: 0.75rem;
}

.section-title {
  margin: 0 0 1rem 0;
  color: #F06543;
  font-size: 1.1rem;
  font-weight: 700;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.key-points-list,
.examples-list {
  margin: 0;
  padding-left: 1.5rem;
  list-style-type: none;
}

.key-points-list li,
.examples-list li {
  position: relative;
  margin-bottom: 0.75rem;
  padding-left: 0.5rem;
  color: #374151;
  line-height: 1.6;
}

.key-points-list li::before {
  content: "✓";
  position: absolute;
  left: -1.25rem;
  color: #10b981;
  font-weight: bold;
}

.examples-list li::before {
  content: "→";
  position: absolute;
  left: -1.25rem;
  color: #667eea;
  font-weight: bold;
}

.examples-section {
  background: linear-gradient(135deg, #F0F4FF 0%, #F8FAFF 100%);
  border-left-color: #667eea;
}

.examples-section .section-title {
  color: #667eea;
}

/* Chips de tareas */
.task-chip {
  border: 2px solid #e5e7eb !important;
}

.task-chip.priority-urgent {
  border-color: #ef4444 !important;
  background: #FEE2E2 !important;
  color: #991b1b !important;
}

.task-chip.priority-high {
  border-color: #f59e0b !important;
  background: #FEF3C7 !important;
  color: #92400e !important;
}

.task-chip.priority-medium {
  border-color: #3b82f6 !important;
  background: #DBEAFE !important;
  color: #1e40af !important;
}

.task-chip.priority-low {
  border-color: #6b7280 !important;
  background: #F3F4F6 !important;
  color: #374151 !important;
}

.exam-actions {
  margin-top: 1.5rem;
  padding-top: 1.5rem;
  border-top: 2px solid #e5e7eb;
}

.exam-button {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.875rem 1.5rem;
  background: #10b981;
  color: white;
  border: none;
  border-radius: 0.5rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.exam-button:hover:not(:disabled) {
  background: #059669;
  transform: translateY(-2px);
  box-shadow: 0 10px 20px rgba(16, 185, 129, 0.3);
}

.exam-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* Análisis de PDF */
.pdf-analysis-section {
  margin-top: 2rem;
}

.error-message {
  display: flex;
  align-items: flex-start;
  gap: 1rem;
  padding: 1.5rem;
  background: #FEF2F2;
  border: 2px solid #FCA5A5;
  border-radius: 0.75rem;
  margin-bottom: 2rem;
  position: relative;
}

.error-icon {
  width: 1.5rem;
  height: 1.5rem;
  color: #DC2626;
  flex-shrink: 0;
  margin-top: 0.125rem;
}

.error-content {
  flex: 1;
}

.error-content h4 {
  margin: 0 0 0.5rem 0;
  font-size: 1rem;
  font-weight: 600;
  color: #991B1B;
}

.error-content p {
  margin: 0;
  color: #7F1D1D;
  line-height: 1.6;
  font-size: 0.925rem;
}

.close-error {
  position: absolute;
  top: 1rem;
  right: 1rem;
  background: none;
  border: none;
  cursor: pointer;
  color: #991B1B;
  padding: 0.25rem;
  border-radius: 0.25rem;
  transition: background 0.2s;
}

.close-error:hover {
  background: rgba(220, 38, 38, 0.1);
}

.icon-sm {
  width: 1.25rem;
  height: 1.25rem;
}

.analysis-card {
  border: 2px solid #e5e7eb;
  border-top: 4px solid #F06543;
  border-radius: 1rem;
  overflow: hidden;
}

.card-header {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1.5rem;
  background: linear-gradient(135deg, #F06543 0%, #F09D51 100%);
  color: white;
}

.header-icon {
  width: 2rem;
  height: 2rem;
}

.card-header h3 {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 700;
}

.analysis-content {
  padding: 2rem;
}

.section-title {
  font-size: 1.125rem;
  font-weight: 700;
  color: #1f2937;
  margin-bottom: 1rem;
}

.summary-section,
.topics-section,
.concepts-section,
.explanation-section {
  margin-bottom: 2rem;
  padding-bottom: 2rem;
  border-bottom: 1px solid #e5e7eb;
}

.explanation-section {
  border-bottom: none;
}

.summary-text {
  color: #4b5563;
  line-height: 1.8;
}

.topics-list {
  list-style: none;
  padding: 0;
  display: grid;
  gap: 0.75rem;
}

.topics-list li {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: #374151;
  font-weight: 500;
}

.topic-icon {
  width: 1.25rem;
  height: 1.25rem;
  color: #10b981;
  flex-shrink: 0;
}

.concepts-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 1rem;
}

.concept-card {
  padding: 1rem;
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 0.5rem;
}

.concept-card h5 {
  margin: 0 0 0.5rem 0;
  color: #667eea;
  font-weight: 600;
}

.concept-card p {
  margin: 0;
  color: #6b7280;
  font-size: 0.875rem;
  line-height: 1.5;
}

.explanation-text {
  color: #374151;
  line-height: 1.8;
}

.explanation-text :deep(p),
.explanation-text :deep(.content-paragraph) {
  margin-bottom: 1rem;
  text-align: justify;
}

.explanation-text :deep(strong) {
  color: #F06543;
  font-weight: 600;
}

.explanation-text :deep(ul),
.explanation-text :deep(.content-list) {
  margin: 1rem 0;
  padding-left: 1.5rem;
  list-style-type: disc;
}

.explanation-text :deep(li) {
  margin-bottom: 0.5rem;
  line-height: 1.6;
}

.explanation-text :deep(.markdown-heading) {
  color: #1f2937;
  font-weight: 600;
  margin-top: 1.5rem;
  margin-bottom: 1rem;
}

.explanation-text :deep(h2.markdown-heading) {
  font-size: 1.5rem;
  color: #F06543;
  border-bottom: 2px solid #F06543;
  padding-bottom: 0.5rem;
}

.explanation-text :deep(h3.markdown-heading) {
  font-size: 1.25rem;
  color: #E9724D;
}

.explanation-text :deep(h4.markdown-heading) {
  font-size: 1.1rem;
  color: #4b5563;
}

.explanation-text :deep(br) {
  content: "";
  display: block;
  margin: 0.5rem 0;
}

.pdf-actions {
  display: flex;
  gap: 1rem;
  padding: 1.5rem;
  background: #f9fafb;
  border-top: 1px solid #e5e7eb;
}

.action-button {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.875rem 1.5rem;
  border: none;
  border-radius: 0.5rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.action-button.primary {
  background: #10b981;
  color: white;
}

.action-button.primary:hover:not(:disabled) {
  background: #059669;
  transform: translateY(-2px);
  box-shadow: 0 10px 20px rgba(16, 185, 129, 0.3);
}

.action-button.secondary {
  background: white;
  color: #6b7280;
  border: 2px solid #e5e7eb;
}

.action-button.secondary:hover {
  background: #f9fafb;
  color: #374151;
}

.action-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* Historial de exámenes */
.exam-history {
  margin-top: 2rem;
}

.history-title {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  font-size: 1.25rem;
  font-weight: 700;
  color: #1f2937;
  margin-bottom: 1.5rem;
}

.title-icon {
  width: 1.5rem;
  height: 1.5rem;
  flex-shrink: 0;
}

.history-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 1rem;
}

.history-card {
  padding: 1.5rem;
  background: #f9fafb;
  border: 2px solid #e5e7eb;
  border-radius: 0.75rem;
  transition: all 0.2s;
}

.history-card:hover {
  border-color: #F06543;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
}

.exam-info h4 {
  margin: 0 0 0.25rem 0;
  color: #1f2937;
  font-weight: 600;
}

.exam-date {
  margin: 0;
  color: #6b7280;
  font-size: 0.875rem;
}

.exam-score {
  margin: 1rem 0;
  padding: 1rem;
  border-radius: 0.5rem;
  text-align: center;
}

.exam-score.excellent {
  background: #d1fae5;
  color: #065f46;
}

.exam-score.good {
  background: #dbeafe;
  color: #1e40af;
}

.exam-score.regular {
  background: #fef3c7;
  color: #92400e;
}

.exam-score.poor {
  background: #fee2e2;
  color: #991b1b;
}

.score-number {
  display: block;
  font-size: 2rem;
  font-weight: 700;
}

.score-label {
  display: block;
  font-size: 0.875rem;
  font-weight: 600;
  margin-top: 0.25rem;
}

.view-button {
  width: 100%;
  padding: 0.625rem;
  background: white;
  border: 2px solid #e5e7eb;
  border-radius: 0.5rem;
  font-weight: 600;
  color: #667eea;
  cursor: pointer;
  transition: all 0.2s;
}

.view-button:hover {
  background: #667eea;
  color: white;
  border-color: #667eea;
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

.empty-state p {
  color: #9ca3af;
}

/* Responsive */
@media (max-width: 1024px) {
  .dashboard-layout {
    grid-template-columns: 1fr;
  }
  
  .tools-sidebar {
    position: relative;
    top: 0;
    order: 2;
  }
  
  .main-content {
    order: 1;
  }
}

@media (max-width: 768px) {
  .study-mode-view {
    padding: 1rem 0.5rem;
  }

  .page-header {
    padding: 1.5rem;
  }

  .header-content {
    flex-direction: column;
    align-items: flex-start;
  }

  .page-title {
    font-size: 1.5rem;
  }

  .page-icon {
    width: 2rem;
    height: 2rem;
  }

  .tabs-container {
    flex-direction: column;
    width: 100%;
  }

  .tab {
    width: 100%;
    justify-content: center;
  }
  
  .pomodoro-card {
    padding: 1rem;
  }
  
  .time {
    font-size: 2rem;
  }

  .header-with-icon {
    flex-direction: column;
    align-items: center;
    text-align: center;
  }

  .icon-circle {
    width: 48px;
    height: 48px;
  }

  .birrete-icon {
    width: 28px;
    height: 28px;
  }

  .chips-container {
    justify-content: center;
  }

  .tab-content {
    padding: 1.5rem;
  }

  .pdf-actions {
    flex-direction: column;
  }

  .input-wrapper {
    margin-bottom: 1rem;
  }

  .topic-input {
    padding: 1rem 1rem 1rem 3.25rem;
    font-size: 1rem;
  }

  .concepts-grid {
    grid-template-columns: 1fr;
  }

  .history-grid {
    grid-template-columns: 1fr;
  }
}

/* Modal de Mapa Mental */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 2rem;
}

.modal-content {
  max-width: 90vw;
  max-height: 90vh;
  width: 100%;
  overflow: auto;
}

/* Transición del modal */
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.3s ease;
}

.modal-enter-active .modal-content,
.modal-leave-active .modal-content {
  transition: transform 0.3s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-from .modal-content,
.modal-leave-to .modal-content {
  transform: scale(0.9);
}

/* Botón de Mapa Mental */
.mindmap-button {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.875rem 1.5rem;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  border-radius: 0.5rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  margin-top: 0.75rem;
}

.mindmap-button:hover:not(:disabled) {
  background: linear-gradient(135deg, #5568d3 0%, #653a8a 100%);
  transform: translateY(-2px);
  box-shadow: 0 10px 20px rgba(102, 126, 234, 0.4);
}

.mindmap-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.action-button.mindmap {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.action-button.mindmap:hover:not(:disabled) {
  background: linear-gradient(135deg, #5568d3 0%, #653a8a 100%);
  transform: translateY(-2px);
  box-shadow: 0 10px 20px rgba(102, 126, 234, 0.4);
}

.action-button.mindmap:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
</style>
