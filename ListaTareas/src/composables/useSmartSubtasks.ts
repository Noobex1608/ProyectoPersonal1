import { ref } from 'vue'
import { generateSubtasks } from '../services/gemini'

export interface Subtask {
  title: string
  description: string
  estimatedTime: string
  order: number
}

export function useSmartSubtasks() {
  const isGenerating = ref(false)
  const subtasks = ref<Subtask[]>([])
  const error = ref<string | null>(null)

  const generate = async (taskTitle: string, taskDescription?: string) => {
    isGenerating.value = true
    error.value = null
    subtasks.value = []
    
    try {
      const generated = await generateSubtasks(taskTitle, taskDescription)
      subtasks.value = generated
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Error al generar subtareas'
      console.error('Error generando subtareas:', err)
    } finally {
      isGenerating.value = false
    }
  }

  const clear = () => {
    subtasks.value = []
    error.value = null
  }

  return {
    subtasks,
    isGenerating,
    error,
    generate,
    clear
  }
}
