import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useAuthStore } from './auth'
import { TodoRepository } from '@/repositories'
import type { TodoInsert, TodoUpdate, TodoWithRelations } from '../interfaces'

export const useTodosStore = defineStore('todos', () => {
  const authStore = useAuthStore()
  const repository = new TodoRepository()
  
  const todos = ref<TodoWithRelations[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  // Computed
  const pendingTodos = computed(() => 
    todos.value.filter(t => t.status === 'pending')
  )

  const inProgressTodos = computed(() => 
    todos.value.filter(t => t.status === 'in_progress')
  )

  const completedTodos = computed(() => 
    todos.value.filter(t => t.status === 'completed')
  )

  const overdueTodos = computed(() => 
    todos.value.filter(t => {
      if (!t.due_date || t.status === 'completed') return false
      return new Date(t.due_date) < new Date()
    })
  )

  const todayTodos = computed(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    return todos.value.filter(t => {
      if (!t.due_date || t.status === 'completed') return false
      const dueDate = new Date(t.due_date)
      return dueDate >= today && dueDate < tomorrow
    })
  })

  // Actions
  async function fetchTodos() {
    if (!authStore.user) {
      loading.value = false
      return { success: false, error: 'Usuario no autenticado' }
    }

    // Si ya está cargando, retornar éxito con datos actuales (patrón encuestas)
    if (loading.value) {
      return { success: true, data: todos.value }
    }

    loading.value = true
    error.value = null

    try {
      todos.value = await repository.findAllWithRelations(authStore.user.id)
      return { success: true, data: todos.value }
    } catch (err: any) {
      error.value = err.message
      console.error('Error fetching todos:', err)
      return { success: false, error: err.message }
    } finally {
      loading.value = false
    }
  }

  async function createTodo(todoData: TodoInsert & { tags?: any[] }) {
    if (!authStore.user) {
      loading.value = false
      return { success: false, error: 'Usuario no autenticado' }
    }

    loading.value = true
    error.value = null

    try {
      // Separar las tags de los datos del todo
      const { tags: todoTags, ...todoInsertData } = todoData
      const tagIds = todoTags?.map(t => t.id) || []
      
      // Crear el todo usando el repository
      const fullTodo = await repository.createWithTags(todoInsertData, authStore.user.id, tagIds)
      
      // Agregar al estado local
      todos.value.unshift(fullTodo)

      return { success: true, data: fullTodo }
    } catch (err: any) {
      error.value = err.message
      console.error('Error creating todo:', err)
      return { success: false, error: err.message }
    } finally {
      loading.value = false
    }
  }

  async function updateTodo(id: string, updates: TodoUpdate & { tags?: any[] }) {
    loading.value = true
    error.value = null

    try {
      // Separar las tags de las actualizaciones
      const { tags: todoTags, ...todoUpdateData } = updates
      const tagIds = todoTags?.map(t => t.id)
      
      // Actualizar usando el repository
      const fullTodo = await repository.updateWithTags(id, todoUpdateData, tagIds)
      
      // Actualizar el estado local
      const index = todos.value.findIndex(t => t.id === id)
      if (index !== -1) {
        todos.value[index] = fullTodo
      }

      return { success: true, data: fullTodo }
    } catch (err: any) {
      error.value = err.message
      console.error('Error updating todo:', err)
      return { success: false, error: err.message }
    } finally {
      loading.value = false
    }
  }

  async function deleteTodo(id: string) {
    loading.value = true
    error.value = null

    try {
      await repository.delete(id)
      todos.value = todos.value.filter(t => t.id !== id)
      return { success: true }
    } catch (err: any) {
      error.value = err.message
      console.error('Error deleting todo:', err)
      return { success: false, error: err.message }
    } finally {
      loading.value = false
    }
  }

  async function toggleTodoStatus(id: string) {
    const todo = todos.value.find(t => t.id === id)
    if (!todo) return

    const newStatus = todo.status === 'completed' ? 'pending' : 'completed'
    const completed_at = newStatus === 'completed' ? new Date().toISOString() : null

    return updateTodo(id, { status: newStatus, completed_at })
  }

  async function addSubtask(todoId: string, title: string) {
    try {
      const data = await repository.addSubtask(todoId, title)

      // Update local todo
      const todo = todos.value.find(t => t.id === todoId)
      if (todo && data) {
        if (!todo.subtasks) todo.subtasks = []
        todo.subtasks.push(data)
      }

      return { data, error: null }
    } catch (err: any) {
      return { data: null, error: err }
    }
  }

  async function toggleSubtask(subtaskId: string, completed: boolean) {
    try {
      await repository.toggleSubtask(subtaskId, completed)

      // Update local state
      for (const todo of todos.value) {
        if (todo.subtasks) {
          const subtask = todo.subtasks.find(s => s.id === subtaskId)
          if (subtask) {
            subtask.completed = completed
            break
          }
        }
      }

      return { error: null }
    } catch (err: any) {
      return { error: err }
    }
  }

  async function deleteSubtask(subtaskId: string) {
    try {
      await repository.deleteSubtask(subtaskId)

      // Update local state
      for (const todo of todos.value) {
        if (todo.subtasks) {
          todo.subtasks = todo.subtasks.filter(s => s.id !== subtaskId)
        }
      }

      return { error: null }
    } catch (err: any) {
      return { error: err }
    }
  }

  function clearError() {
    error.value = null
  }

  return {
    todos,
    loading,
    error,
    pendingTodos,
    inProgressTodos,
    completedTodos,
    overdueTodos,
    todayTodos,
    fetchTodos,
    createTodo,
    updateTodo,
    deleteTodo,
    toggleTodoStatus,
    addSubtask,
    toggleSubtask,
    deleteSubtask,
    clearError
  }
})
