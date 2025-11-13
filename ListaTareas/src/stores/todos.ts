import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { supabase } from '../lib/supabase'
import { useAuthStore } from './auth'
import type { TodoInsert, TodoUpdate, TodoWithRelations } from '../interfaces'

export const useTodosStore = defineStore('todos', () => {
  const authStore = useAuthStore()
  
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
      const { data, error: fetchError } = await supabase
        .from('todos')
        .select(`
          *,
          category:categories(*),
          subtasks(*),
          tags:todo_tags(tag:tags(*))
        `)
        .eq('user_id', authStore.user.id)
        .order('created_at', { ascending: false })

      if (fetchError) throw fetchError
      
      // Transform the data to flatten tags
      todos.value = data?.map(todo => ({
        ...todo,
        tags: todo.tags?.map((t: any) => t.tag).filter(Boolean) || []
      })) || []
      
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

    // Verificar sesión antes de operación crítica (patrón encuestas)
    const sessionValid = await checkSession()
    if (!sessionValid) {
      loading.value = false
      error.value = 'Sesión expirada. Por favor, inicia sesión nuevamente.'
      return { success: false, error: error.value }
    }

    try {
      // Separar las tags de los datos del todo
      const { tags: todoTags, ...todoInsertData } = todoData
      
      // Crear el todo
      const { data, error: createError } = await supabase
        .from('todos')
        .insert({
          ...todoInsertData,
          user_id: authStore.user.id
        })
        .select()
        .single()

      if (createError) throw createError

      // Si hay tags, crear las relaciones
      if (data && todoTags && todoTags.length > 0) {
        const todoTagsInserts = todoTags.map(tag => ({
          todo_id: data.id,
          tag_id: tag.id
        }))

        const { error: tagsError } = await supabase
          .from('todo_tags')
          .insert(todoTagsInserts)

        if (tagsError) console.error('Error adding tags:', tagsError)
      }

      // Obtener el todo completo con relaciones
      const { data: fullTodo, error: fetchError } = await supabase
        .from('todos')
        .select(`
          *,
          category:categories(*),
          subtasks(*),
          tags:todo_tags(tag:tags(*))
        `)
        .eq('id', data.id)
        .single()

      if (fetchError) throw fetchError

      if (fullTodo) {
        const transformedTodo = {
          ...fullTodo,
          tags: fullTodo.tags?.map((t: any) => t.tag).filter(Boolean) || []
        }
        todos.value.unshift(transformedTodo)
      }

      return { success: true, data: fullTodo }
    } catch (err: any) {
      error.value = err.message
      console.error('Error creating todo:', err)
      return { success: false, error: err.message }
    } finally {
      loading.value = false
    }
  }

  // Helper para verificar sesión válida (patrón encuestas)
  const checkSession = async () => {
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      if (sessionError || !session) {
        console.warn('⚠️ Sesión inválida o expirada')
        return false
      }
      return true
    } catch (err) {
      console.error('❌ Error verificando sesión:', err)
      return false
    }
  }

  async function updateTodo(id: string, updates: TodoUpdate & { tags?: any[] }) {
    loading.value = true
    error.value = null
    
    // Verificar sesión antes de operación crítica (patrón encuestas)
    const sessionValid = await checkSession()
    if (!sessionValid) {
      loading.value = false
      error.value = 'Sesión expirada. Por favor, inicia sesión nuevamente.'
      return { success: false, error: error.value }
    }

    try {
      // Separar las tags de las actualizaciones
      const { tags: todoTags, ...todoUpdateData } = updates
      
      // Actualizar el todo
      const { error: updateError } = await supabase
        .from('todos')
        .update(todoUpdateData)
        .eq('id', id)
      
      if (updateError) throw updateError

      // Si se proporcionaron tags, actualizar las relaciones
      if (todoTags !== undefined) {
        // Eliminar las tags existentes
        await supabase
          .from('todo_tags')
          .delete()
          .eq('todo_id', id)

        // Insertar las nuevas tags
        if (todoTags.length > 0) {
          const todoTagsInserts = todoTags.map(tag => ({
            todo_id: id,
            tag_id: tag.id
          }))

          const { error: tagsError } = await supabase
            .from('todo_tags')
            .insert(todoTagsInserts)

          if (tagsError) console.error('Error updating tags:', tagsError)
        }
      }

      // Obtener el todo completo con relaciones
      const { data: fullTodo, error: fetchError } = await supabase
        .from('todos')
        .select(`
          *,
          category:categories(*),
          subtasks(*),
          tags:todo_tags(tag:tags(*))
        `)
        .eq('id', id)
        .single()

      if (fetchError) throw fetchError

      if (fullTodo) {
        const transformedTodo = {
          ...fullTodo,
          tags: fullTodo.tags?.map((t: any) => t.tag).filter(Boolean) || []
        }
        const index = todos.value.findIndex(t => t.id === id)
        if (index !== -1) {
          todos.value[index] = transformedTodo
        }
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

    // Verificar sesión antes de eliminar (patrón encuestas)
    const sessionValid = await checkSession()
    if (!sessionValid) {
      loading.value = false
      error.value = 'Sesión expirada. Por favor, inicia sesión nuevamente.'
      return { success: false, error: error.value }
    }

    try {
      const { error: deleteError } = await supabase
        .from('todos')
        .delete()
        .eq('id', id)

      if (deleteError) throw deleteError

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
      const { data, error: createError } = await supabase
        .from('subtasks')
        .insert({
          todo_id: todoId,
          title
        })
        .select()
        .single()

      if (createError) throw createError

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
      const { error: updateError } = await supabase
        .from('subtasks')
        .update({ completed })
        .eq('id', subtaskId)

      if (updateError) throw updateError

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
      const { error: deleteError } = await supabase
        .from('subtasks')
        .delete()
        .eq('id', subtaskId)

      if (deleteError) throw deleteError

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
