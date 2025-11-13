import { ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useTagsStore } from '../stores/tags'
import { suggestTags } from '../services/gemini'

export function useSmartTags() {
  const tagsStore = useTagsStore()
  const { tags } = storeToRefs(tagsStore)
  
  const isSuggesting = ref(false)
  const suggestedTags = ref<string[]>([])
  const error = ref<string | null>(null)

  const suggest = async (taskTitle: string, taskDescription?: string) => {
    isSuggesting.value = true
    error.value = null
    suggestedTags.value = []
    
    try {
      // Pasar etiquetas existentes como contexto
      const existingTags = tags.value.map(t => t.name)
      const suggestions = await suggestTags(taskTitle, taskDescription, existingTags)
      suggestedTags.value = suggestions
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Error al sugerir etiquetas'
      console.error('Error sugiriendo etiquetas:', err)
    } finally {
      isSuggesting.value = false
    }
  }

  const clear = () => {
    suggestedTags.value = []
    error.value = null
  }

  return {
    suggestedTags,
    isSuggesting,
    error,
    suggest,
    clear
  }
}
