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

