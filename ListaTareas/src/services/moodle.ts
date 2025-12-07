/**
 * Servicio para parsear y sincronizar calendarios iCal de Moodle
 */

export interface MoodleEvent {
  uid: string
  summary: string
  description: string | null
  dtstart: Date
  dtend: Date | null
  location: string | null
  categories: string[]
  url: string | null
}

export interface ParsedICalResult {
  events: MoodleEvent[]
  errors: string[]
}

/**
 * Parsea una fecha iCal (formato: 20251201T235959Z o 20251201)
 */
function parseICalDate(dateStr: string): Date | null {
  if (!dateStr) return null
  
  // Remover cualquier parámetro adicional (ej: TZID=...)
  const cleanDate = dateStr.split(':').pop() || dateStr
  
  try {
    // Formato: YYYYMMDDTHHMMSSZ (UTC)
    if (cleanDate.includes('T')) {
      const year = parseInt(cleanDate.substring(0, 4))
      const month = parseInt(cleanDate.substring(4, 6)) - 1
      const day = parseInt(cleanDate.substring(6, 8))
      const hour = parseInt(cleanDate.substring(9, 11)) || 0
      const minute = parseInt(cleanDate.substring(11, 13)) || 0
      const second = parseInt(cleanDate.substring(13, 15)) || 0
      
      if (cleanDate.endsWith('Z')) {
        return new Date(Date.UTC(year, month, day, hour, minute, second))
      }
      return new Date(year, month, day, hour, minute, second)
    }
    
    // Formato: YYYYMMDD (todo el día)
    const year = parseInt(cleanDate.substring(0, 4))
    const month = parseInt(cleanDate.substring(4, 6)) - 1
    const day = parseInt(cleanDate.substring(6, 8))
    return new Date(year, month, day, 23, 59, 59)
  } catch (e) {
    console.error('Error parsing iCal date:', dateStr, e)
    return null
  }
}

/**
 * Decodifica texto escapado de iCal
 */
function decodeICalText(text: string): string {
  if (!text) return ''
  
  return text
    .replace(/\\n/g, '\n')
    .replace(/\\,/g, ',')
    .replace(/\\;/g, ';')
    .replace(/\\\\/g, '\\')
    .replace(/\\N/g, '\n')
}

/**
 * Extrae la URL de una descripción de Moodle
 */
function extractUrlFromDescription(description: string): string | null {
  if (!description) return null
  
  const urlMatch = description.match(/https?:\/\/[^\s<>"]+/i)
  return urlMatch ? urlMatch[0] : null
}

/**
 * Parsea el contenido de un archivo iCal
 */
export function parseICalContent(icalContent: string): ParsedICalResult {
  const events: MoodleEvent[] = []
  const errors: string[] = []
  
  // Normalizar líneas (iCal puede tener líneas continuadas con espacios)
  const normalizedContent = icalContent
    .replace(/\r\n/g, '\n')
    .replace(/\n /g, '')
    .replace(/\n\t/g, '')
  
  const lines = normalizedContent.split('\n')
  
  let currentEvent: Partial<MoodleEvent> | null = null
  let inEvent = false
  
  for (const line of lines) {
    const trimmedLine = line.trim()
    
    if (trimmedLine === 'BEGIN:VEVENT') {
      inEvent = true
      currentEvent = {
        categories: []
      }
      continue
    }
    
    if (trimmedLine === 'END:VEVENT') {
      if (currentEvent && currentEvent.uid && currentEvent.summary && currentEvent.dtstart) {
        events.push(currentEvent as MoodleEvent)
      } else if (currentEvent) {
        errors.push(`Evento incompleto: ${currentEvent.summary || 'Sin título'}`)
      }
      currentEvent = null
      inEvent = false
      continue
    }
    
    if (!inEvent || !currentEvent) continue
    
    // Parsear propiedades
    const colonIndex = trimmedLine.indexOf(':')
    if (colonIndex === -1) continue
    
    const propertyPart = trimmedLine.substring(0, colonIndex)
    const valuePart = trimmedLine.substring(colonIndex + 1)
    
    // El nombre de la propiedad puede tener parámetros (ej: DTSTART;TZID=...)
    const propertyNamePart = propertyPart.split(';')[0]
    if (!propertyNamePart) continue
    const propertyName = propertyNamePart.toUpperCase()
    
    switch (propertyName) {
      case 'UID':
        currentEvent.uid = valuePart
        break
      case 'SUMMARY':
        currentEvent.summary = decodeICalText(valuePart)
        break
      case 'DESCRIPTION':
        currentEvent.description = decodeICalText(valuePart)
        currentEvent.url = extractUrlFromDescription(currentEvent.description)
        break
      case 'DTSTART':
        currentEvent.dtstart = parseICalDate(valuePart) || new Date()
        break
      case 'DTEND':
        currentEvent.dtend = parseICalDate(valuePart)
        break
      case 'LOCATION':
        currentEvent.location = decodeICalText(valuePart)
        break
      case 'CATEGORIES':
        currentEvent.categories = valuePart.split(',').map(c => c.trim())
        break
      case 'URL':
        if (!currentEvent.url) {
          currentEvent.url = valuePart
        }
        break
    }
  }
  
  return { events, errors }
}

/**
 * Filtra eventos para obtener solo tareas/assignments
 * Moodle usa categorías específicas para identificar tipos de eventos
 */
export function filterMoodleAssignments(events: MoodleEvent[]): MoodleEvent[] {
  return events.filter(event => {
    const titleLower = event.summary.toLowerCase()
    
    // EXCLUIR eventos de asistencia y otros no relevantes
    const isExcluded = 
      titleLower.includes('asistencia') ||
      titleLower.includes('attendance') ||
      titleLower.includes('sesión abierta') ||
      titleLower.includes('session open')
    
    if (isExcluded) return false
    
    // Filtrar por categorías típicas de Moodle para tareas
    const isAssignment = event.categories.some(cat => 
      cat.toLowerCase().includes('assignment') ||
      cat.toLowerCase().includes('tarea') ||
      cat.toLowerCase().includes('quiz') ||
      cat.toLowerCase().includes('examen') ||
      cat.toLowerCase().includes('entrega')
    )
    
    // También incluir si el título sugiere que es una tarea
    const titleSuggestsTask = 
      titleLower.includes('entrega') ||
      titleLower.includes('fecha límite') ||
      titleLower.includes('due') ||
      titleLower.includes('vence') ||
      titleLower.includes('tarea')
    
    // Incluir todos los eventos que parezcan tareas o que tengan fecha futura
    return isAssignment || titleSuggestsTask || event.dtstart > new Date()
  })
}

/**
 * Determina la prioridad basada en la fecha de vencimiento
 */
export function determinePriority(dueDate: Date): 'low' | 'medium' | 'high' | 'urgent' {
  const now = new Date()
  const diffHours = (dueDate.getTime() - now.getTime()) / (1000 * 60 * 60)
  
  if (diffHours < 24) return 'urgent'
  if (diffHours < 72) return 'high' // 3 días
  if (diffHours < 168) return 'medium' // 7 días
  return 'low'
}

/**
 * Convierte un evento de Moodle a formato de tarea de la app
 */
export function moodleEventToTask(event: MoodleEvent) {
  // Limpiar el título (Moodle a veces agrega prefijos)
  let cleanTitle = event.summary
    .replace(/^\[.*?\]\s*/, '') // Remover [Curso]
    .replace(/is due$/, '') // Remover "is due"
    .replace(/vence$/, '') // Remover "vence"
    .trim()
  
  // Extraer nombre del curso de las categorías o descripción
  const courseName = event.categories[0] || null
  
  return {
    title: cleanTitle,
    description: event.description 
      ? `${event.description}${event.url ? `\n\n🔗 ${event.url}` : ''}` 
      : (event.url ? `🔗 ${event.url}` : null),
    due_date: event.dtstart.toISOString(),
    priority: determinePriority(event.dtstart),
    status: 'pending' as const,
    moodle_uid: event.uid, // ID único para evitar duplicados
    moodle_url: event.url,
    source: 'moodle' as const,
    course_name: courseName
  }
}

/**
 * Obtiene y parsea un calendario iCal desde una URL
 * Nota: Esto debe ejecutarse desde el servidor debido a CORS
 */
export async function fetchAndParseICalFromServer(icalUrl: string): Promise<ParsedICalResult> {
  try {
    // Esta función está diseñada para ser llamada desde Edge Functions
    // donde no hay restricciones de CORS
    const response = await fetch(icalUrl)
    
    if (!response.ok) {
      return {
        events: [],
        errors: [`Error al obtener calendario: ${response.status} ${response.statusText}`]
      }
    }
    
    const content = await response.text()
    return parseICalContent(content)
  } catch (error) {
    return {
      events: [],
      errors: [`Error de conexión: ${error instanceof Error ? error.message : 'Error desconocido'}`]
    }
  }
}
