/**
 * Composable para gestión del Modo Estudio
 * Sistema de respaldo: Groq (primario) → Ollama (fallback)
 */

import { ref } from 'vue'
import { 
  studyTopicWithOllama,
  generateExamWithOllama,
  analyzePDFWithOllama,
  answerQuestionWithOllama,
  generateOllamaEmbedding
} from '@/services/ollama'
import {
  studyTopicWithGroq,
  generateMindMapWithGroq,
  GroqError
} from '@/services/groq'
import { 
  splitTextIntoChunks,
  searchEducationalResources
} from '@/services/gemini'
import { generateMindMap } from '@/services/mindmap'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/auth'

export interface FreeStudyContent {
  explanation: string
  keyPoints: string[]
  examples?: string[]
}

export interface PDFAnalysis {
  fileName: string
  summary: string
  mainTopics: string[]
  keyConcepts: {
    term: string
    definition: string
  }[]
  explanation: string
}

export interface ExamQuestion {
  id: number
  type: 'multiple-choice' | 'true-false' | 'short-answer' | 'essay'
  question: string
  options?: string[] // Para multiple-choice
  correctAnswer: string | string[]
  explanation: string
  difficulty: 'easy' | 'medium' | 'hard'
  points: number
}

export interface Exam {
  id: string
  topic: string
  source: 'free' | 'pdf'
  questions: ExamQuestion[]
  totalPoints: number
  timeLimit?: number // en minutos
  createdAt: string
}

export interface ExamResult {
  examId: string
  score: number
  percentage: number
  answeredQuestions: number
  correctAnswers: number
  incorrectAnswers: number
  details: {
    questionId: number
    userAnswer: string | string[]
    correctAnswer: string | string[]
    isCorrect: boolean
    points: number
  }[]
  completedAt: string
}

export interface ExamHistory {
  id: string
  topic: string
  date: string
  score: number
  totalQuestions: number
}

export interface EducationalResources {
  videos: Array<{ title: string; description: string; url: string }>
  documents: Array<{ title: string; description: string; type: string }>
  websites: Array<{ title: string; description: string; url: string }>
}

export interface PomodoroSession {
  isActive: boolean
  isPaused: boolean
  isBreak: boolean
  timeRemaining: number // segundos
  sessionCount: number
}

export function useStudyMode() {
  const authStore = useAuthStore()

  // Estados
  const loadingFreeStudy = ref(false)
  const loadingPDF = ref(false)
  const loadingExam = ref(false)
  const loadingResources = ref(false)
  const loadingMindMap = ref(false)
  const errorFreeStudy = ref<string | null>(null)
  const errorPDF = ref<string | null>(null)
  const errorExam = ref<string | null>(null)
  const errorMindMap = ref<string | null>(null)

  // Contenidos
  const freeStudyContent = ref<FreeStudyContent | null>(null)
  const pdfAnalysis = ref<PDFAnalysis | null>(null)
  const currentExam = ref<Exam | null>(null)
  const currentExamResult = ref<ExamResult | null>(null)
  const examHistory = ref<ExamHistory[]>([])
  const educationalResources = ref<EducationalResources | null>(null)
  const currentMindMap = ref<string | null>(null)
  const currentMindMapImage = ref<string | null>(null) // Para imágenes de Gemini Imagen
  const mindMapService = ref<'groq' | 'ollama' | null>(null) // Rastrear servicio usado
  
  // Pomodoro
  const pomodoroSession = ref<PomodoroSession>({
    isActive: false,
    isPaused: false,
    isBreak: false,
    timeRemaining: 25 * 60, // 25 minutos
    sessionCount: 0
  })
  let pomodoroTimer: number | null = null

  /**
   * Estudiar un tema libre con respaldo automático
   * Intenta con Groq primero, si falla usa Ollama local
   */
  async function studyFreeTopic(topic: string): Promise<void> {
    loadingFreeStudy.value = true
    errorFreeStudy.value = null
    freeStudyContent.value = null

    try {
      // Intentar primero con Groq (más rápido)
      console.log('🚀 Intentando generar con Groq...')
      const result = await studyTopicWithGroq(topic)
      console.log('✅ Generado con Groq exitosamente')
      freeStudyContent.value = result
    } catch (groqError) {
      // Si falla Groq, usar Ollama como respaldo
      if (groqError instanceof GroqError && groqError.isRateLimitError) {
        console.warn('⚠️ Límite de Groq alcanzado, cambiando a Ollama...')
      } else {
        console.warn('⚠️ Error con Groq, cambiando a Ollama...', groqError)
      }
      
      try {
        const result = await studyTopicWithOllama(topic)
        console.log('✅ Generado con Ollama (respaldo)')
        freeStudyContent.value = result
      } catch (ollamaError) {
        errorFreeStudy.value = ollamaError instanceof Error 
          ? ollamaError.message 
          : 'Error al estudiar el tema'
        console.error('❌ Error con ambos servicios:', ollamaError)
      }
    } finally {
      loadingFreeStudy.value = false
    }
  }

  /**
   * Analizar contenido de un PDF usando RAG
   * Divide el texto en chunks, genera embeddings y almacena en Supabase
   */
  async function analyzePDF(file: File, extractedText: string): Promise<void> {
    loadingPDF.value = true
    errorPDF.value = null
    pdfAnalysis.value = null

    try {
      console.log('🚀 Iniciando análisis con RAG...')
      
      // 1. Dividir texto en chunks
      const chunks = splitTextIntoChunks(extractedText, 1000, 200)
      console.log(`📄 Texto dividido en ${chunks.length} chunks`)

      // 2. Generar análisis preliminar (solo con muestra) usando Ollama
      const analysis = await analyzePDFWithOllama(chunks, file.name)
      pdfAnalysis.value = {
        ...analysis,
        explanation: analysis.summary // Usar summary como explanation inicial
      }

      // 3. Subir PDF a Supabase Storage
      const fileName = `${Date.now()}_${file.name}`
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('study-pdfs')
        .upload(fileName, file)

      if (uploadError) {
        console.warn('⚠️ No se pudo subir el PDF a storage:', uploadError)
      }

      // 4. Guardar sesión en base de datos
      let sessionId: string | null = null
      if (authStore.user) {
        const { data: sessionData, error: sessionError } = await supabase
          .from('study_sessions')
          .insert({
            user_id: authStore.user.id,
            type: 'pdf',
            topic: file.name,
            content: JSON.stringify(analysis),
            pdf_url: uploadData?.path || null,
            uses_rag: true,
            total_chunks: chunks.length
          })
          .select()
          .single()

        if (sessionError) {
          console.warn('⚠️ Error guardando sesión:', sessionError)
        } else {
          sessionId = sessionData?.id
        }
      }

      // 5. Generar embeddings y guardar chunks (en background) usando Ollama
      console.log('🧠 Generando embeddings de chunks con Ollama...')
      
      // Procesar chunks en lotes pequeños
      const batchSize = 5
      for (let i = 0; i < chunks.length; i += batchSize) {
        const batch = chunks.slice(i, Math.min(i + batchSize, chunks.length))
        
        await Promise.all(
          batch.map(async (chunk, localIndex) => {
            try {
              const chunkIndex = i + localIndex
              const embedding = await generateOllamaEmbedding(chunk)
              
              if (authStore.user) {
                await supabase.from('pdf_chunks').insert({
                  user_id: authStore.user.id,
                  session_id: sessionId,
                  pdf_name: file.name,
                  chunk_index: chunkIndex,
                  content: chunk,
                  embedding: embedding,
                  token_count: Math.ceil(chunk.length / 4) // Aproximación
                })
              }
              
              console.log(`✅ Chunk ${chunkIndex + 1}/${chunks.length} procesado`)
            } catch (chunkError) {
              console.error(`❌ Error procesando chunk ${i + localIndex}:`, chunkError)
            }
          })
        )
        
        // Pequeña pausa entre lotes para no saturar la API
        if (i + batchSize < chunks.length) {
          await new Promise(resolve => setTimeout(resolve, 1000))
        }
      }
      
      console.log('✨ Análisis RAG completado exitosamente')
    } catch (err) {
      errorPDF.value = err instanceof Error ? err.message : 'Error al analizar el PDF'
      console.error('❌ Error analizando PDF:', err)
    } finally {
      loadingPDF.value = false
    }
  }

  /**
   * Generar examen basado en contenido usando Ollama
   */
  async function generateExam(params: {
    topic: string
    source: 'free' | 'pdf'
    content: string
    difficulty?: 'easy' | 'medium' | 'hard'
    questionCount?: number
  }): Promise<void> {
    loadingExam.value = true
    errorExam.value = null

    try {
      const exam = await generateExamWithOllama({
        topic: params.topic,
        content: params.content,
        difficulty: params.difficulty || 'medium',
        questionCount: params.questionCount || 10
      })

      currentExam.value = {
        id: `exam_${Date.now()}`,
        topic: params.topic,
        source: params.source,
        questions: exam.questions,
        totalPoints: exam.questions.reduce((sum: number, q: ExamQuestion) => sum + q.points, 0),
        timeLimit: exam.questions.length * 2, // 2 minutos por pregunta
        createdAt: new Date().toISOString()
      }

      // Guardar examen en base de datos
      if (authStore.user) {
        await supabase.from('exams').insert({
          user_id: authStore.user.id,
          topic: params.topic,
          source: params.source,
          questions: exam.questions,
          total_points: currentExam.value.totalPoints,
          created_at: currentExam.value.createdAt
        })
      }
    } catch (err) {
      errorExam.value = err instanceof Error ? err.message : 'Error al generar el examen'
      console.error('Error generando examen:', err)
    } finally {
      loadingExam.value = false
    }
  }

  /**
   * Evaluar y enviar respuestas del examen
   */
  async function submitExam(
    examId: string,
    answers: Record<number, string | string[]>
  ): Promise<ExamResult | null> {
    if (!currentExam.value) return null

    try {
      const details: ExamResult['details'] = []
      let correctAnswers = 0
      let totalPoints = 0
      let earnedPoints = 0

      currentExam.value.questions.forEach((question) => {
        const userAnswer = answers[question.id]
        const correctAnswer = question.correctAnswer
        
        // Validar que haya respuesta
        if (!userAnswer) {
          totalPoints += question.points
          details.push({
            questionId: question.id,
            userAnswer: '',
            correctAnswer,
            isCorrect: false,
            points: 0
          })
          return
        }
        
        let isCorrect = false
        if (Array.isArray(correctAnswer) && Array.isArray(userAnswer)) {
          // Respuestas múltiples
          isCorrect = correctAnswer.length === userAnswer.length &&
                     correctAnswer.every(ans => userAnswer.includes(ans))
        } else {
          // Respuesta simple
          isCorrect = userAnswer.toString().toLowerCase() === 
                     correctAnswer.toString().toLowerCase()
        }

        if (isCorrect) {
          correctAnswers++
          earnedPoints += question.points
        }

        totalPoints += question.points

        details.push({
          questionId: question.id,
          userAnswer,
          correctAnswer,
          isCorrect,
          points: isCorrect ? question.points : 0
        })
      })

      const result: ExamResult = {
        examId,
        score: earnedPoints,
        percentage: Math.round((earnedPoints / totalPoints) * 100),
        answeredQuestions: Object.keys(answers).length,
        correctAnswers,
        incorrectAnswers: currentExam.value.questions.length - correctAnswers,
        details,
        completedAt: new Date().toISOString()
      }

      currentExamResult.value = result

      // Guardar resultado en base de datos
      if (authStore.user) {
        await supabase.from('exam_results').insert({
          user_id: authStore.user.id,
          exam_id: examId,
          score: result.score,
          percentage: result.percentage,
          correct_answers: result.correctAnswers,
          incorrect_answers: result.incorrectAnswers,
          details: result.details,
          completed_at: result.completedAt
        })

        // Agregar al historial
        examHistory.value.push({
          id: examId,
          topic: currentExam.value.topic,
          date: result.completedAt,
          score: result.percentage,
          totalQuestions: currentExam.value.questions.length
        })
      }

      return result
    } catch (err) {
      console.error('Error al enviar examen:', err)
      return null
    }
  }

  /**
   * Cargar historial de exámenes
   */
  async function loadExamHistory(): Promise<void> {
    if (!authStore.user) return

    try {
      const { data, error } = await supabase
        .from('exam_results')
        .select('*')
        .eq('user_id', authStore.user.id)
        .order('completed_at', { ascending: false })
        .limit(20)

      if (error) throw error

      examHistory.value = data?.map((result: any) => ({
        id: result.exam_id,
        topic: result.exam_id, // TODO: Join con tabla exams para obtener topic
        date: result.completed_at,
        score: result.percentage,
        totalQuestions: result.details?.length || 0
      })) || []
    } catch (err) {
      console.error('Error cargando historial:', err)
    }
  }

  /**
   * Limpiar estudio libre
   */
  function clearFreeStudy(): void {
    freeStudyContent.value = null
    errorFreeStudy.value = null
  }

  /**
   * Limpiar análisis de PDF
   */
  function clearPDFAnalysis(): void {
    pdfAnalysis.value = null
    errorPDF.value = null
  }

  /**
   * Limpiar examen actual
   */
  function clearCurrentExam(): void {
    currentExam.value = null
    currentExamResult.value = null
    errorExam.value = null
  }

  /**
   * Hacer una pregunta específica sobre el PDF usando RAG con Ollama
   * Busca los chunks relevantes y genera respuesta contextualizada
   */
  async function askQuestionAboutPDF(
    question: string, 
    pdfName: string
  ): Promise<string> {
    if (!authStore.user) {
      throw new Error('Debes iniciar sesión para hacer preguntas')
    }

    try {
      // 1. Generar embedding de la pregunta usando Ollama
      const questionEmbedding = await generateOllamaEmbedding(question)

      // 2. Buscar chunks relevantes usando pgvector
      const { data: relevantChunks, error } = await supabase.rpc(
        'match_pdf_chunks',
        {
          query_embedding: questionEmbedding,
          match_user_id: authStore.user.id,
          match_pdf_name: pdfName,
          match_threshold: 0.7,
          match_count: 5
        }
      )

      if (error) {
        console.error('Error buscando chunks:', error)
        throw new Error('No se pudo buscar información relevante')
      }

      if (!relevantChunks || relevantChunks.length === 0) {
        return 'No encontré información relevante en el PDF para responder esa pregunta. Intenta reformular la pregunta o pregunta sobre otro tema del documento.'
      }

      // 3. Generar respuesta usando Ollama con los chunks relevantes
      const answer = await answerQuestionWithOllama(question, relevantChunks)
      
      return answer
    } catch (err) {
      console.error('Error respondiendo pregunta:', err)
      throw err instanceof Error ? err : new Error('Error al procesar la pregunta')
    }
  }

  /**
   * Buscar recursos educativos adicionales
   */
  async function fetchEducationalResources(topic: string): Promise<void> {
    loadingResources.value = true
    try {
      const resources = await searchEducationalResources(topic)
      educationalResources.value = resources
    } catch (err) {
      console.error('Error obteniendo recursos:', err)
      educationalResources.value = null
    } finally {
      loadingResources.value = false
    }
  }

  /**
   * Iniciar sesión Pomodoro
   */
  function startPomodoro() {
    if (pomodoroSession.value.isActive && !pomodoroSession.value.isPaused) return
    
    // Si no está activo, es un inicio nuevo
    if (!pomodoroSession.value.isActive) {
      pomodoroSession.value.isActive = true
      pomodoroSession.value.isBreak = false
      pomodoroSession.value.timeRemaining = 25 * 60 // 25 minutos
    }
    
    // Despausar y comenzar/continuar el timer
    pomodoroSession.value.isPaused = false
    
    pomodoroTimer = window.setInterval(() => {
      if (pomodoroSession.value.timeRemaining > 0) {
        pomodoroSession.value.timeRemaining--
      } else {
        // Terminar sesión de trabajo
        if (!pomodoroSession.value.isBreak) {
          pomodoroSession.value.sessionCount++
          // Iniciar descanso
          const isLongBreak = pomodoroSession.value.sessionCount % 4 === 0
          pomodoroSession.value.timeRemaining = isLongBreak ? 15 * 60 : 5 * 60
          pomodoroSession.value.isBreak = true
        } else {
          // Terminar descanso
          stopPomodoro()
        }
      }
    }, 1000)
  }

  /**
   * Pausar/Reanudar Pomodoro
   */
  function togglePomodoro() {
    if (!pomodoroSession.value.isActive) return
    
    if (pomodoroSession.value.isPaused) {
      // Reanudar
      startPomodoro()
    } else {
      // Pausar
      if (pomodoroTimer) {
        clearInterval(pomodoroTimer)
        pomodoroTimer = null
      }
      pomodoroSession.value.isPaused = true
    }
  }

  /**
   * Detener Pomodoro
   */
  function stopPomodoro() {
    if (pomodoroTimer) {
      clearInterval(pomodoroTimer)
      pomodoroTimer = null
    }
    pomodoroSession.value.isActive = false
    pomodoroSession.value.isPaused = false
    pomodoroSession.value.timeRemaining = 25 * 60
  }

  /**
   * Reiniciar Pomodoro
   */
  function resetPomodoro() {
    stopPomodoro()
    pomodoroSession.value.sessionCount = 0
  }
/**
   * Sistema de 3 niveles: Gemini Imagen → Groq → Ollama/Python
   */
  async function generateMindMapFromFreeStudy(topic: string): Promise<void> {
    if (!freeStudyContent.value) return
    
    loadingMindMap.value = true
    errorMindMap.value = null
    currentMindMapImage.value = null
    currentMindMap.value = null
    
    // NIVEL 1: Intentar con Groq (genera código Mermaid)
    try {
      console.log('🗺️ Nivel 1: Generando código Mermaid con Groq...')
      const mermaidCode = await generateMindMapWithGroq(topic, 'medium')
      console.log('✅ Código generado con Groq')
      currentMindMap.value = mermaidCode
      mindMapService.value = 'groq'
      loadingMindMap.value = false
      return
    } catch (groqError) {
      if (groqError instanceof GroqError && groqError.isRateLimitError) {
        console.warn('⚠️ Límite de Groq alcanzado, usando Ollama local...')
      } else {
        console.warn('⚠️ Error con Groq, usando Ollama local...', groqError)
      }
    }
    
    // NIVEL 2: Respaldo con Python/Ollama (local, sin límites)
    try {
      console.log('🐳 Nivel 2: Generando con Ollama local (Python)...')
      const mermaidCode = await generateMindMap({
        topic: topic,
        detail_level: 'medium'
      })
      console.log('✅ Código generado con Ollama (respaldo local)')
      currentMindMap.value = mermaidCode
      mindMapService.value = 'ollama'
    } catch (pythonError) {
      errorMindMap.value = pythonError instanceof Error 
        ? pythonError.message 
        : 'Error: Todos los servicios fallaron'
      console.error('❌ Error con los 2 niveles:', pythonError)
      loadingMindMap.value = false
    }
  }

  /**
   * Generar mapa mental desde análisis de PDF
   * Intenta con Groq primero, si falla usa el servicio Python con Ollama
   */
  async function generateMindMapFromPDF(): Promise<void> {
    if (!pdfAnalysis.value) return
    
    loadingMindMap.value = true
    errorMindMap.value = null
    
    try {
      // Crear un tema más específico para el PDF
      const topic = pdfAnalysis.value.fileName.replace('.pdf', '')
      
      // Intentar primero con Groq
      console.log('🗺️ Generando mapa mental con Groq...')
      const mermaidCode = await generateMindMapWithGroq(topic, 'detailed')
      console.log('✅ Mapa generado con Groq')
      currentMindMap.value = mermaidCode
    } catch (groqError) {
      // Si falla Groq, usar servicio Python con Ollama
      if (groqError instanceof GroqError && groqError.isRateLimitError) {
        console.warn('⚠️ Límite de Groq alcanzado, usando servicio Python...')
      } else {
        console.warn('⚠️ Error con Groq, usando servicio Python...', groqError)
      }
      
      try {
        currentMindMapImage.value = null
        const topic = `${pdfAnalysis.value.fileName}: ${pdfAnalysis.value.summary}`
        const mermaidCode = await generateMindMap({
          topic: topic,
          detail_level: 'detailed'
        })
        console.log('✅ Mapa generado con Python/Ollama (respaldo)')
        currentMindMap.value = mermaidCode
      } catch (pythonError) {
        errorMindMap.value = pythonError instanceof Error 
          ? pythonError.message 
          : 'Error al generar mapa mental'
        console.error('❌ Error con ambos servicios:', pythonError)
      }
    }
  }

  /**
   * Limpiar mapa mental actual
   */
  function clearMindMap() {
    currentMindMap.value = null
    errorMindMap.value = null
  }

  return {
    // Estados
    loadingFreeStudy,
    loadingPDF,
    loadingExam,
    loadingResources,
    loadingMindMap,
    errorFreeStudy,
    errorPDF,
    errorExam,
    errorMindMap,

    // Contenidos
    freeStudyContent,
    pdfAnalysis,
    currentExam,
    currentExamResult,
    examHistory,
    educationalResources,
    pomodoroSession,
    currentMindMapImage,
    currentMindMap,
    mindMapService,

    // Acciones
    studyFreeTopic,
    analyzePDF,
    askQuestionAboutPDF,
    generateExam,
    submitExam,
    loadExamHistory,
    fetchEducationalResources,
    startPomodoro,
    togglePomodoro,
    stopPomodoro,
    resetPomodoro,
    clearFreeStudy,
    clearPDFAnalysis,
    clearCurrentExam,
    generateMindMapFromFreeStudy,
    generateMindMapFromPDF,
    clearMindMap
  }
}
