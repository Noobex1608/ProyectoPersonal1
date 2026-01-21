import { GoogleGenerativeAI } from '@google/generative-ai'

const apiKey = import.meta.env.VITE_GEMINI_API_KEY

if (!apiKey) {
  console.warn('⚠️ Gemini API key no configurada')
}

const genAI = new GoogleGenerativeAI(apiKey || '')

// Sistema de prompt para el asistente de tareas
const SYSTEM_PROMPT = `Eres un asistente virtual inteligente para una aplicación de gestión de tareas.

REGLA CRÍTICA: Si el usuario dice "tengo que hacer", "debo hacer", "necesito hacer", o similar, SIEMPRE debes crear una tarea en formato JSON.

FORMATO DE RESPUESTA PARA CREAR TAREAS:
Cuando el usuario quiera crear una tarea, responde SOLO con este JSON (sin texto adicional):
{
  "action": "create_task",
  "task": {
    "title": "título limpio de la tarea",
    "priority": "urgent",
    "due_date": "tomorrow"
  }
}

REGLAS PARA CREAR TAREAS:
- Si el mensaje incluye "tengo que", "debo", "necesito", "hacer", "crear", "agregar", "añadir" → CREAR TAREA
- Prioridad: "urgent" si dice urgente/importante, "high" si dice alta/prioritaria, "low" si dice baja, sino "medium"
- Fecha: "today" si dice hoy, "tomorrow" si dice mañana/pasado mañana, "null" si no especifica
- Título: Extrae la acción principal sin palabras como "tengo que", "es urgente", etc.

EJEMPLOS:
Usuario: "Tengo que hacer una tarea de modelado es urgente para pasado mañana"
Respuesta: {
  "action": "create_task",
  "task": {
    "title": "Hacer tarea de modelado",
    "priority": "urgent",
    "due_date": "tomorrow"
  }
}

Usuario: "Necesito comprar leche hoy"
Respuesta: {
  "action": "create_task",
  "task": {
    "title": "Comprar leche",
    "priority": "medium",
    "due_date": "today"
  }
}

Usuario: "Crear tarea: llamar al doctor"
Respuesta: {
  "action": "create_task",
  "task": {
    "title": "Llamar al doctor",
    "priority": "medium",
    "due_date": "null"
  }
}

SOLO RESPONDE CON TEXTO NORMAL SI:
- El usuario pregunta sobre sus tareas (¿qué tareas tengo?, ¿cuáles son urgentes?, etc.)
- El usuario pide ayuda o información
- El usuario conversa sin pedir crear nada`

export interface GeminiTaskAction {
  action: 'create_task'
  task: {
    title: string
    priority: 'low' | 'medium' | 'high' | 'urgent'
    due_date: 'today' | 'tomorrow' | null
  }
}

export async function askGemini(
  message: string,
  context?: {
    todosCount?: number
    pendingCount?: number
    urgentCount?: number
    todayCount?: number
  }
): Promise<string> {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' })

    // Construir contexto
    let contextMessage = ''
    if (context) {
      contextMessage = `\n\nCONTEXTO ACTUAL DEL USUARIO:
- Total de tareas: ${context.todosCount || 0}
- Tareas pendientes: ${context.pendingCount || 0}
- Tareas urgentes: ${context.urgentCount || 0}
- Tareas de hoy: ${context.todayCount || 0}`
    }

    const prompt = `${SYSTEM_PROMPT}${contextMessage}\n\nMensaje del usuario: "${message}"\n\nRespuesta:`

    const result = await model.generateContent(prompt)
    const response = await result.response
    const text = response.text()

    return text
  } catch (error) {
    console.error('Error calling Gemini:', error)
    throw error
  }
}

export async function askGeminiWithChat(
  messages: Array<{ role: 'user' | 'assistant', content: string }>,
  context?: {
    todosCount?: number
    pendingCount?: number
    urgentCount?: number
    todayCount?: number
  }
): Promise<string> {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })

    // Construir contexto
    let contextMessage = ''
    if (context) {
      contextMessage = `\n\nCONTEXTO ACTUAL DEL USUARIO:
- Total de tareas: ${context.todosCount || 0}
- Tareas pendientes: ${context.pendingCount || 0}
- Tareas urgentes: ${context.urgentCount || 0}
- Tareas de hoy: ${context.todayCount || 0}`
    }

    // Construir historial de chat
    const chatHistory = messages
      .slice(-6) // Últimos 6 mensajes para no exceder límites
      .map(msg => `${msg.role === 'user' ? 'Usuario' : 'Asistente'}: ${msg.content}`)
      .join('\n')

    const prompt = `${SYSTEM_PROMPT}${contextMessage}\n\nHISTORIAL DE CONVERSACIÓN:\n${chatHistory}\n\nRespuesta:`

    const result = await model.generateContent(prompt)
    const response = await result.response
    const text = response.text()

    return text
  } catch (error) {
    console.error('Error calling Gemini with chat:', error)
    throw error
  }
}

export function parseGeminiResponse(text: string): GeminiTaskAction | null {
  try {
    // Limpiar la respuesta de markdown o texto adicional
    let cleanText = text.trim()
    
    // Remover bloques de código markdown si existen
    cleanText = cleanText.replace(/```json\s*/g, '').replace(/```\s*/g, '')
    
    // Intentar extraer JSON de la respuesta (buscar el primer { hasta el último })
    const jsonMatch = cleanText.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      console.log('No se encontró JSON en la respuesta:', text)
      return null
    }

    const parsed = JSON.parse(jsonMatch[0])
    
    // Validar que tenga la estructura correcta
    if (parsed.action === 'create_task' && parsed.task && parsed.task.title) {
      console.log('✅ Acción de crear tarea detectada:', parsed.task.title)
      return parsed as GeminiTaskAction
    }
    
    console.log('JSON encontrado pero no es una acción válida:', parsed)
    return null
  } catch (error) {
    console.error('Error parseando respuesta de Gemini:', error)
    console.log('Texto recibido:', text)
    return null
  }
}

// ============================================
// NUEVAS FUNCIONES DE IA AVANZADAS
// ============================================

// Análisis de productividad
export async function analyzeProductivity(taskData: any) {
  const prompt = `Analiza la siguiente información de productividad y proporciona insights:

Datos de tareas:
- Total de tareas: ${taskData.total}
- Completadas: ${taskData.completed}
- Pendientes: ${taskData.pending}
- Por prioridad: ${JSON.stringify(taskData.byPriority)}

Tareas detalladas:
${JSON.stringify(taskData.tasks, null, 2)}

Por favor proporciona un análisis en formato JSON con:
{
  "completionRate": número (0-100),
  "averageTimeToComplete": número (días promedio),
  "mostProductiveTime": "descripción del mejor momento",
  "tasksByPriority": { "urgent": n, "high": n, "medium": n, "low": n },
  "suggestions": ["sugerencia1", "sugerencia2", "sugerencia3"],
  "trends": {
    "weeklyCompletion": [n1, n2, n3, n4, n5, n6, n7],
    "priorityDistribution": [urgent%, high%, medium%, low%]
  }
}`

  const response = await askGemini(prompt)
  const jsonMatch = response.match(/\{[\s\S]*\}/)
  if (jsonMatch) {
    return JSON.parse(jsonMatch[0])
  }
  throw new Error('No se pudo obtener análisis')
}

// Generación de subtareas
export async function generateSubtasks(taskTitle: string, taskDescription?: string) {
  const prompt = `Para la tarea "${taskTitle}"${taskDescription ? ` con descripción: ${taskDescription}` : ''}, genera subtareas específicas y accionables.

Responde en formato JSON:
{
  "subtasks": [
    {
      "title": "título corto de la subtarea",
      "description": "descripción detallada",
      "estimatedTime": "tiempo estimado (ej: 30 min, 2 horas)",
      "order": 1
    }
  ]
}

Genera entre 3-6 subtareas lógicas y ordenadas.`

  const response = await askGemini(prompt)
  const jsonMatch = response.match(/\{[\s\S]*\}/)
  if (jsonMatch) {
    const parsed = JSON.parse(jsonMatch[0])
    return parsed.subtasks
  }
  throw new Error('No se pudieron generar subtareas')
}

// Sugerencia de prioridad
export async function suggestPriority(taskTitle: string, dueDate?: string, description?: string) {
  const prompt = `Analiza la siguiente tarea y sugiere una prioridad apropiada:

Tarea: "${taskTitle}"
${dueDate ? `Fecha límite: ${dueDate}` : 'Sin fecha límite'}
${description ? `Descripción: ${description}` : ''}

Responde en formato JSON:
{
  "suggested": "urgent" | "high" | "medium" | "low",
  "reasoning": "explicación breve de por qué esta prioridad",
  "confidence": número entre 0 y 1
}

Considera:
- urgent: Fecha límite hoy o mañana, o muy crítico
- high: Importante y próximo
- medium: Importante pero no urgente
- low: Puede esperar`

  const response = await askGemini(prompt)
  const jsonMatch = response.match(/\{[\s\S]*\}/)
  if (jsonMatch) {
    return JSON.parse(jsonMatch[0])
  }
  throw new Error('No se pudo sugerir prioridad')
}

// Expansión de tareas vagas
export async function expandTask(vagueTask: string) {
  const prompt = `La tarea "${vagueTask}" es muy general. Expándela con detalles concretos y accionables.

Responde en formato JSON:
{
  "title": "título mejorado y específico",
  "description": "descripción detallada con pasos claros",
  "suggestedTags": ["tag1", "tag2", "tag3"],
  "estimatedDuration": "tiempo estimado (ej: 2 horas, 1 día)",
  "detailedSteps": ["paso 1", "paso 2", "paso 3"]
}

Haz que la tarea sea SMART (Específica, Medible, Alcanzable, Relevante, con Tiempo definido).`

  const response = await askGemini(prompt)
  const jsonMatch = response.match(/\{[\s\S]*\}/)
  if (jsonMatch) {
    return JSON.parse(jsonMatch[0])
  }
  throw new Error('No se pudo expandir la tarea')
}

// Resumen diario
export async function generateDailySummary(summaryData: any) {
  const prompt = `Genera un resumen motivacional para el día ${summaryData.date}:

Estadísticas:
- Tareas completadas: ${summaryData.completed}
- Tareas pendientes: ${summaryData.pending}
- Tareas atrasadas: ${summaryData.overdue}

Tareas del día:
${JSON.stringify(summaryData.tasks, null, 2)}

Responde en formato JSON:
{
  "date": "${summaryData.date}",
  "completedCount": ${summaryData.completed},
  "pendingCount": ${summaryData.pending},
  "overdueCount": ${summaryData.overdue},
  "highlights": ["logro1", "logro2"],
  "recommendations": ["recomendación1", "recomendación2"],
  "motivationalMessage": "mensaje positivo y motivador"
}

Sé positivo, específico y accionable.`

  const response = await askGemini(prompt)
  const jsonMatch = response.match(/\{[\s\S]*\}/)
  if (jsonMatch) {
    return JSON.parse(jsonMatch[0])
  }
  throw new Error('No se pudo generar resumen')
}

// Detección de conflictos de tiempo
export async function detectTimeConflicts(potentialConflicts: any[]) {
  const prompt = `Analiza estos días con múltiples tareas y detecta posibles conflictos de tiempo:

${JSON.stringify(potentialConflicts, null, 2)}

Responde en formato JSON:
{
  "conflicts": [
    {
      "date": "fecha",
      "tasks": [{ "id": n, "title": "título", "priority": "prioridad" }],
      "reason": "por qué hay conflicto",
      "suggestion": "cómo resolverlo"
    }
  ]
}

Considera la prioridad y cantidad de tareas para detectar sobrecarga.`

  const response = await askGemini(prompt)
  const jsonMatch = response.match(/\{[\s\S]*\}/)
  if (jsonMatch) {
    const parsed = JSON.parse(jsonMatch[0])
    return parsed.conflicts || []
  }
  return []
}

// Sugerencia de etiquetas
export async function suggestTags(taskTitle: string, taskDescription?: string, existingTags: string[] = []) {
  const prompt = `Para la tarea "${taskTitle}"${taskDescription ? ` (${taskDescription})` : ''}, sugiere etiquetas relevantes.

Etiquetas existentes en el sistema: ${existingTags.join(', ')}

Responde en formato JSON:
{
  "tags": ["tag1", "tag2", "tag3"]
}

Prioriza usar etiquetas existentes cuando sean apropiadas. Sugiere 2-4 etiquetas.`

  const response = await askGemini(prompt)
  const jsonMatch = response.match(/\{[\s\S]*\}/)
  if (jsonMatch) {
    const parsed = JSON.parse(jsonMatch[0])
    return parsed.tags || []
  }
  return []
}

// ============================================
// FUNCIONES PARA MODO ESTUDIO
// ============================================

/**
 * Estudiar un tema libre con explicación detallada
 */
export async function studyTopic(topic: string) {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' })

    const prompt = `Eres un tutor educativo experto. Explica el siguiente tema de manera clara y pedagógica:

TEMA: "${topic}"

Proporciona tu respuesta en formato JSON:
{
  "explanation": "explicación detallada y didáctica del tema con ejemplos",
  "keyPoints": ["punto clave 1", "punto clave 2", "punto clave 3"],
  "examples": ["ejemplo práctico 1", "ejemplo práctico 2"]
}

INSTRUCCIONES:
- La explicación debe ser comprensible para un estudiante
- Usa analogías y ejemplos del mundo real
- Estructura la información de manera lógica
- Incluye 3-5 puntos clave
- Proporciona 2-3 ejemplos prácticos
- Si es un tema complejo, divídelo en partes más simples`

    const result = await model.generateContent(prompt)
    const response = await result.response
    const text = response.text()

    // Extraer JSON de la respuesta
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0])
    }
    
    // Si no hay JSON, crear respuesta estructurada
    return {
      explanation: text,
      keyPoints: [],
      examples: []
    }
  } catch (error) {
    console.error('Error estudiando tema:', error)
    throw new Error('No se pudo obtener explicación del tema')
  }
}

/**
 * Analizar contenido de un PDF extraído
 */
export async function analyzePDFContent(pdfText: string, fileName: string) {
  try {
    // Usar gemini-2.0-flash-exp por su mayor ventana de contexto (1M tokens)
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' })

    const prompt = `Analiza el siguiente contenido extraído de un PDF educativo:

ARCHIVO: ${fileName}

CONTENIDO:
${pdfText.substring(0, 10000)} ${pdfText.length > 10000 ? '...(contenido truncado)' : ''}

Proporciona un análisis completo en formato JSON:
{
  "fileName": "${fileName}",
  "summary": "resumen general del documento (2-3 párrafos)",
  "mainTopics": ["tema principal 1", "tema principal 2", "tema principal 3"],
  "keyConcepts": [
    {
      "term": "concepto clave",
      "definition": "definición clara y concisa"
    }
  ],
  "explanation": "explicación detallada y didáctica del contenido completo"
}

INSTRUCCIONES:
- El resumen debe capturar la esencia del documento
- Identifica 3-6 temas principales
- Extrae 5-8 conceptos clave con sus definiciones
- La explicación debe ser educativa y fácil de entender
- Estructura la información de manera lógica`

    const result = await model.generateContent(prompt)
    const response = await result.response
    const text = response.text()

    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0])
    }
    
    throw new Error('No se pudo analizar el PDF correctamente')
  } catch (error: any) {
    console.error('Error analizando PDF:', error)
    
    // Manejo específico de errores de cuota
    if (error?.message?.includes('429') || error?.message?.includes('quota')) {
      const retryMatch = error.message.match(/(\d+)(?:\.\d+)?s/)
      const retrySeconds = retryMatch ? Math.ceil(parseFloat(retryMatch[1])) : 60
      
      throw new Error(
        `⚠️ Has excedido tu cuota de la API de Gemini.\n\n` +
        `🕒 Espera ${retrySeconds} segundos e inténtalo de nuevo.\n\n` +
        `💡 Consejos:\n` +
        `• Usa archivos PDF más pequeños (máximo 3MB recomendado)\n` +
        `• Evita analizar muchos PDFs seguidos\n` +
        `• Considera actualizar a un plan de pago para mayor cuota`
      )
    }
    
    // Error genérico
    throw new Error(
      'No se pudo analizar el contenido del PDF. ' +
      'Verifica que el archivo no esté dañado y contenga texto legible.'
    )
  }
}

/**
 * Generar examen basado en contenido estudiado
 */
export async function generateExamFromContent(params: {
  topic: string
  content: string
  difficulty?: 'easy' | 'medium' | 'hard'
  questionCount?: number
}) {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' })

    const { topic, content, difficulty = 'medium', questionCount = 10 } = params

    const prompt = `Genera un examen educativo basado en el siguiente contenido:

TEMA: ${topic}
DIFICULTAD: ${difficulty}
NÚMERO DE PREGUNTAS: ${questionCount}

CONTENIDO A EVALUAR:
${content.substring(0, 8000)}

Genera el examen en formato JSON:
{
  "questions": [
    {
      "id": 1,
      "type": "multiple-choice" | "true-false" | "short-answer",
      "question": "pregunta clara y específica",
      "options": ["opción A", "opción B", "opción C", "opción D"],
      "correctAnswer": "respuesta correcta",
      "explanation": "explicación de por qué esta es la respuesta correcta",
      "difficulty": "easy" | "medium" | "hard",
      "points": 10
    }
  ]
}

INSTRUCCIONES PARA GENERAR PREGUNTAS:
1. Distribuye los tipos de preguntas:
   - 60% multiple-choice (4 opciones cada una)
   - 30% true-false
   - 10% short-answer

2. Distribución de dificultad (si es ${difficulty}):
   - easy: preguntas directas sobre conceptos básicos
   - medium: aplicación de conceptos y relaciones
   - hard: análisis, síntesis y pensamiento crítico

3. Puntos por dificultad:
   - easy: 5-8 puntos
   - medium: 8-12 puntos
   - hard: 12-15 puntos

4. IMPORTANTE:
   - Las preguntas deben cubrir diferentes aspectos del contenido
   - Las opciones incorrectas deben ser plausibles pero claramente incorrectas
   - Cada pregunta debe tener una explicación educativa
   - Evita preguntas ambiguas o con múltiples interpretaciones
   - Para true-false, la afirmación debe ser clara y definitiva

5. Asegúrate de generar exactamente ${questionCount} preguntas`

    const result = await model.generateContent(prompt)
    const response = await result.response
    const text = response.text()

    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0])
    }
    
    throw new Error('No se pudo generar el examen correctamente')
  } catch (error) {
    console.error('Error generando examen:', error)
    throw new Error('No se pudo generar el examen')
  }
}

// ====================================
// RAG (Retrieval Augmented Generation)
// ====================================

/**
 * Divide un texto largo en chunks más pequeños
 * @param text Texto completo del PDF
 * @param chunkSize Tamaño máximo de cada chunk en caracteres (default: 1000)
 * @param overlap Superposición entre chunks para mantener contexto (default: 200)
 */
export function splitTextIntoChunks(
  text: string, 
  chunkSize: number = 1000, 
  overlap: number = 200
): string[] {
  const chunks: string[] = []
  let startIndex = 0
  
  while (startIndex < text.length) {
    const endIndex = Math.min(startIndex + chunkSize, text.length)
    const chunk = text.substring(startIndex, endIndex)
    
    // Intentar cortar en un punto natural (fin de oración)
    let cutPoint = endIndex
    if (endIndex < text.length) {
      const lastPeriod = chunk.lastIndexOf('. ')
      const lastNewline = chunk.lastIndexOf('\n')
      cutPoint = Math.max(lastPeriod, lastNewline)
      
      if (cutPoint > startIndex + chunkSize / 2) {
        chunks.push(text.substring(startIndex, startIndex + cutPoint + 1).trim())
        startIndex += cutPoint + 1
      } else {
        chunks.push(chunk.trim())
        startIndex = endIndex
      }
    } else {
      chunks.push(chunk.trim())
      break
    }
    
    // Retroceder para crear overlap
    startIndex = Math.max(startIndex - overlap, startIndex)
  }
  
  return chunks.filter(c => c.length > 50) // Filtrar chunks muy pequeños
}

/**
 * Genera embedding de un texto usando Gemini
 * @param text Texto para generar embedding
 * @returns Vector numérico (embedding)
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  try {
    const model = genAI.getGenerativeModel({ model: 'text-embedding-004' })
    
    const result = await model.embedContent(text)
    const embedding = result.embedding
    
    return embedding.values
  } catch (error) {
    console.error('Error generando embedding:', error)
    throw new Error('No se pudo generar el embedding del texto')
  }
}

/**
 * Analiza un PDF usando RAG (Retrieval Augmented Generation)
 * Solo genera un resumen inicial basado en los chunks más relevantes
 * @param chunks Array de chunks de texto del PDF
 * @param fileName Nombre del archivo PDF
 */
export async function analyzePDFWithRAG(
  chunks: string[], 
  fileName: string
): Promise<any> {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' })
    
    // Tomar solo los primeros 3-5 chunks como muestra representativa
    const sampleChunks = chunks.slice(0, Math.min(5, chunks.length))
    const sampleText = sampleChunks.join('\n\n')
    
    const prompt = `Analiza este documento educativo basándote en la siguiente muestra:

ARCHIVO: ${fileName}
TOTAL DE SECCIONES: ${chunks.length}

MUESTRA DEL CONTENIDO:
${sampleText}

Proporciona un análisis preliminar en formato JSON:
{
  "fileName": "${fileName}",
  "summary": "resumen general del documento (2-3 párrafos)",
  "mainTopics": ["tema principal 1", "tema principal 2", "tema principal 3"],
  "keyConcepts": [
    {
      "term": "concepto clave",
      "definition": "definición clara y concisa"
    }
  ],
  "totalSections": ${chunks.length}
}

INSTRUCCIONES:
- El resumen debe capturar la esencia del documento
- Identifica 3-6 temas principales
- Extrae 5-8 conceptos clave con sus definiciones
- Este es un análisis preliminar; el usuario podrá hacer preguntas específicas después`

    const result = await model.generateContent(prompt)
    const response = await result.response
    const text = response.text()

    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0])
    }
    
    throw new Error('No se pudo analizar el PDF correctamente')
  } catch (error: any) {
    console.error('Error analizando PDF con RAG:', error)
    
    // Manejo específico de errores de cuota
    if (error?.message?.includes('429') || error?.message?.includes('quota')) {
      const retryMatch = error.message.match(/(\d+)(?:\.\d+)?s/)
      const retrySeconds = retryMatch ? Math.ceil(parseFloat(retryMatch[1])) : 60
      
      throw new Error(
        `⚠️ Has excedido tu cuota de la API de Gemini.\n\n` +
        `🕒 Espera ${retrySeconds} segundos e inténtalo de nuevo.\n\n` +
        `💡 Consejos:\n` +
        `• Evita analizar muchos PDFs seguidos\n` +
        `• Considera actualizar a un plan de pago para mayor cuota`
      )
    }
    
    throw new Error(
      'No se pudo analizar el contenido del PDF. ' +
      'Verifica que el archivo no esté dañado y contenga texto legible.'
    )
  }
}

/**
 * Responde una pregunta específica usando RAG
 * Busca los chunks relevantes y genera respuesta contextualizada
 * @param question Pregunta del usuario
 * @param relevantChunks Chunks relevantes encontrados por búsqueda vectorial
 */
export async function answerQuestionWithRAG(
  question: string,
  relevantChunks: Array<{ content: string; similarity: number }>
): Promise<string> {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' })
    
    const context = relevantChunks
      .map((chunk, i) => `[Sección ${i + 1}] ${chunk.content}`)
      .join('\n\n')
    
    const prompt = `Eres un tutor educativo. Responde la siguiente pregunta basándote ÚNICAMENTE en el contexto proporcionado:

PREGUNTA: ${question}

CONTEXTO RELEVANTE:
${context}

INSTRUCCIONES:
- Responde de manera clara y educativa
- Usa solo la información del contexto proporcionado
- Si el contexto no tiene información suficiente, indícalo claramente
- Estructura tu respuesta con ejemplos si es posible
- Mantén un tono pedagógico y amigable`

    const result = await model.generateContent(prompt)
    const response = await result.response
    
    return response.text()
  } catch (error) {
    console.error('Error respondiendo pregunta con RAG:', error)
    throw new Error('No se pudo generar la respuesta')
  }
}

/**
 * Busca recursos educativos adicionales usando Gemini
 */
export async function searchEducationalResources(topic: string): Promise<{
  videos: Array<{ title: string; description: string; url: string }>
  documents: Array<{ title: string; description: string; type: string }>
  websites: Array<{ title: string; description: string; url: string }>
}> {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' })
    
    const prompt = `Genera una lista de recursos educativos recomendados para estudiar el tema: "${topic}"

Proporciona la respuesta en formato JSON:
{
  "videos": [
    {
      "title": "Título del video educativo",
      "description": "Breve descripción de qué trata",
      "url": "https://www.youtube.com/watch?v=ejemplo"
    }
  ],
  "documents": [
    {
      "title": "Título del documento académico",
      "description": "Descripción del contenido",
      "type": "PDF | Article | Book"
    }
  ],
  "websites": [
    {
      "title": "Nombre del sitio web educativo",
      "description": "Qué tipo de información ofrece",
      "url": "https://ejemplo.com"
    }
  ]
}

IMPORTANTE:
- Sugiere recursos REALES y de calidad reconocida
- Para videos, sugiere canales educativos conocidos (Khan Academy, CrashCourse, etc.)
- Para documentos, sugiere artículos científicos, libros de texto reconocidos
- Para websites, sugiere sitios educativos de prestigio (.edu, enciclopedias, etc.)
- Incluye al menos 3 recursos de cada tipo
- Las URLs deben ser reales y verificables`

    const result = await model.generateContent(prompt)
    const response = await result.response
    const text = response.text()
    
    // Extraer JSON de la respuesta
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0])
    }
    
    throw new Error('No se pudo parsear la respuesta de recursos')
  } catch (error) {
    console.error('Error buscando recursos educativos:', error)
    throw new Error('No se pudieron obtener recursos educativos')
  }
}
