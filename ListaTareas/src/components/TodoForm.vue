<template>
  <div class="todo-form-overlay" @click.self="$emit('close')">
    <div class="todo-form">
      <div class="form-header">
        <h2>{{ isEditing ? 'Editar Tarea' : 'Nueva Tarea' }}</h2>
        <button @click="$emit('close')" class="btn-close">
          <XMarkIcon class="close-icon" />
        </button>
      </div>

      <form @submit.prevent="handleSubmit">
        <div class="form-group">
          <label for="title">Título *</label>
          <div class="input-with-actions">
            <input 
              type="text" 
              id="title" 
              v-model="formData.title" 
              required
              placeholder="¿Qué necesitas hacer?"
            />
            <button 
              v-if="formData.title && formData.title.length < 20"
              type="button" 
              @click="expandTask"
              :disabled="isExpanding"
              class="btn-inline-action"
              title="Expandir tarea vaga con IA"
            >
              <svg v-if="!isExpanding" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              <span v-else class="spinner-small"></span>
              ✨
            </button>
          </div>
        </div>

        <div class="form-group">
          <label for="description">Descripción</label>
          <textarea 
            id="description" 
            v-model="formData.description" 
            rows="3"
            placeholder="Detalles adicionales..."
          ></textarea>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label for="category">Categoría</label>
            <select id="category" v-model="formData.category_id">
              <option :value="null">Sin categoría</option>
              <option v-for="category in categories" :key="category.id" :value="category.id">
                {{ category.icon }} {{ category.name }}
              </option>
            </select>
          </div>

          <div class="form-group">
            <label for="priority">
              Prioridad
              <button 
                v-if="formData.title"
                type="button" 
                @click="suggestPriority"
                :disabled="isSuggesting"
                class="btn-inline-label"
                title="Sugerir prioridad con IA"
              >
                <svg v-if="!isSuggesting" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                <span v-else class="spinner-small"></span>
                ✨ Sugerir
              </button>
            </label>
            <select id="priority" v-model="formData.priority">
              <option value="low">Baja</option>
              <option value="medium">Media</option>
              <option value="high">Alta</option>
              <option value="urgent">Urgente</option>
            </select>
            <div v-if="prioritySuggestion" class="ai-suggestion">
              <span class="suggestion-icon">💡</span>
              <span class="suggestion-text">{{ prioritySuggestion.reasoning }}</span>
              <span class="suggestion-confidence">({{ Math.round(prioritySuggestion.confidence * 100) }}% confianza)</span>
            </div>
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label for="status">Estado</label>
            <select id="status" v-model="formData.status">
              <option value="pending">Pendiente</option>
              <option value="in_progress">En progreso</option>
              <option value="completed">Completada</option>
              <option value="cancelled">Cancelada</option>
            </select>
          </div>

          <div class="form-group">
            <label for="due_date">Fecha límite</label>
            <input 
              type="datetime-local" 
              id="due_date" 
              v-model="formData.due_date"
            />
          </div>
        </div>

        <div class="form-group">
          <label>
            Etiquetas
            <button 
              v-if="formData.title && selectedTags.length === 0"
              type="button" 
              @click="suggestTagsAI"
              :disabled="isSuggestingTags"
              class="btn-inline-label"
              title="Sugerir tags con IA"
            >
              <svg v-if="!isSuggestingTags" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
              </svg>
              <span v-else class="spinner-small"></span>
              ✨ Sugerir
            </button>
          </label>
          <div class="tags-input">
            <div class="selected-tags">
              <span v-for="tag in selectedTags" :key="tag.id" class="tag">
                {{ tag.name }}
                <button type="button" @click="removeTag(tag.id)">
                  <XMarkIcon class="tag-remove-icon" />
                </button>
              </span>
            </div>
            <input 
              type="text" 
              v-model="tagInput"
              @keydown.enter.prevent="addTag"
              placeholder="Agregar etiqueta (Enter)"
            />
          </div>
          <div v-if="suggestedTagsAI.length > 0" class="ai-suggestion-tags">
            <span class="suggestion-label">💡 Sugeridas:</span>
            <button 
              v-for="tag in suggestedTagsAI" 
              :key="tag"
              type="button"
              @click="addSuggestedTag(tag)"
              class="suggested-tag-btn"
            >
              + {{ tag }}
            </button>
          </div>
        </div>

        <div class="form-actions">
          <button type="button" @click="$emit('close')" class="btn btn-secondary" :disabled="loading">
            Cancelar
          </button>
          <button type="submit" class="btn btn-primary" :disabled="loading">
            {{ loading ? 'Guardando...' : (isEditing ? 'Actualizar' : 'Crear') }}
          </button>
        </div>
        
        <!-- Advertencia visible cuando está guardando -->
        <div v-if="loading" class="saving-warning">
          ⚠️ Guardando... No cierres ni cambies de pestaña
        </div>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useCategoriesStore } from '../stores/categories'
import { useTagsStore } from '../stores/tags'
import { useSmartPriority } from '../composables/useSmartPriority'
import { useTaskExpander } from '../composables/useTaskExpander'
import { useSmartTags } from '../composables/useSmartTags'
import type { TodoWithRelations, TodoInsert, TodoUpdate, Tag } from '../interfaces'
import { XMarkIcon } from '@heroicons/vue/24/outline'

interface Props {
  todo?: TodoWithRelations | null
}

const props = defineProps<Props>()

const emit = defineEmits<{
  close: []
  submit: [data: TodoInsert | TodoUpdate]
}>()

const categoriesStore = useCategoriesStore()
const tagsStore = useTagsStore()

// Composables de IA
const { suggestion: prioritySuggestion, isSuggesting, suggest: suggestPriorityAI } = useSmartPriority()
const { expandedTask, isExpanding, expand } = useTaskExpander()
const { suggestedTags: suggestedTagsAI, isSuggesting: isSuggestingTags, suggest: suggestTagsFromAI } = useSmartTags()

// Usar el loading del store de todos para sincronización global
import { useTodosStore } from '../stores/todos'
const todosStore = useTodosStore()
const loading = computed(() => todosStore.loading)

const tagInput = ref('')
const selectedTags = ref<Tag[]>([])

const isEditing = computed(() => !!props.todo)

const formData = ref<TodoInsert | TodoUpdate>({
  title: '',
  description: null,
  category_id: null,
  priority: 'medium',
  status: 'pending',
  due_date: null
})

const categories = computed(() => categoriesStore.categories)

// Helper para convertir fecha ISO a formato datetime-local
function formatDateForInput(isoDate: string | null): string | null {
  if (!isoDate) return null
  // Remover la timezone y convertir a formato yyyy-MM-ddTHH:mm
  const date = new Date(isoDate)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  return `${year}-${month}-${day}T${hours}:${minutes}`
}

onMounted(() => {
  // Cargar categorías y tags en paralelo sin bloquear
  if (categoriesStore.categories.length === 0) {
    categoriesStore.fetchCategories()
  }
  if (tagsStore.tags.length === 0) {
    tagsStore.fetchTags()
  }

  // Inicializar el formulario si hay un todo
  if (props.todo) {
    formData.value = {
      title: props.todo.title,
      description: props.todo.description,
      category_id: props.todo.category_id,
      priority: props.todo.priority,
      status: props.todo.status,
      due_date: formatDateForInput(props.todo.due_date)
    }
    selectedTags.value = [...(props.todo.tags || [])]
  }
})

watch(() => props.todo, (newTodo) => {
  if (newTodo) {
    formData.value = {
      title: newTodo.title,
      description: newTodo.description,
      category_id: newTodo.category_id,
      priority: newTodo.priority,
      status: newTodo.status,
      due_date: formatDateForInput(newTodo.due_date)
    }
    selectedTags.value = [...(newTodo.tags || [])]
  }
})

async function addTag() {
  if (!tagInput.value.trim()) return

  const tagName = tagInput.value.trim()
  
  // Check if tag already selected
  if (selectedTags.value.find(t => t.name.toLowerCase() === tagName.toLowerCase())) {
    tagInput.value = ''
    return
  }

  // Find existing tag or create new one
  let tag = tagsStore.tags.find(t => t.name.toLowerCase() === tagName.toLowerCase())
  
  if (!tag) {
    const result = await tagsStore.createTag(tagName)
    if (result && result.data) {
      tag = result.data
    }
  }

  if (tag) {
    selectedTags.value.push(tag)
  }

  tagInput.value = ''
}

function removeTag(tagId: string) {
  selectedTags.value = selectedTags.value.filter(t => t.id !== tagId)
}

async function handleSubmit() {
  try {
    // Convertir la fecha de vuelta a formato ISO si existe
    const dueDate = formData.value.due_date 
      ? new Date(formData.value.due_date).toISOString() 
      : null
    
    // Incluir las tags seleccionadas en los datos
    const dataToSubmit = {
      ...formData.value,
      due_date: dueDate,
      tags: selectedTags.value
    }
    
    await emit('submit', dataToSubmit)
  } catch (err) {
    console.error('Error en handleSubmit:', err)
  }
}

// Funciones de IA
async function suggestPriority() {
  if (!formData.value.title) return
  
  await suggestPriorityAI(
    formData.value.title,
    formData.value.due_date || undefined,
    formData.value.description || undefined
  )
  
  // Si hay sugerencia, aplicarla automáticamente
  if (prioritySuggestion.value) {
    formData.value.priority = prioritySuggestion.value.suggested
  }
}

async function expandTask() {
  if (!formData.value.title) return
  
  await expand(formData.value.title)
  
  // Aplicar la tarea expandida
  if (expandedTask.value) {
    formData.value.title = expandedTask.value.title
    formData.value.description = expandedTask.value.description
    
    // Agregar tags sugeridos
    if (expandedTask.value.suggestedTags) {
      for (const tagName of expandedTask.value.suggestedTags) {
        await addTagByName(tagName)
      }
    }
  }
}

async function suggestTagsAI() {
  if (!formData.value.title) return
  
  await suggestTagsFromAI(
    formData.value.title,
    formData.value.description || undefined
  )
}

async function addSuggestedTag(tagName: string) {
  await addTagByName(tagName)
  // Remover de la lista de sugeridos
  suggestedTagsAI.value = suggestedTagsAI.value.filter(t => t !== tagName)
}

async function addTagByName(tagName: string) {
  // Check if tag already selected
  if (selectedTags.value.find(t => t.name.toLowerCase() === tagName.toLowerCase())) {
    return
  }

  // Find existing tag or create new one
  let tag = tagsStore.tags.find(t => t.name.toLowerCase() === tagName.toLowerCase())
  
  if (!tag) {
    const result = await tagsStore.createTag(tagName)
    if (result && result.data) {
      tag = result.data
    }
  }

  if (tag) {
    selectedTags.value.push(tag)
  }
}
</script>

<style scoped>
.todo-form-overlay {
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
  padding: 1rem;
}

.todo-form {
  background: white;
  border-radius: 12px;
  width: 100%;
  max-width: 600px;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
}

.form-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem;
  border-bottom: 1px solid #e5e7eb;
}

.form-header h2 {
  margin: 0;
  font-size: 1.5rem;
  color: #111827;
}

.btn-close {
  background: none;
  border: none;
  cursor: pointer;
  color: #6b7280;
  padding: 0.5rem;
  line-height: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}

.close-icon {
  width: 1.5rem;
  height: 1.5rem;
}

.btn-close:hover {
  color: #111827;
}

form {
  padding: 1.5rem;
}

.form-group {
  margin-bottom: 1.5rem;
}

.form-group label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 500;
  color: #374151;
}

.form-group input[type="text"],
.form-group input[type="datetime-local"],
.form-group textarea,
.form-group select {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 1rem;
  font-family: inherit;
  transition: border-color 0.2s;
}

.form-group input:focus,
.form-group textarea:focus,
.form-group select:focus {
  outline: none;
  border-color: #3b82f6;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}

.tags-input {
  border: 1px solid #d1d5db;
  border-radius: 6px;
  padding: 0.5rem;
}

.selected-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
}

.tag {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.25rem 0.75rem;
  background: #dbeafe;
  color: #1e40af;
  border-radius: 9999px;
  font-size: 0.875rem;
}

.tag button {
  background: none;
  border: none;
  padding: 0;
  margin-left: 0.25rem;
  cursor: pointer;
  color: #1e40af;
  line-height: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}

.tag-remove-icon {
  width: 0.875rem;
  height: 0.875rem;
}

.tags-input input {
  width: 100%;
  border: none;
  padding: 0.5rem;
  font-size: 1rem;
}

.tags-input input:focus {
  outline: none;
}

.form-actions {
  display: flex;
  gap: 1rem;
  justify-content: flex-end;
  margin-top: 2rem;
  padding-top: 1.5rem;
  border-top: 1px solid #e5e7eb;
}

.btn {
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 6px;
  font-size: 1rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-primary {
  background: #3b82f6;
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background: #2563eb;
}

.btn-secondary {
  background: #f3f4f6;
  color: #374151;
}

.btn-secondary:hover {
  background: #e5e7eb;
}

.saving-warning {
  margin-top: 1rem;
  padding: 0.75rem;
  background: #fef3c7;
  border: 1px solid #f59e0b;
  border-radius: 6px;
  color: #92400e;
  font-weight: 500;
  text-align: center;
  animation: pulse 2s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.7; }
}

/* Estilos para funcionalidades de IA */
.input-with-actions {
  position: relative;
  display: flex;
  gap: 0.5rem;
}

.input-with-actions input {
  flex: 1;
}

.btn-inline-action,
.btn-inline-label {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.5rem 0.75rem;
  background: linear-gradient(135deg, #F06543 0%, #F09D51 100%);
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s ease;
  white-space: nowrap;
}

.btn-inline-action {
  position: absolute;
  right: 0.5rem;
  top: 50%;
  transform: translateY(-50%);
  padding: 0.375rem 0.625rem;
}

.btn-inline-label {
  margin-left: 0.5rem;
  font-size: 0.75rem;
  padding: 0.25rem 0.5rem;
}

.btn-inline-action:hover:not(:disabled),
.btn-inline-label:hover:not(:disabled) {
  transform: translateY(-50%) scale(1.05);
  box-shadow: 0 4px 12px rgba(240, 101, 67, 0.3);
}

.btn-inline-label:hover:not(:disabled) {
  transform: scale(1.05);
}

.btn-inline-action:disabled,
.btn-inline-label:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.btn-inline-action svg,
.btn-inline-label svg {
  width: 14px;
  height: 14px;
}

.spinner-small {
  width: 12px;
  height: 12px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: white;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.ai-suggestion {
  margin-top: 0.5rem;
  padding: 0.75rem;
  background: linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%);
  border-left: 3px solid #f59e0b;
  border-radius: 6px;
  font-size: 0.875rem;
}

.suggestion-icon {
  font-size: 1rem;
  margin-right: 0.5rem;
}

.suggestion-text {
  color: #92400e;
  font-weight: 500;
}

.suggestion-confidence {
  color: #78716c;
  font-size: 0.75rem;
  margin-left: 0.5rem;
}

.ai-suggestion-tags {
  margin-top: 0.75rem;
  padding: 0.75rem;
  background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%);
  border-left: 3px solid #10b981;
  border-radius: 6px;
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  align-items: center;
}

.suggestion-label {
  font-size: 0.875rem;
  font-weight: 600;
  color: #065f46;
}

.suggested-tag-btn {
  padding: 0.375rem 0.75rem;
  background: white;
  color: #059669;
  border: 1px solid #10b981;
  border-radius: 50px;
  font-size: 0.8125rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.suggested-tag-btn:hover {
  background: #10b981;
  color: white;
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(16, 185, 129, 0.2);
}

@media (max-width: 640px) {
  .form-row {
    grid-template-columns: 1fr;
  }
  
  .btn-inline-action {
    position: static;
    transform: none;
    margin-top: 0.5rem;
  }
  
  .input-with-actions {
    flex-direction: column;
  }
}
</style>
