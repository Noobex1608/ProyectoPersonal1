<template>
  <div class="todos-view">
    <NavBar />
    <ChatBot />
    
    <div class="container">
      <!-- Panel de Asistente IA -->
      <AIAssistantPanel />
      
      <div class="todos-header">
        <h1>Mis Tareas</h1>
        <div class="header-actions">
          <button 
            v-if="completedCount > 0"
            @click="showDeleteCompletedModal = true" 
            class="btn-delete-completed"
          >
            <TrashIcon class="btn-icon" />
            Eliminar completadas ({{ completedCount }})
          </button>
          <button @click="openCreateForm" class="btn-primary">
            <PlusIcon class="btn-icon" />
            Nueva Tarea
          </button>
        </div>
      </div>

      <div class="filters">
        <div class="filter-group">
          <button 
            v-for="filter in filters" 
            :key="filter.value"
            @click="currentFilter = filter.value"
            :class="['filter-btn', { active: currentFilter === filter.value }]"
          >
            {{ filter.label }} ({{ filter.count }})
          </button>
        </div>

        <div class="search-box">
          <MagnifyingGlassIcon class="search-icon" />
          <input 
            type="text" 
            v-model="searchQuery"
            placeholder="Buscar tareas..."
          />
        </div>
      </div>

      <div v-if="loading" class="loading">Cargando tareas...</div>

      <div v-else-if="filteredTodos.length === 0" class="empty-state">
        <ClipboardDocumentListIcon class="empty-icon" />
        <p>No hay tareas que mostrar</p>
        <button @click="openCreateForm" class="btn-secondary">
          Crear tu primera tarea
        </button>
      </div>

      <div v-else class="todos-list">
        <TodoItem 
          v-for="todo in filteredTodos" 
          :key="todo.id" 
          :todo="todo"
          @toggle="toggleTodo"
          @edit="editTodo"
          @delete="deleteTodo"
        />
      </div>
    </div>

    <TodoForm 
      v-if="showForm" 
      :todo="selectedTodo"
      @close="closeForm"
      @submit="handleSubmit"
    />

    <!-- Modal de confirmación de eliminación -->
    <Teleport to="body">
      <div v-if="showDeleteModal" class="modal-overlay" @click="closeDeleteModal">
        <div class="modal-content" @click.stop>
          <div class="modal-header">
            <h3>Confirmar Eliminación</h3>
          </div>
          <div class="modal-body">
            <p>¿Estás seguro de eliminar esta tarea?</p>
            <p class="modal-warning">Esta acción no se puede deshacer.</p>
          </div>
          <div class="modal-footer">
            <button @click="closeDeleteModal" class="btn-cancel">
              Cancelar
            </button>
            <button @click="confirmDelete" class="btn-delete">
              Eliminar
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Modal de confirmación para eliminar completadas -->
    <Teleport to="body">
      <div v-if="showDeleteCompletedModal" class="modal-overlay" @click="showDeleteCompletedModal = false">
        <div class="modal-content" @click.stop>
          <div class="modal-header">
            <h3>Eliminar Tareas Completadas</h3>
          </div>
          <div class="modal-body">
            <p>¿Estás seguro de eliminar <strong>{{ completedCount }}</strong> tarea(s) completada(s)?</p>
            <p class="modal-warning">Esta acción no se puede deshacer.</p>
          </div>
          <div class="modal-footer">
            <button @click="showDeleteCompletedModal = false" class="btn-cancel">
              Cancelar
            </button>
            <button @click="deleteCompletedTodos" class="btn-delete">
              Eliminar Todas
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useTodosStore } from '../stores/todos'
import { useToast } from '../composables/useToast'
import NavBar from '../components/NavBar.vue'
import TodoItem from '../components/TodoItem.vue'
import TodoForm from '../components/TodoForm.vue'
import ChatBot from '../components/ChatBot.vue'
import AIAssistantPanel from '../components/AIAssistantPanel.vue'
import type { TodoWithRelations, TodoInsert, TodoUpdate } from '../interfaces'
import { 
  PlusIcon, 
  MagnifyingGlassIcon, 
  ClipboardDocumentListIcon,
  TrashIcon
} from '@heroicons/vue/24/outline'

const todosStore = useTodosStore()
const { success, error } = useToast()

// Usar loading del store (patrón AdminEncuestas)
const loading = computed(() => todosStore.loading)
const showForm = ref(false)
const selectedTodo = ref<TodoWithRelations | null>(null)
const currentFilter = ref('all')
const searchQuery = ref('')

// Modal de confirmación de eliminación
const showDeleteModal = ref(false)
const todoToDelete = ref<string | null>(null)

// Modal para eliminar completadas
const showDeleteCompletedModal = ref(false)
const completedCount = computed(() => todosStore.completedTodos.length)

const filters = computed(() => [
  { label: 'Todas', value: 'all', count: todosStore.todos.length },
  { label: 'Pendientes', value: 'pending', count: todosStore.pendingTodos.length },
  { label: 'En Progreso', value: 'in_progress', count: todosStore.inProgressTodos.length },
  { label: 'Completadas', value: 'completed', count: todosStore.completedTodos.length },
  { label: 'Vencidas', value: 'overdue', count: todosStore.overdueTodos.length }
])

const filteredTodos = computed(() => {
  let todos = todosStore.todos

  // Apply status filter
  if (currentFilter.value === 'pending') {
    todos = todosStore.pendingTodos
  } else if (currentFilter.value === 'in_progress') {
    todos = todosStore.inProgressTodos
  } else if (currentFilter.value === 'completed') {
    todos = todosStore.completedTodos
  } else if (currentFilter.value === 'overdue') {
    todos = todosStore.overdueTodos
  }

  // Apply search filter
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    todos = todos.filter(todo => 
      todo.title.toLowerCase().includes(query) ||
      todo.description?.toLowerCase().includes(query) ||
      todo.category?.name.toLowerCase().includes(query) ||
      todo.tags?.some(tag => tag.name.toLowerCase().includes(query))
    )
  }

  return todos
})

onMounted(async () => {
  // Solo cargar si no hay todos ya cargados (patrón AdminEncuestas)
  if (todosStore.todos.length > 0) {
    return
  }
  
  await todosStore.fetchTodos()
})

function openCreateForm() {
  selectedTodo.value = null
  showForm.value = true
}

function editTodo(todo: TodoWithRelations) {
  selectedTodo.value = todo
  showForm.value = true
}

async function toggleTodo(id: string) {
  const result = await todosStore.toggleTodoStatus(id)
  if (result?.success) {
    success('Tarea actualizada')
  } else {
    error('Error al actualizar la tarea')
  }
}

async function deleteTodo(id: string) {
  todoToDelete.value = id
  showDeleteModal.value = true
}

function closeDeleteModal() {
  showDeleteModal.value = false
  todoToDelete.value = null
}

async function confirmDelete() {
  if (!todoToDelete.value) return
  
  const result = await todosStore.deleteTodo(todoToDelete.value)
  if (result?.success) {
    success('Tarea eliminada')
  } else {
    error('Error al eliminar la tarea')
  }
  
  closeDeleteModal()
}

async function deleteCompletedTodos() {
  const completedTodos = todosStore.completedTodos
  let deletedCount = 0
  let errorCount = 0
  
  for (const todo of completedTodos) {
    const result = await todosStore.deleteTodo(todo.id)
    if (result?.success) {
      deletedCount++
    } else {
      errorCount++
    }
  }
  
  showDeleteCompletedModal.value = false
  
  if (deletedCount > 0) {
    success(`${deletedCount} tarea(s) eliminada(s)`)
  }
  if (errorCount > 0) {
    error(`Error al eliminar ${errorCount} tarea(s)`)
  }
}

async function handleSubmit(data: TodoInsert | TodoUpdate) {
  try {
    let result
    if (selectedTodo.value) {
      result = await todosStore.updateTodo(selectedTodo.value.id, data as TodoUpdate)
    } else {
      result = await todosStore.createTodo(data as TodoInsert)
    }

    if (result.success) {
      success(selectedTodo.value ? 'Tarea actualizada' : 'Tarea creada exitosamente')
      closeForm()
    } else {
      error(result.error || 'Error al procesar la tarea')
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
.todos-view {
  min-height: 100vh;
  background: #f9fafb;
}

.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
}

.todos-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
}

.todos-header h1 {
  margin: 0;
  font-size: 2rem;
  color: #111827;
}

.header-actions {
  display: flex;
  gap: 0.75rem;
  align-items: center;
}

.btn-delete-completed {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.25rem;
  background: #fef2f2;
  color: #dc2626;
  border: 1px solid #fecaca;
  border-radius: 6px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-delete-completed:hover {
  background: #fee2e2;
  border-color: #f87171;
}

.btn-delete-completed .btn-icon {
  width: 1.1rem;
  height: 1.1rem;
}

.btn-primary {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.5rem;
  background: #3b82f6;
  color: white;
  border: none;
  border-radius: 6px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.2s;
}

.btn-icon {
  width: 1.25rem;
  height: 1.25rem;
}

.btn-primary:hover {
  background: var(--color-primary-dark);
}

.btn-secondary {
  padding: 0.75rem 1.5rem;
  background: #f3f4f6;
  color: #374151;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-secondary:hover {
  background: #e5e7eb;
}

.filters {
  background: white;
  border-radius: 12px;
  padding: 1.5rem;
  margin-bottom: 1.5rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.filter-group {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  margin-bottom: 1rem;
}

.filter-btn {
  padding: 0.5rem 1rem;
  background: #f3f4f6;
  color: #6b7280;
  border: none;
  border-radius: 6px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.filter-btn:hover {
  background: #e5e7eb;
}

.filter-btn.active {
  background: var(--color-primary);
  color: white;
}

.search-box {
  position: relative;
  display: flex;
  align-items: center;
}

.search-icon {
  position: absolute;
  left: 0.75rem;
  width: 1.25rem;
  height: 1.25rem;
  color: var(--color-gray-400);
  pointer-events: none;
}

.search-box input {
  width: 100%;
  padding: 0.75rem 0.75rem 0.75rem 2.5rem;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 1rem;
}

.search-box input:focus {
  outline: none;
  border-color: var(--color-primary);
}

.todos-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.loading, .empty-state {
  text-align: center;
  padding: 3rem;
  background: white;
  border-radius: 12px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.empty-state p {
  font-size: 1.2rem;
  color: #6b7280;
  margin-bottom: 1.5rem;
}

.empty-icon {
  width: 4rem;
  height: 4rem;
  color: var(--color-gray-400);
  margin: 0 auto 1rem;
}

@media (max-width: 640px) {
  .container {
    padding: 1rem;
  }

  .todos-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 1rem;
  }

  .header-actions {
    width: 100%;
    flex-direction: column;
  }

  .btn-primary,
  .btn-delete-completed {
    width: 100%;
    justify-content: center;
  }

  .filter-group {
    flex-direction: column;
  }

  .filter-btn {
    width: 100%;
  }
}

/* Modal de confirmación */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  animation: fadeIn 0.2s ease;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

.modal-content {
  background: white;
  border-radius: 12px;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
  max-width: 400px;
  width: 90%;
  animation: slideUp 0.3s ease;
}

@keyframes slideUp {
  from {
    transform: translateY(20px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

.modal-header {
  padding: 1.5rem;
  border-bottom: 1px solid #e5e7eb;
}

.modal-header h3 {
  margin: 0;
  font-size: 1.25rem;
  color: var(--color-gray-900);
}

.modal-body {
  padding: 1.5rem;
}

.modal-body p {
  margin: 0 0 0.5rem 0;
  color: var(--color-gray-700);
}

.modal-warning {
  font-size: 0.875rem;
  color: var(--color-gray-500);
}

.modal-footer {
  padding: 1rem 1.5rem;
  border-top: 1px solid #e5e7eb;
  display: flex;
  gap: 0.75rem;
  justify-content: flex-end;
}

.btn-cancel {
  padding: 0.625rem 1.25rem;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  background: white;
  color: var(--color-gray-700);
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-cancel:hover {
  background: var(--color-gray-50);
  border-color: var(--color-gray-400);
}

.btn-delete {
  padding: 0.625rem 1.25rem;
  border: none;
  border-radius: 6px;
  background: var(--color-error);
  color: white;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-delete:hover {
  background: #dc2626;
  box-shadow: 0 4px 12px rgba(239, 68, 68, 0.3);
}
</style>
