<template>
  <div class="categories-view">
    <NavBar />
    
    <div class="container">
      <div class="header">
        <h1>Categorías</h1>
        <button @click="openCreateForm" class="btn-primary">
          <PlusIcon class="btn-icon" />
          Nueva Categoría
        </button>
      </div>

      <div v-if="loading" class="loading">Cargando categorías...</div>

      <div v-else-if="categories.length === 0" class="empty-state">
        <FolderIcon class="empty-icon" />
        <p>No tienes categorías aún</p>
        <button @click="openCreateForm" class="btn-secondary">
          Crear tu primera categoría
        </button>
      </div>

      <div v-else class="categories-grid">
        <div v-for="category in categories" :key="category.id" class="category-card">
          <div class="category-header" :style="{ backgroundColor: category.color }">
            <span class="category-icon">{{ category.icon || '📁' }}</span>
            <h3>{{ category.name }}</h3>
          </div>
          <div class="category-actions">
            <button @click="editCategory(category)" class="btn-edit">
              <PencilIcon class="action-icon" />
              Editar
            </button>
            <button @click="deleteCategory(category.id)" class="btn-delete">
              <TrashIcon class="action-icon" />
              Eliminar
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Category Form Modal -->
    <div v-if="showForm" class="modal-overlay" @click.self="closeForm">
      <div class="modal">
        <div class="modal-header">
          <h2>{{ selectedCategory ? 'Editar Categoría' : 'Nueva Categoría' }}</h2>
          <button @click="closeForm" class="btn-close">
            <XMarkIcon class="close-icon" />
          </button>
        </div>

        <form @submit.prevent="handleSubmit">
          <div class="form-group">
            <label for="name">Nombre *</label>
            <input 
              type="text" 
              id="name" 
              v-model="formData.name" 
              required
              placeholder="Ej: Trabajo, Personal..."
            />
          </div>

          <div class="form-group">
            <label for="icon">Icono (emoji)</label>
            <input 
              type="text" 
              id="icon" 
              v-model="formData.icon" 
              placeholder="Ej: 💼, 🏠, 🎯..."
              maxlength="2"
            />
          </div>

          <div class="form-group">
            <label for="color">Color</label>
            <div class="color-picker">
              <input 
                type="color" 
                id="color" 
                v-model="formData.color"
              />
              <span>{{ formData.color }}</span>
            </div>
          </div>

          <div class="form-actions">
            <button type="button" @click="closeForm" class="btn-secondary">
              Cancelar
            </button>
            <button type="submit" class="btn-primary" :disabled="formLoading">
              {{ formLoading ? 'Guardando...' : (selectedCategory ? 'Actualizar' : 'Crear') }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useCategoriesStore } from '../stores/categories'
import { useToast } from '../composables/useToast'
import NavBar from '../components/NavBar.vue'
import type { Category, CategoryInsert, CategoryUpdate } from '../interfaces'
import { 
  PlusIcon, 
  FolderIcon, 
  PencilIcon, 
  TrashIcon,
  XMarkIcon 
} from '@heroicons/vue/24/outline'

const categoriesStore = useCategoriesStore()
const { success, error } = useToast()

const loading = ref(true)
const showForm = ref(false)
const formLoading = ref(false)
const selectedCategory = ref<Category | null>(null)

const formData = ref({
  name: '',
  icon: '',
  color: '#3B82F6'
})

const categories = computed(() => categoriesStore.categories)

onMounted(async () => {
  loading.value = true
  try {
    await categoriesStore.fetchCategories()
  } finally {
    loading.value = false
  }
})

function openCreateForm() {
  selectedCategory.value = null
  formData.value = {
    name: '',
    icon: '',
    color: '#3B82F6'
  }
  showForm.value = true
}

function editCategory(category: Category) {
  selectedCategory.value = category
  formData.value = {
    name: category.name,
    icon: category.icon || '',
    color: category.color
  }
  showForm.value = true
}

async function handleSubmit() {
  formLoading.value = true

  try {
    if (selectedCategory.value) {
      // Update
      const result = await categoriesStore.updateCategory(
        selectedCategory.value.id,
        formData.value as CategoryUpdate
      )
      if (result?.error) {
        error('Error al actualizar la categoría')
      } else {
        success('Categoría actualizada')
        closeForm()
      }
    } else {
      // Create
      const result = await categoriesStore.createCategory(formData.value as CategoryInsert)
      if (result?.error) {
        error('Error al crear la categoría')
      } else {
        success('Categoría creada')
        closeForm()
      }
    }
  } finally {
    formLoading.value = false
  }
}

async function deleteCategory(id: string) {
  if (!confirm('¿Estás seguro de eliminar esta categoría?')) return

  const result = await categoriesStore.deleteCategory(id)
  if (result.error) {
    error('Error al eliminar la categoría')
  } else {
    success('Categoría eliminada')
  }
}

function closeForm() {
  showForm.value = false
  selectedCategory.value = null
}
</script>

<style scoped>
.categories-view {
  min-height: 100vh;
  background: #f9fafb;
}

.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
}

.header h1 {
  margin: 0;
  font-size: 2rem;
  color: #111827;
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

.btn-primary:hover:not(:disabled) {
  background: var(--color-primary-dark);
}

.btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
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

.categories-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 1.5rem;
}

.category-card {
  background: white;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  transition: transform 0.2s;
}

.category-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.15);
}

.category-header {
  padding: 2rem;
  text-align: center;
  color: white;
}

.category-icon {
  font-size: 3rem;
  display: block;
  margin-bottom: 0.5rem;
}

.category-header h3 {
  margin: 0;
  font-size: 1.5rem;
}

.category-actions {
  display: flex;
  border-top: 1px solid #e5e7eb;
}

.btn-edit, .btn-delete {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.75rem;
  background: none;
  border: none;
  cursor: pointer;
  font-weight: 500;
  transition: background 0.2s;
}

.action-icon {
  width: 1rem;
  height: 1rem;
}

.btn-edit {
  border-right: 1px solid #e5e7eb;
}

.btn-edit:hover {
  background: #eff6ff;
  color: #3b82f6;
}

.btn-delete:hover {
  background: #fee2e2;
  color: #dc2626;
}

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
  padding: 1rem;
}

.modal {
  background: white;
  border-radius: 12px;
  width: 100%;
  max-width: 500px;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem;
  border-bottom: 1px solid #e5e7eb;
}

.modal-header h2 {
  margin: 0;
  font-size: 1.5rem;
}

.btn-close {
  background: none;
  border: none;
  cursor: pointer;
  color: #6b7280;
  padding: 0.5rem;
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

.form-group input {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 1rem;
}

.form-group input:focus {
  outline: none;
  border-color: var(--color-primary);
}

.color-picker {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.color-picker input[type="color"] {
  width: 60px;
  height: 40px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
}

.color-picker span {
  color: #6b7280;
  font-family: monospace;
}

.form-actions {
  display: flex;
  gap: 1rem;
  justify-content: flex-end;
  margin-top: 2rem;
  padding-top: 1.5rem;
  border-top: 1px solid #e5e7eb;
}

@media (max-width: 640px) {
  .container {
    padding: 1rem;
  }

  .header {
    flex-direction: column;
    align-items: flex-start;
    gap: 1rem;
  }

  .btn-primary {
    width: 100%;
  }

  .categories-grid {
    grid-template-columns: 1fr;
  }
}
</style>
