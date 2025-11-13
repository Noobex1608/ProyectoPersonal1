import { ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useTodosStore } from '../stores/todos'
import { detectTimeConflicts } from '../services/gemini'

export interface TimeConflict {
  date: string
  tasks: {
    id: number
    title: string
    priority: string
  }[]
  reason: string
  suggestion: string
}

export function useTimeConflictDetector() {
  const todosStore = useTodosStore()
  const { todos } = storeToRefs(todosStore)
  
  const isDetecting = ref(false)
  const conflicts = ref<TimeConflict[]>([])
  const error = ref<string | null>(null)

  const detect = async () => {
    isDetecting.value = true
    error.value = null
    conflicts.value = []
    
    try {
      // Agrupar tareas por fecha
      const tasksByDate = new Map<string, typeof todos.value>()
      
      todos.value.forEach(task => {
        if (task.due_date && task.status !== 'completed') {
          const date = task.due_date
          if (!tasksByDate.has(date)) {
            tasksByDate.set(date, [])
          }
          tasksByDate.get(date)!.push(task)
        }
      })

      // Analizar días con múltiples tareas
      const potentialConflicts = Array.from(tasksByDate.entries())
        .filter(([_, tasks]) => tasks.length > 2)
        .map(([date, tasks]) => ({
          date,
          tasks: tasks.map(t => ({
            id: t.id,
            title: t.title,
            priority: t.priority,
            description: t.description
          }))
        }))

      if (potentialConflicts.length > 0) {
        const detected = await detectTimeConflicts(potentialConflicts)
        conflicts.value = detected
      }
      
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Error al detectar conflictos'
      console.error('Error detectando conflictos:', err)
    } finally {
      isDetecting.value = false
    }
  }

  return {
    conflicts,
    isDetecting,
    error,
    detect
  }
}
