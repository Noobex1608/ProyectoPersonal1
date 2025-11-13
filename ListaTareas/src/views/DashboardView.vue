<template>
  <div class="dashboard-view">
    <NavBar />
    
    <div class="container">
      <div class="dashboard-header">
        <h1>Dashboard</h1>
        <p class="greeting">
          <span>Hola, {{ profile?.full_name || 'Usuario' }}</span>
          <HandRaisedIcon class="greeting-icon" />
        </p>
      </div>

      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-icon">
            <ClipboardDocumentListIcon class="icon" />
          </div>
          <div class="stat-content">
            <h3>{{ totalTodos }}</h3>
            <p>Total de tareas</p>
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-icon">
            <ClockIcon class="icon" />
          </div>
          <div class="stat-content">
            <h3>{{ pendingTodos }}</h3>
            <p>Pendientes</p>
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-icon">
            <CheckCircleIcon class="icon" />
          </div>
          <div class="stat-content">
            <h3>{{ completedTodos }}</h3>
            <p>Completadas</p>
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-icon">
            <ExclamationTriangleIcon class="icon" />
          </div>
          <div class="stat-content">
            <h3>{{ overdueTodos }}</h3>
            <p>Vencidas</p>
          </div>
        </div>
      </div>

      <div class="content-grid">
        <div class="section">
          <div class="section-header">
            <h2>Tareas de hoy</h2>
            <router-link to="/todos" class="link">Ver todas →</router-link>
          </div>
          
          <div v-if="loading" class="loading">Cargando...</div>
          
          <div v-else-if="todayTodosList.length === 0" class="empty-state">
            <SparklesIcon class="empty-icon" />
            <p>No tienes tareas para hoy</p>
          </div>
          
          <div v-else class="todos-list">
            <TodoItem 
              v-for="todo in todayTodosList" 
              :key="todo.id" 
              :todo="todo"
              @toggle="toggleTodo"
              @edit="editTodo"
              @delete="deleteTodo"
            />
          </div>
        </div>

        <div class="section">
          <div class="section-header">
            <h2>Vencidas</h2>
          </div>
          
          <div v-if="loading" class="loading">Cargando...</div>
          
          <div v-else-if="overdueTodosList.length === 0" class="empty-state">
            <SparklesIcon class="empty-icon" />
            <p>No tienes tareas vencidas</p>
          </div>
          
          <div v-else class="todos-list">
            <TodoItem 
              v-for="todo in overdueTodosList" 
              :key="todo.id" 
              :todo="todo"
              @toggle="toggleTodo"
              @edit="editTodo"
              @delete="deleteTodo"
            />
          </div>
        </div>
      </div>
    </div>

    <TodoForm 
      v-if="showForm" 
      :todo="selectedTodo"
      @close="closeForm"
      @submit="handleSubmit"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useAuthStore } from '../stores/auth'
import { useTodosStore } from '../stores/todos'
import { useToast } from '../composables/useToast'
import NavBar from '../components/NavBar.vue'
import TodoItem from '../components/TodoItem.vue'
import TodoForm from '../components/TodoForm.vue'
import type { TodoWithRelations, TodoInsert, TodoUpdate } from '../interfaces'
import { 
  ClipboardDocumentListIcon,
  ClockIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  HandRaisedIcon,
  SparklesIcon
} from '@heroicons/vue/24/outline'

const authStore = useAuthStore()
const todosStore = useTodosStore()
const { success, error } = useToast()

const loading = ref(true)
const showForm = ref(false)
const selectedTodo = ref<TodoWithRelations | null>(null)

const profile = computed(() => authStore.profile)
const todos = computed(() => todosStore.todos)
const todayTodosList = computed(() => todosStore.todayTodos)
const overdueTodosList = computed(() => todosStore.overdueTodos)

const totalTodos = computed(() => todos.value.length)
const pendingTodos = computed(() => todosStore.pendingTodos.length)
const completedTodos = computed(() => todosStore.completedTodos.length)
const overdueTodos = computed(() => overdueTodosList.value.length)

onMounted(async () => {
  loading.value = true
  try {
    await todosStore.fetchTodos()
  } finally {
    loading.value = false
  }
})

async function toggleTodo(id: string) {
  try {
    const result = await todosStore.toggleTodoStatus(id)
    if (result?.error) {
      console.error('Error toggling todo:', result.error)
      error('Error al actualizar la tarea')
    } else {
      success('Tarea actualizada')
    }
  } catch (err) {
    console.error('Error en toggleTodo:', err)
    error('Error inesperado')
  }
}

function editTodo(todo: TodoWithRelations) {
  selectedTodo.value = todo
  showForm.value = true
}

async function deleteTodo(id: string) {
  if (!confirm('¿Estás seguro de eliminar esta tarea?')) return
  
  try {
    const result = await todosStore.deleteTodo(id)
    if (result.error) {
      console.error('Error deleting todo:', result.error)
      error('Error al eliminar la tarea')
    } else {
      success('Tarea eliminada')
    }
  } catch (err) {
    console.error('Error en deleteTodo:', err)
    error('Error inesperado')
  }
}

async function handleSubmit(data: TodoInsert | TodoUpdate) {
  try {
    if (selectedTodo.value) {
      const result = await todosStore.updateTodo(selectedTodo.value.id, data as TodoUpdate)
      if (result?.error) {
        console.error('Error updating todo:', result.error)
        error('Error al actualizar la tarea')
      } else {
        success('Tarea actualizada')
        closeForm()
      }
    }
  } catch (err) {
    console.error('Error en handleSubmit:', err)
    error('Error inesperado')
  }
}

function closeForm() {
  showForm.value = false
  selectedTodo.value = null
}
</script>

<style scoped>
.dashboard-view {
  min-height: 100vh;
  background: #f9fafb;
}

.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
}

.dashboard-header {
  margin-bottom: 2rem;
}

.dashboard-header h1 {
  margin: 0 0 0.5rem 0;
  font-size: 2rem;
  color: #111827;
}

.dashboard-header p {
  margin: 0;
  font-size: 1.1rem;
  color: #6b7280;
}

.greeting {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.greeting-icon {
  width: 1.5rem;
  height: 1.5rem;
  color: var(--color-sandy);
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1.5rem;
  margin-bottom: 2rem;
}

.stat-card {
  background: white;
  border-radius: 12px;
  padding: 1.5rem;
  display: flex;
  align-items: center;
  gap: 1rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.stat-icon {
  width: 3rem;
  height: 3rem;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--color-gray-100);
  border-radius: 12px;
}

.stat-icon .icon {
  width: 2rem;
  height: 2rem;
  color: var(--color-primary);
}

.stat-content h3 {
  margin: 0 0 0.25rem 0;
  font-size: 2rem;
  color: #111827;
}

.stat-content p {
  margin: 0;
  color: #6b7280;
  font-size: 0.95rem;
}

.content-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(500px, 1fr));
  gap: 2rem;
}

.section {
  background: white;
  border-radius: 12px;
  padding: 1.5rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
  padding-bottom: 1rem;
  border-bottom: 2px solid #e5e7eb;
}

.section-header h2 {
  margin: 0;
  font-size: 1.5rem;
  color: #111827;
}

.link {
  color: #3b82f6;
  text-decoration: none;
  font-weight: 500;
}

.link:hover {
  text-decoration: underline;
}

.todos-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.loading, .empty-state {
  text-align: center;
  padding: 2rem;
  color: #6b7280;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
}

.empty-icon {
  width: 3rem;
  height: 3rem;
  color: var(--color-primary);
  opacity: 0.6;
}

.empty-state p {
  font-size: 1.1rem;
}

@media (max-width: 1024px) {
  .content-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 640px) {
  .container {
    padding: 1rem;
  }

  .stats-grid {
    grid-template-columns: 1fr;
  }
}
</style>
