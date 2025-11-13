import { ref } from 'vue'
import { suggestPriority } from '../services/gemini'

export type Priority = 'urgent' | 'high' | 'medium' | 'low'

export interface PrioritySuggestion {
  suggested: Priority
  reasoning: string
  confidence: number
}

export function useSmartPriority() {
  const isSuggesting = ref(false)
  const suggestion = ref<PrioritySuggestion | null>(null)
  const error = ref<string | null>(null)

  const suggest = async (taskTitle: string, dueDate?: string, description?: string) => {
    isSuggesting.value = true
    error.value = null
    suggestion.value = null
    
    try {
      const result = await suggestPriority(taskTitle, dueDate, description)
      suggestion.value = result
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Error al sugerir prioridad'
      console.error('Error sugiriendo prioridad:', err)
    } finally {
      isSuggesting.value = false
    }
  }

  const clear = () => {
    suggestion.value = null
    error.value = null
  }

  return {
    suggestion,
    isSuggesting,
    error,
    suggest,
    clear
  }
}
