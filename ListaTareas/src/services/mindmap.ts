/**
 * Servicio para generar mapas mentales usando Agno
 * Conecta con el microservicio Python en Docker
 */

const MINDMAP_API_URL = import.meta.env.VITE_MINDMAP_API_URL || 'http://localhost:8000'

interface MindMapRequest {
  topic: string
  detail_level?: 'basic' | 'medium' | 'detailed'
}

interface MindMapResponse {
  mermaid_code: string
}

/**
 * Genera un mapa mental usando el microservicio de Agno
 */
export async function generateMindMap(request: MindMapRequest): Promise<string> {
  try {
    const response = await fetch(`${MINDMAP_API_URL}/generate-mindmap`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        topic: request.topic,
        detail_level: request.detail_level || 'medium'
      })
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.detail || `Error ${response.status}: ${response.statusText}`)
    }

    const data: MindMapResponse = await response.json()
    return data.mermaid_code

  } catch (error) {
    console.error('Error generando mapa mental:', error)
    throw new Error(
      error instanceof Error 
        ? error.message 
        : 'Error al conectar con el servicio de mapas mentales'
    )
  }
}

/**
 * Verifica si el servicio de mapas mentales está disponible
 */
export async function checkMindMapService(): Promise<boolean> {
  try {
    const response = await fetch(`${MINDMAP_API_URL}/docs`, {
      method: 'HEAD',
    })
    return response.ok
  } catch (error) {
    console.warn('Servicio de mapas mentales no disponible:', error)
    return false
  }
}
