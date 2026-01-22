<template>
  <div class="pdf-uploader">
    <div class="uploader-card">
      <div class="uploader-content">
        <!-- Área de drop -->
        <div
          @drop.prevent="handleDrop"
          @dragover.prevent="isDragging = true"
          @dragleave.prevent="isDragging = false"
          :class="['drop-zone', { dragging: isDragging, 'has-file': selectedFile }]"
        >
          <input
            ref="fileInput"
            type="file"
            accept=".pdf"
            @change="handleFileSelect"
            class="file-input"
          />

          <div v-if="!selectedFile" class="drop-zone-content">
            <DocumentArrowUpIcon class="upload-icon" />
            <h3>Arrastra tu PDF aquí</h3>
            <p>o</p>
            <button @click="triggerFileInput" class="browse-button">
              Seleccionar archivo
            </button>
            <p class="file-info">Solo archivos PDF • Máximo 5MB</p>
          </div>

          <div v-else class="file-preview">
            <DocumentCheckIcon class="file-icon" />
            <div class="file-details">
              <h4>{{ selectedFile.name }}</h4>
              <p>{{ formatFileSize(selectedFile.size) }}</p>
            </div>
            <button @click="removeFile" class="remove-button">
              <XMarkIcon class="icon" />
            </button>
          </div>
        </div>

        <!-- Progreso de extracción -->
        <div v-if="extracting" class="extraction-progress">
          <div class="progress-content">
            <div class="spinner"></div>
            <div>
              <p class="progress-title">Extrayendo texto del PDF...</p>
              <p class="progress-subtitle">{{ extractionProgress }}%</p>
            </div>
          </div>
          <div class="progress-bar">
            <div class="progress-fill" :style="{ width: `${extractionProgress}%` }"></div>
          </div>
        </div>

        <!-- Errores -->
        <div v-if="error" class="error-message">
          <ExclamationCircleIcon class="error-icon" />
          <p>{{ error }}</p>
        </div>

        <!-- Botón de análisis -->
        <button
          v-if="selectedFile && !extracting"
          @click="analyzeFile"
          :disabled="loading"
          class="analyze-button"
        >
          <SparklesIcon v-if="!loading" class="button-icon" />
          <span class="spinner-sm" v-else></span>
          {{ loading ? 'Analizando...' : 'Analizar documento con IA' }}
        </button>
      </div>

      <!-- Vista previa de texto extraído (opcional, para debug) -->
      <div v-if="extractedText && showPreview" class="text-preview">
        <div class="preview-header">
          <h4>Texto extraído</h4>
          <button @click="showPreview = false" class="close-preview">
            <XMarkIcon class="icon-sm" />
          </button>
        </div>
        <pre class="preview-content">{{ extractedText.substring(0, 500) }}...</pre>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import {
  DocumentArrowUpIcon,
  DocumentCheckIcon,
  XMarkIcon,
  SparklesIcon,
  ExclamationCircleIcon
} from '@heroicons/vue/24/outline'

// Props
interface Props {
  loading?: boolean
}

withDefaults(defineProps<Props>(), {
  loading: false
})

// Emits
const emit = defineEmits<{
  'pdf-uploaded': [file: File]
  'pdf-analyzed': [file: File, text: string]
}>()

// Estado
const fileInput = ref<HTMLInputElement | null>(null)
const selectedFile = ref<File | null>(null)
const isDragging = ref(false)
const extracting = ref(false)
const extractionProgress = ref(0)
const extractedText = ref<string>('')
const error = ref<string | null>(null)
const showPreview = ref(false)

/**
 * Maneja la selección de archivo desde el input
 */
function handleFileSelect(event: Event) {
  const input = event.target as HTMLInputElement
  if (input.files && input.files[0]) {
    processFile(input.files[0])
  }
}

/**
 * Maneja el drop de archivo
 */
function handleDrop(event: DragEvent) {
  isDragging.value = false
  
  const files = event.dataTransfer?.files
  if (files && files[0]) {
    processFile(files[0])
  }
}

/**
 * Procesa el archivo seleccionado
 */
function processFile(file: File) {
  error.value = null

  // Validar tipo
  if (file.type !== 'application/pdf') {
    error.value = 'Solo se permiten archivos PDF'
    return
  }

  // Validar tamaño (5MB)
  if (file.size > 5 * 1024 * 1024) {
    error.value = 'El archivo no debe superar 5MB'
    return
  }

  selectedFile.value = file
  emit('pdf-uploaded', file)
}

/**
 * Extrae texto del PDF usando PDF.js
 */
/**
 * Detecta si el texto extraído tiene caracteres corruptos
 */
function isTextCorrupted(text: string): boolean {
  const sample = text.substring(0, 500)
  // Contar caracteres raros o repetición de patrones corruptos
  const strangeChars = (sample.match(/[^\x20-\x7E\u00A0-\u024F\u1E00-\u1EFF\n]/g) || []).length
  const strangeRatio = strangeChars / sample.length
  
  // Si más del 20% son caracteres extraños, está corrupto
  return strangeRatio > 0.2
}

/**
 * Extrae texto de PDF - intenta múltiples estrategias
 */
async function extractTextFromPDF(file: File): Promise<string> {
  extracting.value = true
  extractionProgress.value = 0

  try {
    console.log('Extrayendo texto del PDF...')
    
    // Leer archivo como ArrayBuffer
    const arrayBuffer = await file.arrayBuffer()
    
    extractionProgress.value = 30
    
    // ESTRATEGIA 1: Usar unpdf (rápido y simple)
    try {
      const { extractText } = await import('unpdf')
      const result = await extractText(arrayBuffer, {
        mergePages: false
      })
      
      // unpdf puede devolver array de páginas o texto completo
      const text = Array.isArray(result.text) ? result.text.join('\n\n') : result.text
      
      // Si el texto no está corrupto, usarlo
      if (text && !isTextCorrupted(text)) {
        extractionProgress.value = 100
        console.log(`✅ Texto extraído con unpdf: ${text.length} caracteres`)
        return text.trim()
      } else {
        console.warn('⚠️ Texto de unpdf está corrupto, intentando PDF.js...')
      }
    } catch (unpdfError) {
      console.warn('Error con unpdf:', unpdfError)
    }
    
    // ESTRATEGIA 2: PDF.js con extracción página por página
    extractionProgress.value = 50
    console.log('Usando PDF.js como fallback...')
    
    const pdfjsLib = await import('pdfjs-dist')
    const pdfjsWorker = await import('pdfjs-dist/build/pdf.worker.min.mjs?url')
    pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker.default
    
    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer })
    const pdf = await loadingTask.promise
    
    let fullText = ''
    
    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum)
      const textContent = await page.getTextContent()
      
      // Agrupar por líneas
      const lines: Map<number, string[]> = new Map()
      
      for (const item of textContent.items) {
        if ('str' in item && item.str.trim()) {
          const y = Math.round(item.transform[5])
          if (!lines.has(y)) lines.set(y, [])
          lines.get(y)!.push(item.str.trim())
        }
      }
      
      // Ordenar y unir
      const pageText = Array.from(lines.entries())
        .sort((a, b) => b[0] - a[0])
        .map(([_, texts]) => texts.join(' '))
        .join('\n')
      
      fullText += `--- Diapositiva ${pageNum} ---\n${pageText}\n\n`
      extractionProgress.value = 50 + Math.floor((pageNum / pdf.numPages) * 50)
    }
    
    extractionProgress.value = 100
    
    if (!fullText.trim()) {
      throw new Error('No se pudo extraer texto. El PDF podría ser una imagen escaneada sin OCR.')
    }
    
    console.log(`✅ Texto extraído con PDF.js: ${fullText.length} caracteres`)
    return fullText.trim()
    
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Error al extraer texto del PDF'
    console.error('Error:', err)
    throw err
  } finally {
    extracting.value = false
  }
}

/**
 * Analiza el archivo con IA
 */
async function analyzeFile() {
  if (!selectedFile.value) return

  error.value = null

  try {
    // Extraer texto del PDF
    const text = await extractTextFromPDF(selectedFile.value)
    
    if (!text) {
      error.value = 'No se pudo extraer texto del PDF'
      return
    }

    extractedText.value = text
    emit('pdf-analyzed', selectedFile.value, text)
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Error al analizar el PDF'
    console.error('Error:', err)
  }
}

/**
 * Remueve el archivo seleccionado
 */
function removeFile() {
  selectedFile.value = null
  extractedText.value = ''
  error.value = null
  if (fileInput.value) {
    fileInput.value.value = ''
  }
}

/**
 * Abre el selector de archivos
 */
function triggerFileInput() {
  fileInput.value?.click()
}

/**
 * Formatea el tamaño del archivo
 */
function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
}
</script>

<style scoped>
.pdf-uploader {
  width: 100%;
}

.uploader-card {
  background: white;
  border-radius: 1rem;
  overflow: hidden;
}

.uploader-content {
  padding: 2rem;
}

/* Drop Zone */
.drop-zone {
  border: 3px dashed #d1d5db;
  border-radius: 1rem;
  padding: 3rem 2rem;
  text-align: center;
  transition: all 0.3s;
  cursor: pointer;
  position: relative;
}

.drop-zone:hover {
  border-color: #667eea;
  background: #f9fafb;
}

.drop-zone.dragging {
  border-color: #667eea;
  background: #eef2ff;
  transform: scale(1.02);
}

.drop-zone.has-file {
  border-color: #10b981;
  background: #f0fdf4;
}

.file-input {
  display: none;
}

.drop-zone-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
}

.upload-icon {
  width: 4rem;
  height: 4rem;
  color: #9ca3af;
}

.drop-zone-content h3 {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 600;
  color: #374151;
}

.drop-zone-content p {
  margin: 0;
  color: #6b7280;
}

.browse-button {
  padding: 0.75rem 1.5rem;
  background: #667eea;
  color: white;
  border: none;
  border-radius: 0.5rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.browse-button:hover {
  background: #5568d3;
  transform: translateY(-2px);
  box-shadow: 0 10px 20px rgba(102, 126, 234, 0.3);
}

.file-info {
  font-size: 0.875rem;
  color: #9ca3af;
}

/* File Preview */
.file-preview {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.file-icon {
  width: 3rem;
  height: 3rem;
  color: #10b981;
  flex-shrink: 0;
}

.file-details {
  flex: 1;
  text-align: left;
}

.file-details h4 {
  margin: 0 0 0.25rem 0;
  font-size: 1rem;
  font-weight: 600;
  color: #1f2937;
}

.file-details p {
  margin: 0;
  font-size: 0.875rem;
  color: #6b7280;
}

.remove-button {
  width: 2.5rem;
  height: 2.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #fee2e2;
  border: none;
  border-radius: 0.5rem;
  color: #dc2626;
  cursor: pointer;
  transition: all 0.2s;
  flex-shrink: 0;
}

.remove-button:hover {
  background: #fecaca;
  transform: scale(1.1);
}

.icon {
  width: 1.25rem;
  height: 1.25rem;
}

/* Extraction Progress */
.extraction-progress {
  margin-top: 1.5rem;
  padding: 1.5rem;
  background: #f9fafb;
  border-radius: 0.75rem;
  border: 1px solid #e5e7eb;
}

.progress-content {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1rem;
}

.spinner {
  width: 2rem;
  height: 2rem;
  border: 3px solid #e5e7eb;
  border-top-color: #667eea;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.progress-title {
  margin: 0;
  font-weight: 600;
  color: #374151;
}

.progress-subtitle {
  margin: 0.25rem 0 0 0;
  font-size: 0.875rem;
  color: #6b7280;
}

.progress-bar {
  width: 100%;
  height: 0.5rem;
  background: #e5e7eb;
  border-radius: 9999px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);
  transition: width 0.3s;
}

/* Error Message */
.error-message {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-top: 1rem;
  padding: 1rem;
  background: #fee2e2;
  border: 1px solid #fecaca;
  border-radius: 0.5rem;
  color: #dc2626;
}

.error-icon {
  width: 1.5rem;
  height: 1.5rem;
  flex-shrink: 0;
}

.error-message p {
  margin: 0;
  font-weight: 500;
}

/* Analyze Button */
.analyze-button {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  margin-top: 1.5rem;
  padding: 1rem 1.5rem;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  border-radius: 0.5rem;
  font-weight: 600;
  font-size: 1rem;
  cursor: pointer;
  transition: all 0.2s;
}

.analyze-button:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 10px 20px rgba(102, 126, 234, 0.4);
}

.analyze-button:disabled {
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
  animation: spin 0.6s linear infinite;
}

/* Text Preview */
.text-preview {
  margin-top: 2rem;
  border-top: 1px solid #e5e7eb;
  padding-top: 2rem;
}

.preview-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.preview-header h4 {
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
  color: #374151;
}

.close-preview {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  background: transparent;
  border: 1px solid #e5e7eb;
  border-radius: 0.375rem;
  cursor: pointer;
  transition: all 0.2s;
}

.close-preview:hover {
  background: #f3f4f6;
}

.icon-sm {
  width: 1rem;
  height: 1rem;
  color: #6b7280;
}

.preview-content {
  padding: 1rem;
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 0.5rem;
  font-size: 0.875rem;
  color: #4b5563;
  max-height: 300px;
  overflow-y: auto;
  white-space: pre-wrap;
  word-wrap: break-word;
}

/* Responsive */
@media (max-width: 768px) {
  .uploader-content {
    padding: 1.5rem;
  }

  .drop-zone {
    padding: 2rem 1rem;
  }

  .upload-icon {
    width: 3rem;
    height: 3rem;
  }

  .drop-zone-content h3 {
    font-size: 1rem;
  }
}
</style>
