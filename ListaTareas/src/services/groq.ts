/**
 * Servicio para Groq API
 * Más rápido que Ollama, con respaldo automático a Ollama si falla
 */

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions'
const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY
const GROQ_MODEL = 'llama-3.3-70b-versatile' // Modelo rápido y potente

interface GroqMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

interface GroqResponse {
  choices: Array<{
    message: {
      content: string
    }
  }>
}

export class GroqError extends Error {
  statusCode?: number
  isRateLimitError: boolean
  
  constructor(
    message: string,
    statusCode?: number,
    isRateLimitError: boolean = false
  ) {
    super(message)
    this.name = 'GroqError'
    this.statusCode = statusCode
    this.isRateLimitError = isRateLimitError
  }
}

/**
 * Genera contenido usando Groq API
 */
export async function generateWithGroq(
  prompt: string,
  systemPrompt: string,
  temperature: number = 0.7
): Promise<string> {
  if (!GROQ_API_KEY) {
    throw new GroqError('GROQ_API_KEY no está configurada')
  }

  const messages: GroqMessage[] = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: prompt }
  ]

  try {
    const response = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        messages,
        temperature,
        max_tokens: 2000
      })
    })

    // Detectar error de límite de cuota
    if (response.status === 429) {
      throw new GroqError(
        'Límite de cuota de Groq superado',
        429,
        true
      )
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new GroqError(
        errorData.error?.message || `Error ${response.status}`,
        response.status
      )
    }

    const data: GroqResponse = await response.json()
    
    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      throw new GroqError('Respuesta inválida de Groq')
    }
    
    return data.choices[0].message.content

  } catch (error) {
    if (error instanceof GroqError) {
      throw error
    }
    
    // Error de red u otro
    throw new GroqError(
      error instanceof Error ? error.message : 'Error desconocido con Groq'
    )
  }
}

/**
 * Genera un mapa mental con Groq
 */
export async function generateMindMapWithGroq(
  topic: string,
  detailLevel: 'basic' | 'medium' | 'detailed' = 'medium'
): Promise<string> {
  const systemPrompt = `Eres un experto en crear mapas mentales educativos usando la sintaxis de Mermaid.js.

REGLAS ESTRICTAS:
1. Devuelve ÚNICAMENTE código Mermaid puro, sin explicaciones, sin bloques de código markdown.
2. Primera línea: mindmap
3. Segunda línea: root((Tema Principal)) con DOBLE paréntesis
4. Usa indentación de 2 espacios por nivel
5. Los nodos hijos NO usan paréntesis
6. NO uses comillas, símbolos especiales ni emojis
7. Máximo 3 niveles de profundidad
8. Nombres cortos (máximo 3-4 palabras)

EJEMPLO:
mindmap
  root((Fotosíntesis))
    Proceso
      Luz solar
      Clorofila
    Productos
      Oxígeno
      Glucosa`

  const detailInstructions = {
    basic: 'Crea un mapa simple con 3-5 conceptos principales.',
    medium: 'Crea un mapa balanceado con 5-7 conceptos y 2 niveles.',
    detailed: 'Crea un mapa completo con 7-10 conceptos y 3 niveles.'
  }

  const prompt = `Genera un mapa mental sobre: "${topic}"

${detailInstructions[detailLevel]}

IMPORTANTE: Devuelve SOLO el código Mermaid, comenzando con "mindmap".`

  const response = await generateWithGroq(prompt, systemPrompt, 0.7)
  
  // Limpiar respuesta
  let cleanCode = response.trim()
  cleanCode = cleanCode.replace(/```mermaid\s*/g, '').replace(/```\s*/g, '').trim()
  
  const mindmapIndex = cleanCode.indexOf('mindmap')
  if (mindmapIndex !== -1) {
    cleanCode = cleanCode.substring(mindmapIndex)
  }
  
  if (!cleanCode.startsWith('mindmap')) {
    throw new GroqError('El código generado no es válido')
  }
  
  return cleanCode
}

/**
 * Estudia un tema con Groq
 */
export async function studyTopicWithGroq(topic: string): Promise<{
  explanation: string
  keyPoints: string[]
  examples: string[]
}> {
  const systemPrompt = `Eres un tutor educativo experto. Explicas conceptos de forma clara y estructurada.

Responde en formato JSON con esta estructura EXACTA:
{
  "explanation": "explicación detallada del tema",
  "keyPoints": ["punto clave 1", "punto clave 2", "punto clave 3"],
  "examples": ["ejemplo 1", "ejemplo 2"]
}`

  const prompt = `Explica el tema: "${topic}"

Incluye:
1. Explicación clara y comprensible (2-3 párrafos)
2. 5-7 puntos clave
3. 2-3 ejemplos prácticos

Responde SOLO con el JSON, sin texto adicional.`

  const response = await generateWithGroq(prompt, systemPrompt, 0.7)
  
  // Extraer JSON
  const jsonMatch = response.match(/\{[\s\S]*\}/)
  if (!jsonMatch) {
    throw new GroqError('No se pudo parsear la respuesta')
  }
  
  return JSON.parse(jsonMatch[0])
}

/**
 * Genera un examen usando Groq
 */
export async function generateExamWithGroq(params: {
  topic: string
  content: string
  difficulty?: 'easy' | 'medium' | 'hard'
  questionCount?: number
}): Promise<any> {
  const { topic, content, difficulty = 'medium', questionCount = 10 } = params

  const systemPrompt = `Eres un generador de exámenes educativos experto. Creas preguntas claras, desafiantes y educativas.

Responde ÚNICAMENTE con un objeto JSON válido, sin texto adicional.`

  const prompt = `Genera un examen sobre: ${topic}

CONTENIDO BASE:
${content.substring(0, 2000)}

Genera ${questionCount} preguntas variadas en formato JSON:
{
  "questions": [
    {
      "id": 1,
      "type": "multiple-choice",
      "question": "¿Pregunta clara y específica?",
      "options": ["opción A", "opción B", "opción C", "opción D"],
      "correctAnswer": "opción correcta exacta",
      "explanation": "Explicación educativa de por qué esta es la respuesta correcta",
      "difficulty": "${difficulty}",
      "points": 10
    },
    {
      "id": 2,
      "type": "true-false",
      "question": "Afirmación para evaluar",
      "correctAnswer": "true",
      "explanation": "Explicación detallada",
      "difficulty": "${difficulty}",
      "points": 8
    }
  ],
  "totalPoints": ${questionCount * 10}
}

REQUISITOS:
- DISTRIBUCIÓN: 60% multiple-choice, 30% true-false, 10% short-answer
- DIFICULTAD ${difficulty}: 
  * easy: 5-8 puntos por pregunta
  * medium: 8-12 puntos por pregunta
  * hard: 12-15 puntos por pregunta
- Las preguntas deben cubrir diferentes aspectos del contenido
- Cada pregunta debe tener una explicación educativa
- Para multiple-choice, incluye 4 opciones plausibles
- Para true-false, el correctAnswer debe ser "true" o "false"
- Para short-answer, no incluyas options ni correctAnswer numérico

Responde SOLO con el JSON, sin bloques de código markdown.`

  const response = await generateWithGroq(prompt, systemPrompt, 0.8)
  
  // Limpiar respuesta
  let cleanCode = response.trim()
  cleanCode = cleanCode.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim()
  
  // Extraer JSON
  const jsonMatch = cleanCode.match(/\{[\s\S]*\}/)
  if (!jsonMatch) {
    throw new GroqError('No se pudo parsear el examen generado')
  }
  
  const exam = JSON.parse(jsonMatch[0])
  
  // Validar estructura
  if (!exam.questions || !Array.isArray(exam.questions) || exam.questions.length === 0) {
    throw new GroqError('El examen generado no tiene preguntas válidas')
  }
  
  return exam
}
