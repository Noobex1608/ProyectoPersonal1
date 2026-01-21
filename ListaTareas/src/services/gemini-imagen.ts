/**
 * Servicio para Google Gemini 2.5 Flash Image (Nano Banana)
 * Generación de imágenes de mapas mentales
 */

import { GoogleGenAI } from "@google/genai"

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY

export class ImagenError extends Error {
  statusCode?: number
  isRateLimitError: boolean
  
  constructor(
    message: string,
    statusCode?: number,
    isRateLimitError: boolean = false
  ) {
    super(message)
    this.name = 'ImagenError'
    this.statusCode = statusCode
    this.isRateLimitError = isRateLimitError
  }
}

/**
 * Extrae los puntos clave de un contenido para optimizar el prompt
 */
function extractKeyPoints(content: string): string {
  // Asegurar que content sea un string
  if (typeof content !== 'string') {
    console.warn('⚠️ extractKeyPoints recibió un tipo no-string:', typeof content)
    return String(content).substring(0, 500)
  }
  
  const lines = content.split('\n')
  const keyPoints: string[] = []
  
  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed) continue
    
    // Capturar encabezados (###, ##, #)
    if (trimmed.match(/^#{1,3}\s/)) {
      keyPoints.push(trimmed.replace(/^#+\s/, ''))
      continue
    }
    
    // Capturar puntos clave (-, *)
    if (trimmed.match(/^[-*]\s/)) {
      keyPoints.push(trimmed.replace(/^[-*]\s/, ''))
      continue
    }
    
    // Capturar texto en negrita (**texto**)
    const boldMatches = trimmed.match(/\*\*(.+?)\*\*/g)
    if (boldMatches) {
      boldMatches.forEach(match => {
        keyPoints.push(match.replace(/\*\*/g, ''))
      })
    }
  }
  
  // Limitar a máximo 15 puntos clave y 500 caracteres
  const result = keyPoints.slice(0, 15).join('\n')
  return result.substring(0, 500)
}

/**
 * Genera una imagen de mapa mental usando Gemini 2.5 Flash Image
 */
export async function generateMindMapImageWithImagen(
  content: string,
  topic?: string
): Promise<string> {
  if (!GEMINI_API_KEY) {
    throw new ImagenError('GEMINI_API_KEY no está configurada')
  }

  // Extraer solo los puntos clave del contenido
  const keyPoints = extractKeyPoints(content)
  const mainTopic = topic || keyPoints.split('\n')[0] || 'Mapa Mental'

  const prompt = `Genera una imagen de un mapa mental visual y profesional sobre: "${mainTopic}"

Contenido clave:
${keyPoints}

Requisitos:
- Diseño claro con "${mainTopic}" en el centro
- Usa colores distintos para cada rama principal
- Tipografía legible y jerarquía visual clara
- Estilo moderno y profesional
- Conexiones visuales entre conceptos`

  try {
    const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY })
    
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-image",
      contents: prompt,
    })

    // Buscar la parte con datos de imagen
    const parts = response.candidates?.[0]?.content?.parts
    
    if (!parts || parts.length === 0) {
      throw new ImagenError('No se generó ninguna imagen')
    }

    for (const part of parts) {
      if (part.inlineData) {
        const imageData = part.inlineData.data
        const mimeType = part.inlineData.mimeType || 'image/png'
        
        // Retornar la imagen en base64 con prefijo data URL
        return `data:${mimeType};base64,${imageData}`
      }
    }

    throw new ImagenError('No se encontró datos de imagen en la respuesta')

  } catch (error: any) {
    // Detectar error de límite de cuota
    if (error?.message?.includes('429') || error?.message?.toLowerCase().includes('quota') || error?.status === 429) {
      throw new ImagenError(
        'Límite de cuota de Gemini Imagen superado',
        429,
        true
      )
    }
    
    if (error instanceof ImagenError) {
      throw error
    }
    
    throw new ImagenError(
      error instanceof Error ? error.message : 'Error desconocido con Gemini Imagen'
    )
  }
}

