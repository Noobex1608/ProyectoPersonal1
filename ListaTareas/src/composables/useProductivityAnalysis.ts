import { ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useTodosStore } from '../stores/todos'
import { analyzeProductivity } from '../services/gemini'

export interface ProductivityInsight {
  completionRate: number
  averageTimeToComplete: number
  mostProductiveTime: string
  tasksByPriority: {
    urgent: number
    high: number
    medium: number
    low: number
  }
  suggestions: string[]
  trends: {
    weeklyCompletion: number[]
    priorityDistribution: number[]
  }
}

export function useProductivityAnalysis() {
  const todosStore = useTodosStore()
  const { todos } = storeToRefs(todosStore)
  
  const isAnalyzing = ref(false)
  const insights = ref<ProductivityInsight | null>(null)
  const error = ref<string | null>(null)

  const analyze = async () => {
    isAnalyzing.value = true
    error.value = null
    
    try {
      // Preparar datos de tareas
      const completedTasks = todos.value.filter(t => t.status === 'completed')
      const pendingTasks = todos.value.filter(t => t.status !== 'completed')
      
      const taskData = {
        total: todos.value.length,
        completed: completedTasks.length,
        pending: pendingTasks.length,
        byPriority: {
          urgent: todos.value.filter(t => t.priority === 'urgent').length,
          high: todos.value.filter(t => t.priority === 'high').length,
          medium: todos.value.filter(t => t.priority === 'medium').length,
          low: todos.value.filter(t => t.priority === 'low').length,
        },
        tasks: todos.value.map(t => ({
          title: t.title,
          priority: t.priority,
          completed: t.status === 'completed',
          due_date: t.due_date,
          created_at: t.created_at,
          completed_at: t.completed_at
        }))
      }

      // Obtener análisis de IA
      const aiAnalysis = await analyzeProductivity(taskData)
      insights.value = aiAnalysis
      
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Error al analizar productividad'
      console.error('Error en análisis de productividad:', err)
    } finally {
      isAnalyzing.value = false
    }
  }

  return {
    insights,
    isAnalyzing,
    error,
    analyze
  }
}
