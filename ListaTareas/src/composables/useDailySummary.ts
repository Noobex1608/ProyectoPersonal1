import { ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useTodosStore } from '../stores/todos'
import { generateDailySummary } from '../services/gemini'

export interface DailySummary {
  date: string
  completedCount: number
  pendingCount: number
  overdueCount: number
  highlights: string[]
  recommendations: string[]
  motivationalMessage: string
}

export function useDailySummary() {
  const todosStore = useTodosStore()
  const { todos } = storeToRefs(todosStore)
  
  const isGenerating = ref(false)
  const summary = ref<DailySummary | null>(null)
  const error = ref<string | null>(null)

  const generate = async () => {
    isGenerating.value = true
    error.value = null
    
    try {
      const today = new Date().toISOString().split('T')[0]
      
      // Filtrar tareas del día
      const todayTasks = todos.value.filter(t => {
        if (t.due_date === today) return true
        if (t.completed_at) {
          // @ts-ignore - completed_at is verified to exist
          return t.completed_at.startsWith(today)
        }
        return false
      })
      
      const completed = todayTasks.filter(t => t.status === 'completed')
      const pending = todayTasks.filter(t => t.status !== 'completed' && t.due_date === today)
      const overdue = todos.value.filter(t => {
        if (t.status === 'completed' || !t.due_date) return false
        // @ts-ignore - due_date is verified to exist
        return new Date(t.due_date) < new Date(today)
      })

      const summaryData = {
        date: today,
        tasks: todayTasks.map(t => ({
          title: t.title,
          priority: t.priority,
          completed: t.status === 'completed',
          due_date: t.due_date
        })),
        completed: completed.length,
        pending: pending.length,
        overdue: overdue.length
      }

      const result = await generateDailySummary(summaryData)
      summary.value = result
      
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Error al generar resumen'
      console.error('Error generando resumen diario:', err)
    } finally {
      isGenerating.value = false
    }
  }

  return {
    summary,
    isGenerating,
    error,
    generate
  }
}
