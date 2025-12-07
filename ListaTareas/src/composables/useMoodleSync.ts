import { ref, computed } from 'vue'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../stores/auth'
import { useTodosStore } from '../stores/todos'
import { useToast } from './useToast'
import { 
  parseICalContent, 
  filterMoodleAssignments, 
  moodleEventToTask,
  type MoodleEvent 
} from '../services/moodle'

export interface MoodleSyncResult {
  success: boolean
  added: number
  skipped: number
  errors: string[]
}

export function useMoodleSync() {
  const authStore = useAuthStore()
  const todosStore = useTodosStore()
  const { success, error: showError } = useToast()
  
  const syncing = ref(false)
  const lastSyncDate = ref<Date | null>(null)
  const syncResult = ref<MoodleSyncResult | null>(null)
  
  const moodleUrl = computed(() => authStore.profile?.moodle_ical_url || null)
  const isMoodleConfigured = computed(() => !!moodleUrl.value)
  
  /**
   * Guarda la URL del calendario iCal de Moodle en el perfil
   */
  async function saveMoodleUrl(url: string): Promise<boolean> {
    if (!authStore.user) return false
    
    // Validar que sea una URL válida
    try {
      new URL(url)
    } catch {
      showError('La URL no es válida')
      return false
    }
    
    // Validar que parezca una URL de calendario
    if (!url.includes('calendar') && !url.includes('ical') && !url.includes('.ics')) {
      showError('La URL no parece ser un calendario iCal válido')
      return false
    }
    
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ moodle_ical_url: url })
        .eq('id', authStore.user.id)
      
      if (error) throw error
      
      // Actualizar el store local
      await authStore.fetchProfile()
      success('URL de Moodle guardada correctamente')
      return true
    } catch (err) {
      console.error('Error guardando URL de Moodle:', err)
      showError('Error al guardar la configuración de Moodle')
      return false
    }
  }
  
  /**
   * Elimina la configuración de Moodle
   */
  async function removeMoodleConfig(): Promise<boolean> {
    if (!authStore.user) return false
    
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ moodle_ical_url: null })
        .eq('id', authStore.user.id)
      
      if (error) throw error
      
      await authStore.fetchProfile()
      success('Configuración de Moodle eliminada')
      return true
    } catch (err) {
      console.error('Error eliminando config de Moodle:', err)
      showError('Error al eliminar la configuración')
      return false
    }
  }
  
  /**
   * Sincroniza las tareas desde Moodle
   */
  async function syncMoodleTasks(): Promise<MoodleSyncResult> {
    if (!moodleUrl.value || !authStore.user) {
      return { success: false, added: 0, skipped: 0, errors: ['Moodle no está configurado'] }
    }
    
    syncing.value = true
    const result: MoodleSyncResult = {
      success: false,
      added: 0,
      skipped: 0,
      errors: []
    }
    
    try {
      // Llamar a la Edge Function para obtener el calendario (evita CORS)
      const { data, error } = await supabase.functions.invoke('smooth-action', {
        body: { icalUrl: moodleUrl.value }
      })
      
      if (error) {
        throw new Error(error.message || 'Error al sincronizar con Moodle')
      }
      
      if (!data || !data.events) {
        throw new Error('No se recibieron datos del calendario')
      }
      
      const events: MoodleEvent[] = data.events.map((e: any) => ({
        ...e,
        dtstart: new Date(e.dtstart),
        dtend: e.dtend ? new Date(e.dtend) : null
      }))
      
      // Filtrar solo tareas relevantes
      const assignments = filterMoodleAssignments(events)
      
      // Obtener tareas existentes para evitar duplicados
      const { data: existingTasks } = await supabase
        .from('todos')
        .select('moodle_uid')
        .eq('user_id', authStore.user.id)
        .not('moodle_uid', 'is', null)
      
      const existingUids = new Set(existingTasks?.map(t => t.moodle_uid) || [])
      
      // Procesar cada tarea
      for (const event of assignments) {
        if (existingUids.has(event.uid)) {
          result.skipped++
          continue
        }
        
        try {
          const taskData = moodleEventToTask(event)
          
          const { error: insertError } = await supabase
            .from('todos')
            .insert({
              user_id: authStore.user.id,
              title: taskData.title,
              description: taskData.description,
              due_date: taskData.due_date,
              priority: taskData.priority,
              status: 'pending',
              moodle_uid: taskData.moodle_uid
            })
          
          if (insertError) {
            result.errors.push(`Error al crear tarea "${taskData.title}": ${insertError.message}`)
          } else {
            result.added++
          }
        } catch (err) {
          result.errors.push(`Error procesando evento: ${err instanceof Error ? err.message : 'Error desconocido'}`)
        }
      }
      
      // Refrescar la lista de tareas
      await todosStore.fetchTodos()
      
      result.success = true
      lastSyncDate.value = new Date()
      syncResult.value = result
      
      if (result.added > 0) {
        success(`✅ ${result.added} tarea(s) importada(s) desde Moodle`)
      } else if (result.skipped > 0) {
        success(`No hay tareas nuevas (${result.skipped} ya existían)`)
      } else {
        success('No se encontraron tareas para importar')
      }
      
    } catch (err) {
      console.error('Error sincronizando con Moodle:', err)
      result.errors.push(err instanceof Error ? err.message : 'Error desconocido')
      showError('Error al sincronizar con Moodle')
    } finally {
      syncing.value = false
    }
    
    return result
  }
  
  /**
   * Sincronización manual directa (sin Edge Function, para testing)
   * Nota: Esto solo funcionará si la URL de Moodle permite CORS
   */
  async function syncMoodleTasksDirect(): Promise<MoodleSyncResult> {
    if (!moodleUrl.value || !authStore.user) {
      return { success: false, added: 0, skipped: 0, errors: ['Moodle no está configurado'] }
    }
    
    syncing.value = true
    const result: MoodleSyncResult = {
      success: false,
      added: 0,
      skipped: 0,
      errors: []
    }
    
    try {
      // Intentar obtener el calendario directamente
      const response = await fetch(moodleUrl.value)
      
      if (!response.ok) {
        throw new Error(`Error HTTP: ${response.status}`)
      }
      
      const icalContent = await response.text()
      const parsed = parseICalContent(icalContent)
      
      if (parsed.errors.length > 0) {
        result.errors.push(...parsed.errors)
      }
      
      // Filtrar solo tareas
      const assignments = filterMoodleAssignments(parsed.events)
      
      // Obtener tareas existentes
      const { data: existingTasks } = await supabase
        .from('todos')
        .select('moodle_uid')
        .eq('user_id', authStore.user.id)
        .not('moodle_uid', 'is', null)
      
      const existingUids = new Set(existingTasks?.map(t => t.moodle_uid) || [])
      
      // Crear nuevas tareas
      for (const event of assignments) {
        if (existingUids.has(event.uid)) {
          result.skipped++
          continue
        }
        
        const taskData = moodleEventToTask(event)
        
        const createResult = await todosStore.createTodo({
          title: `📚 ${taskData.title}`,
          description: taskData.description,
          due_date: taskData.due_date,
          priority: taskData.priority,
          status: 'pending'
        })
        
        if (createResult.success) {
          // Actualizar con el UID de Moodle
          if (createResult.data?.id) {
            await supabase
              .from('todos')
              .update({ moodle_uid: taskData.moodle_uid })
              .eq('id', createResult.data.id)
          }
          result.added++
        } else {
          result.errors.push(`Error al crear: ${taskData.title}`)
        }
      }
      
      result.success = true
      lastSyncDate.value = new Date()
      syncResult.value = result
      
      if (result.added > 0) {
        success(`✅ ${result.added} tarea(s) importada(s) desde Moodle`)
      } else {
        success('No hay tareas nuevas para importar')
      }
      
    } catch (err) {
      console.error('Error sincronizando:', err)
      
      // Si hay error de CORS, sugerir usar la Edge Function
      if (err instanceof TypeError && err.message.includes('fetch')) {
        result.errors.push('Error de CORS. Usando sincronización del servidor...')
        // Intentar con Edge Function
        return syncMoodleTasks()
      }
      
      result.errors.push(err instanceof Error ? err.message : 'Error desconocido')
      showError('Error al sincronizar con Moodle')
    } finally {
      syncing.value = false
    }
    
    return result
  }
  
  return {
    // Estado
    syncing,
    lastSyncDate,
    syncResult,
    moodleUrl,
    isMoodleConfigured,
    
    // Acciones
    saveMoodleUrl,
    removeMoodleConfig,
    syncMoodleTasks,
    syncMoodleTasksDirect
  }
}
