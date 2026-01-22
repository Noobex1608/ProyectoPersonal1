/**
 * Servicio para Ollama - IA Local
 * Reemplaza Gemini API en el Modo Estudio para análisis ilimitado y gratuito
 */

const OLLAMA_BASE_URL = import.meta.env.VITE_OLLAMA_URL || 'http://localhost:11434'
const OLLAMA_MODEL = import.meta.env.VITE_OLLAMA_MODEL || 'llama3.2:3b'

interface OllamaResponse {
  model: string
  created_at: string
  response: string
  done: boolean
}

interface OllamaEmbeddingResponse {
  embedding: number[]
}

/**
 * Helper: Parsea JSON de manera segura eliminando caracteres de control
 */
function safeJsonParse(jsonString: string): any {
  try {
    // Intentar parsear directamente primero
    return JSON.parse(jsonString)
  } catch (error) {
    // Si falla, limpiar y reintentar
    try {
      let cleaned = jsonString
        // Reemplazar triple comillas con comillas simples (error común de Ollama)
        .replace(/"""/g, '"')
        // Eliminar SOLO caracteres de control realmente problemáticos
        .replace(/[\u0000-\u0008\u000B-\u000C\u000E-\u001F\u007F]/g, '')
        .trim()
      
      return JSON.parse(cleaned)
    } catch (cleanError) {
      console.error('No se pudo parsear JSON:', cleanError)
      console.log('JSON problemático:', jsonString.substring(0, 500))
      throw new Error('Formato JSON inválido en respuesta de Ollama')
    }
  }
}

/**
 * Verifica si Ollama está corriendo
 */
export async function checkOllamaHealth(): Promise<boolean> {
  try {
    const response = await fetch(`${OLLAMA_BASE_URL}/api/tags`)
    return response.ok
  } catch (error) {
    console.error('Ollama no está disponible:', error)
    return false
  }
}

/**
 * Lista modelos disponibles en Ollama
 */
export async function listOllamaModels(): Promise<string[]> {
  try {
    const response = await fetch(`${OLLAMA_BASE_URL}/api/tags`)
    const data = await response.json()
    return data.models?.map((m: any) => m.name) || []
  } catch (error) {
    console.error('Error listando modelos:', error)
    return []
  }
}

/**
 * Genera una respuesta usando Ollama
 */
export async function generateWithOllama(
  prompt: string,
  systemPrompt?: string
): Promise<string> {
  try {
    const response = await fetch(`${OLLAMA_BASE_URL}/api/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        prompt: systemPrompt ? `${systemPrompt}\n\n${prompt}` : prompt,
        stream: false,
        keep_alive: '15m', // Mantener modelo en memoria 15 minutos
        options: {
          temperature: 0.7,
          top_p: 0.9,
          top_k: 40,
          num_ctx: 4096, // Contexto ampliado para respuestas completas
          num_predict: 3072, // Aumentado para respuestas más largas y completas
        }
      }),
    })

    if (!response.ok) {
      throw new Error(`Ollama error: ${response.status}`)
    }

    const data: OllamaResponse = await response.json()
    return data.response
  } catch (error) {
    console.error('Error generando con Ollama:', error)
    throw new Error('No se pudo conectar con Ollama. Asegúrate de que esté corriendo.')
  }
}

/**
 * Genera embeddings usando Ollama
 */
export async function generateOllamaEmbedding(text: string): Promise<number[]> {
  try {
    const response = await fetch(`${OLLAMA_BASE_URL}/api/embeddings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'nomic-embed-text', // Modelo específico para embeddings
        prompt: text,
      }),
    })

    if (!response.ok) {
      throw new Error(`Ollama embeddings error: ${response.status}`)
    }

    const data: OllamaEmbeddingResponse = await response.json()
    return data.embedding
  } catch (error) {
    console.error('Error generando embedding con Ollama:', error)
    throw new Error('No se pudo generar embedding con Ollama')
  }
}

/**
 * Estudia un tema usando Ollama
 */
export async function studyTopicWithOllama(topic: string): Promise<any> {
  const systemPrompt = `Eres un tutor educativo. Genera SOLO UN objeto JSON completo y válido.`
  
  const prompt = `Explica: "${topic}"

Genera UN SOLO JSON con TODO junto:
{
  "explanation": "Texto largo de 4-5 párrafos explicando el tema a fondo",
  "keyPoints": ["Punto 1", "Punto 2", "Punto 3", "Punto 4"],
  "examples": ["Ejemplo 1", "Ejemplo 2"]
}

IMPORTANTE:
- UN SOLO objeto JSON (no dos separados)
- Explanation: mínimo 500 palabras en párrafos completos
- NO uses \"Punto clave 1:\" en los textos, solo el contenido
- NO uses comillas triples
- Genera TODO el JSON de una vez`

  try {
    const response = await generateWithOllama(prompt, systemPrompt)
    console.log('Respuesta recibida:', response.substring(0, 800))
    
    // Limpiar la respuesta de posibles markdown o texto adicional
    let cleanedResponse = response.trim()
    
    // Eliminar texto antes del primer {
    const startIndex = cleanedResponse.indexOf('{')
    if (startIndex > 0) {
      cleanedResponse = cleanedResponse.substring(startIndex)
    }
    
    // Si hay bloques de código markdown, extraerlos
    const codeBlockMatch = cleanedResponse.match(/```(?:json)?\s*({[\s\S]*?})\s*```/)
    if (codeBlockMatch && codeBlockMatch[1]) {
      cleanedResponse = codeBlockMatch[1]
    }
    
    // FUSIONAR múltiples objetos JSON si están separados
    // Buscar patrones como: {...} {...}
    const jsonObjects = cleanedResponse.match(/{[^{}]*(?:{[^{}]*}[^{}]*)*}/g)
    if (jsonObjects && jsonObjects.length > 1) {
      console.log(`Detectados ${jsonObjects.length} objetos JSON separados, fusionando...`)
      let merged: any = {}
      for (const jsonStr of jsonObjects) {
        try {
          const parsed = JSON.parse(jsonStr.replace(/"""/g, '"'))
          merged = { ...merged, ...parsed }
        } catch (e) {
          console.warn('No se pudo parsear fragmento:', jsonStr.substring(0, 100))
        }
      }
      cleanedResponse = JSON.stringify(merged)
    } else {
      // Encontrar el último } para cerrar el JSON correctamente
      const endIndex = cleanedResponse.lastIndexOf('}')
      if (endIndex > 0) {
        cleanedResponse = cleanedResponse.substring(0, endIndex + 1)
      }
    }
    
    // Reemplazar triple comillas antes de parsear
    cleanedResponse = cleanedResponse.replace(/"""/g, '"')
    
    try {
      const parsed = safeJsonParse(cleanedResponse)
      
      // Limpiar y procesar explanation
      if (parsed.explanation && typeof parsed.explanation === 'string') {
        // Limpiar secuencias de escape
        let cleanExplanation = parsed.explanation
          .replace(/\\n\\?/g, '\n')  // Reemplazar \n\ y \n con salto de línea real
          .replace(/\\+$/gm, '')      // Eliminar \ al final de líneas
          .replace(/\\t/g, '\t')      // Reemplazar \t con tab real
          .trim()
        
        // Extraer puntos clave si están mezclados en la explanation
        const keyPointsMatch = cleanExplanation.match(/Punto clave \d+:.*?(?=\n\n|Ejemplo \d+:|$)/gs)
        if (keyPointsMatch && keyPointsMatch.length > 0) {
          parsed.keyPoints = keyPointsMatch.map((point: string) => 
            point.replace(/^Punto clave \d+:\s*/i, '').replace(/Descripción completa\.?\s*/i, '').trim()
          )
          // Remover puntos clave de la explanation
          cleanExplanation = cleanExplanation.replace(/\n*Punto clave \d+:.*?(?=\n\nEjemplo|$)/gs, '')
        }
        
        // Extraer ejemplos si están mezclados en la explanation
        const examplesMatch = cleanExplanation.match(/Ejemplo \d+:.*?(?=\n\nEjemplo \d+:|$)/gs)
        if (examplesMatch && examplesMatch.length > 0) {
          parsed.examples = examplesMatch.map((example: string) => 
            example.replace(/^Ejemplo \d+:\s*/i, '').trim()
          )
          // Remover ejemplos de la explanation
          cleanExplanation = cleanExplanation.replace(/\n*Ejemplo \d+:.*$/gs, '')
        }
        
        parsed.explanation = cleanExplanation.trim()
      }
      
      // Validar propiedades
      if (!parsed.explanation || typeof parsed.explanation !== 'string') {
        parsed.explanation = response
      }
      if (!parsed.keyPoints || !Array.isArray(parsed.keyPoints)) {
        parsed.keyPoints = []
      }
      if (!parsed.examples || !Array.isArray(parsed.examples)) {
        parsed.examples = []
      }
      
      return parsed
    } catch (parseError) {
      console.warn('No se pudo parsear JSON:', parseError)
      console.log('JSON limpio intentado:', cleanedResponse.substring(0, 500))
      
      // Fallback: intentar extraer manualmente
      return extractDataManually(response)
    }
  } catch (error) {
    console.error('Error estudiando tema con Ollama:', error)
    throw error
  }
}

/**
 * Extrae datos manualmente si el parsing JSON falla
 */
function extractDataManually(response: string): any {
  const explanation = response
    .replace(/.*"explanation"\s*:\s*"([^"]*?)"\s*[,}].*/s, '$1')
    .trim()
  
  return {
    explanation: explanation || response,
    keyPoints: [],
    examples: []
  }
}

/**
 * Analiza un PDF usando Ollama con RAG
 */
export async function analyzePDFWithOllama(
  chunks: string[],
  fileName: string
): Promise<any> {
  const sampleChunks = chunks.slice(0, Math.min(8, chunks.length))
  const sampleText = sampleChunks.join('\n\n').substring(0, 5000) // Más contexto

  const systemPrompt = `Eres un asistente educativo experto en análisis de documentos. Debes extraer información clave del contenido.`
  
  const prompt = `Analiza este documento y proporciona:

DOCUMENTO: "${fileName}"
CONTENIDO:
${sampleText}

Responde en el siguiente formato:

RESUMEN:
[Escribe un resumen de 3-4 oraciones sobre el tema principal del documento]

TEMAS PRINCIPALES:
1. [Primer tema principal]
2. [Segundo tema principal]  
3. [Tercer tema principal]

CONCEPTOS CLAVE:
- [Concepto 1]: [Breve explicación]
- [Concepto 2]: [Breve explicación]
- [Concepto 3]: [Breve explicación]

Sé específico y usa información del contenido mostrado.`

  try {
    const response = await generateWithOllama(prompt, systemPrompt)
    console.log('Respuesta de Ollama:', response.substring(0, 800))
    
    // Parsear la respuesta estructurada
    const lines = response.split('\n').map(l => l.trim()).filter(l => l)
    
    let summary = ''
    const mainTopics: string[] = []
    const keyConcepts: Array<{term: string, definition: string}> = []
    
    let currentSection = ''
    
    for (const line of lines) {
      if (line.includes('RESUMEN') || line.includes('Resumen')) {
        currentSection = 'summary'
        continue
      } else if (line.includes('TEMAS') || line.includes('Temas')) {
        currentSection = 'topics'
        continue
      } else if (line.includes('CONCEPTOS') || line.includes('Conceptos')) {
        currentSection = 'concepts'
        continue
      }
      
      if (currentSection === 'summary' && line.length > 10) {
        summary += line + ' '
      } else if (currentSection === 'topics') {
        // Extraer tema (remover numeración)
        const topic = line.replace(/^\d+\.?\s*[-•]?\s*/, '').trim()
        if (topic && mainTopics.length < 3) {
          mainTopics.push(topic)
        }
      } else if (currentSection === 'concepts') {
        // Extraer concepto y definición
        const match = line.match(/^[-•]?\s*(.+?):\s*(.+)$/)
        if (match && match[1] && match[2] && keyConcepts.length < 3) {
          keyConcepts.push({
            term: match[1].trim(),
            definition: match[2].trim()
          })
        }
      }
    }
    
    // Validar y usar fallbacks si es necesario
    if (!summary || summary.length < 20) {
      const sentences = sampleText.match(/[^.!?]+[.!?]+/g) || []
      summary = sentences.slice(0, 3).join(' ').trim()
    }
    
    if (mainTopics.length === 0) {
      // Fallback: palabras frecuentes
      const words = sampleText.toLowerCase().split(/\s+/)
      const wordCount = new Map<string, number>()
      const stopWords = new Set(['el', 'la', 'los', 'las', 'de', 'del', 'y', 'en', 'a', 'que', 'un', 'una', 'por', 'para', 'con', 'es', 'se', 'su', 'al', 'como', 'más'])
      
      words.forEach(word => {
        const cleaned = word.replace(/[^\w]/g, '')
        if (cleaned.length > 5 && !stopWords.has(cleaned)) {
          wordCount.set(cleaned, (wordCount.get(cleaned) || 0) + 1)
        }
      })
      
      const topWords = Array.from(wordCount.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([word]) => word.charAt(0).toUpperCase() + word.slice(1))
      
      mainTopics.push(...topWords)
    }
    
    if (keyConcepts.length === 0) {
      keyConcepts.push({ term: 'Contenido principal', definition: 'Información clave del documento' })
    }
    
    return {
      fileName,
      summary: summary.trim(),
      mainTopics,
      keyConcepts,
      totalSections: chunks.length
    }
  } catch (error) {
    console.error('Error analizando PDF con Ollama:', error)
    
    // Fallback: extraer información básica del texto directamente
    const sentences = sampleText.match(/[^.!?]+[.!?]+/g) || []
    const summaryText = sentences.slice(0, 2).join(' ').trim() || `Documento con ${chunks.length} secciones.`
    
    // Extraer palabras clave frecuentes
    const words = sampleText.toLowerCase().split(/\s+/)
    const wordCount = new Map<string, number>()
    const stopWords = new Set([
      'el', 'la', 'los', 'las', 'de', 'del', 'y', 'en', 'a', 'que', 'un', 'una', 
      'por', 'para', 'con', 'es', 'se', 'su', 'al', 'como', 'más', 'este', 'esta'
    ])
    
    words.forEach(word => {
      const cleaned = word.replace(/[^\w]/g, '')
      if (cleaned.length > 5 && !stopWords.has(cleaned)) {
        wordCount.set(cleaned, (wordCount.get(cleaned) || 0) + 1)
      }
    })
    
    const topKeywords = Array.from(wordCount.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([word]) => word.charAt(0).toUpperCase() + word.slice(1))
    
    return {
      fileName,
      summary: summaryText,
      mainTopics: topKeywords.slice(0, 3),
      keyConcepts: topKeywords.slice(3, 6).map(term => ({
        term,
        definition: `Concepto clave identificado en el documento`
      })),
      totalSections: chunks.length
    }
  }
}

/**
 * Responde una pregunta usando Ollama con RAG
 */
export async function answerQuestionWithOllama(
  question: string,
  relevantChunks: Array<{ content: string; similarity: number }>
): Promise<string> {
  const context = relevantChunks
    .map((chunk, i) => `[Sección ${i + 1}] ${chunk.content}`)
    .join('\n\n')

  const systemPrompt = `Eres un tutor educativo. Responde basándote ÚNICAMENTE en el contexto proporcionado.`
  
  const prompt = `PREGUNTA: ${question}

CONTEXTO:
${context}

INSTRUCCIONES:
- Responde de manera clara y educativa
- Usa solo la información del contexto
- Si el contexto no tiene suficiente información, indícalo
- Estructura tu respuesta con ejemplos
- Mantén un tono pedagógico y amigable`

  try {
    return await generateWithOllama(prompt, systemPrompt)
  } catch (error) {
    console.error('Error respondiendo con Ollama:', error)
    throw new Error('No se pudo generar la respuesta con Ollama')
  }
}

/**
 * Genera un examen usando Ollama
 */
export async function generateExamWithOllama(params: {
  topic: string
  content: string
  difficulty?: 'easy' | 'medium' | 'hard'
  questionCount?: number
}): Promise<any> {
  const { topic, content, difficulty = 'medium', questionCount = 10 } = params

  const systemPrompt = `Eres un generador de exámenes educativos. Crea preguntas desafiantes y educativas.`
  
  const prompt = `Genera un examen sobre: ${topic}

CONTENIDO BASE:
${content.substring(0, 2000)}

Genera ${questionCount} preguntas en formato JSON:
{
  "questions": [
    {
      "id": 1,
      "type": "multiple-choice",
      "question": "¿Pregunta clara?",
      "options": ["opción A", "opción B", "opción C", "opción D"],
      "correctAnswer": 0,
      "explanation": "explicación educativa",
      "difficulty": "${difficulty}",
      "points": 10
    }
  ],
  "totalPoints": ${questionCount * 10}
}

DISTRIBUCIÓN:
- 60% multiple-choice (4 opciones)
- 30% true-false
- 10% short-answer

DIFICULTAD: ${difficulty}
- easy: 5-8 puntos
- medium: 8-12 puntos  
- hard: 12-15 puntos

Las preguntas deben cubrir diferentes aspectos del contenido.`

  try {
    const response = await generateWithOllama(prompt, systemPrompt)
    
    const jsonMatch = response.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      return safeJsonParse(jsonMatch[0])
    }
    
    throw new Error('No se pudo generar el examen correctamente')
  } catch (error) {
    console.error('Error generando examen con Ollama:', error)
    throw new Error('No se pudo generar el examen con Ollama')
  }
}
