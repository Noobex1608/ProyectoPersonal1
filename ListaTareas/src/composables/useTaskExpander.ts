import { ref } from 'vue'
import { expandTask } from '../services/gemini'

export interface ExpandedTask {
  title: string
  description: string
  suggestedTags: string[]
  estimatedDuration: string
  detailedSteps: string[]
}

export function useTaskExpander() {
  const isExpanding = ref(false)
  const expandedTask = ref<ExpandedTask | null>(null)
  const error = ref<string | null>(null)

  const expand = async (vagueTask: string) => {
    isExpanding.value = true
    error.value = null
    expandedTask.value = null
    
    try {
      const result = await expandTask(vagueTask)
      expandedTask.value = result
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Error al expandir tarea'
      console.error('Error expandiendo tarea:', err)
    } finally {
      isExpanding.value = false
    }
  }

  const clear = () => {
    expandedTask.value = null
    error.value = null
  }

  return {
    expandedTask,
    isExpanding,
    error,
    expand,
    clear
  }
}
