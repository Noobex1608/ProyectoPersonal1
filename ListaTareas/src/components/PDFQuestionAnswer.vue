<template>
  <div class="pdf-qa-section">
    <div class="qa-header">
      <h4 class="section-title">❓ Pregunta sobre el documento</h4>
      <p class="section-description">
        Haz preguntas específicas sobre el contenido. Solo se analizarán las secciones relevantes.
      </p>
    </div>

    <div class="qa-input-wrapper">
      <input
        v-model="question"
        type="text"
        placeholder="Ej: ¿Qué es la fotosíntesis?"
        class="qa-input"
        @keyup.enter="submitQuestion"
        :disabled="loading"
      />
      <button
        @click="submitQuestion"
        :disabled="!question.trim() || loading"
        class="ask-button"
      >
        <SparklesIcon v-if="!loading" class="button-icon" />
        <span class="spinner-sm" v-else></span>
        {{ loading ? 'Buscando...' : 'Preguntar' }}
      </button>
    </div>

    <!-- Respuesta -->
    <div v-if="answer" class="qa-answer">
      <div class="answer-header">
        <CheckCircleIcon class="answer-icon" />
        <h5>Respuesta</h5>
      </div>
      <div class="answer-content" v-html="formattedAnswer"></div>
    </div>

    <!-- Error -->
    <div v-if="error" class="qa-error">
      <ExclamationCircleIcon class="error-icon" />
      <p>{{ error }}</p>
    </div>

    <!-- Historial de preguntas -->
    <div v-if="history.length > 0" class="qa-history">
      <h5>Preguntas anteriores</h5>
      <div 
        v-for="(item, index) in history" 
        :key="index"
        class="history-item"
        @click="selectHistoryItem(item)"
      >
        <div class="history-question">{{ item.question }}</div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { 
  SparklesIcon, 
  CheckCircleIcon, 
  ExclamationCircleIcon 
} from '@heroicons/vue/24/outline'

interface Props {
  pdfName: string
  onAsk: (question: string) => Promise<string>
}

const props = defineProps<Props>()

const question = ref('')
const answer = ref('')
const loading = ref(false)
const error = ref<string | null>(null)

interface HistoryItem {
  question: string
  answer: string
}

const history = ref<HistoryItem[]>([])

const formattedAnswer = computed(() => {
  if (!answer.value) return ''
  
  return answer.value
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/\n\n/g, '</p><p>')
    .replace(/\n/g, '<br>')
    .replace(/^(.+)$/gm, '<p>$1</p>')
})

async function submitQuestion() {
  if (!question.value.trim() || loading.value) return

  loading.value = true
  error.value = null
  answer.value = ''

  try {
    const result = await props.onAsk(question.value)
    answer.value = result
    
    // Agregar al historial
    history.value.unshift({
      question: question.value,
      answer: result
    })

    // Mantener solo las últimas 5 preguntas
    if (history.value.length > 5) {
      history.value = history.value.slice(0, 5)
    }

    question.value = ''
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Error al procesar la pregunta'
    console.error('Error en pregunta:', err)
  } finally {
    loading.value = false
  }
}

function selectHistoryItem(item: HistoryItem) {
  answer.value = item.answer
  question.value = item.question
}
</script>

<style scoped>
.pdf-qa-section {
  margin-top: 2rem;
  padding: 1.5rem;
  background: #F9FAFB;
  border-radius: 0.75rem;
  border: 2px solid #E5E7EB;
}

.qa-header {
  margin-bottom: 1.5rem;
}

.section-title {
  font-size: 1.125rem;
  font-weight: 700;
  color: #1f2937;
  margin: 0 0 0.5rem 0;
}

.section-description {
  color: #6B7280;
  font-size: 0.925rem;
  margin: 0;
}

.qa-input-wrapper {
  display: flex;
  gap: 0.75rem;
  margin-bottom: 1.5rem;
}

.qa-input {
  flex: 1;
  padding: 0.875rem 1rem;
  border: 2px solid #E5E7EB;
  border-radius: 0.5rem;
  font-size: 1rem;
  transition: all 0.2s;
}

.qa-input:focus {
  outline: none;
  border-color: #F06543;
  box-shadow: 0 0 0 3px rgba(240, 101, 67, 0.1);
}

.qa-input:disabled {
  background: #F3F4F6;
  cursor: not-allowed;
}

.ask-button {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.875rem 1.5rem;
  background: linear-gradient(135deg, #F06543 0%, #F09D51 100%);
  color: white;
  border: none;
  border-radius: 0.5rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;
}

.ask-button:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 8px 16px rgba(240, 101, 67, 0.3);
}

.ask-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.button-icon {
  width: 1.25rem;
  height: 1.25rem;
}

.spinner-sm {
  width: 1.25rem;
  height: 1.25rem;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: white;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.qa-answer {
  padding: 1.5rem;
  background: white;
  border-radius: 0.75rem;
  border-left: 4px solid #10B981;
  margin-bottom: 1rem;
}

.answer-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 1rem;
}

.answer-icon {
  width: 1.5rem;
  height: 1.5rem;
  color: #10B981;
}

.answer-header h5 {
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
  color: #1F2937;
}

.answer-content {
  color: #374151;
  line-height: 1.7;
}

.answer-content :deep(p) {
  margin: 0 0 0.75rem 0;
}

.answer-content :deep(strong) {
  color: #F06543;
  font-weight: 600;
}

.qa-error {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 1rem;
  background: #FEF2F2;
  border: 2px solid #FCA5A5;
  border-radius: 0.5rem;
  margin-bottom: 1rem;
}

.error-icon {
  width: 1.25rem;
  height: 1.25rem;
  color: #DC2626;
  flex-shrink: 0;
}

.qa-error p {
  margin: 0;
  color: #7F1D1D;
  font-size: 0.925rem;
}

.qa-history {
  margin-top: 1.5rem;
  padding-top: 1.5rem;
  border-top: 2px solid #E5E7EB;
}

.qa-history h5 {
  margin: 0 0 1rem 0;
  font-size: 0.925rem;
  font-weight: 600;
  color: #6B7280;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.history-item {
  padding: 0.75rem 1rem;
  background: white;
  border: 1px solid #E5E7EB;
  border-radius: 0.5rem;
  margin-bottom: 0.5rem;
  cursor: pointer;
  transition: all 0.2s;
}

.history-item:hover {
  border-color: #F06543;
  box-shadow: 0 2px 8px rgba(240, 101, 67, 0.1);
}

.history-question {
  color: #374151;
  font-size: 0.925rem;
}
</style>
