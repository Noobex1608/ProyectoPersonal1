import { defineStore } from 'pinia'
import { ref } from 'vue'
import { useAuthStore } from './auth'
import { CategoryRepository } from '@/repositories'
import type { Category, CategoryInsert, CategoryUpdate } from '../interfaces'

export const useCategoriesStore = defineStore('categories', () => {
  const authStore = useAuthStore()
  const repository = new CategoryRepository()
  
  const categories = ref<Category[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function fetchCategories() {
    if (!authStore.user) {
      loading.value = false
      return
    }

    loading.value = true
    error.value = null

    try {
      categories.value = await repository.findAll(authStore.user.id)
    } catch (err: any) {
      error.value = err.message
      console.error('Error fetching categories:', err)
    } finally {
      loading.value = false
    }
  }

  async function createCategory(categoryData: Omit<CategoryInsert, 'user_id'>) {
    if (!authStore.user) {
      loading.value = false
      return { data: null, error: new Error('Usuario no autenticado') }
    }

    loading.value = true
    error.value = null

    try {
      const data = await repository.createCategory(categoryData, authStore.user.id)
      categories.value.push(data)
      categories.value.sort((a, b) => a.name.localeCompare(b.name))
      return { data, error: null }
    } catch (err: any) {
      error.value = err.message
      console.error('Error creating category:', err)
      return { data: null, error: err }
    } finally {
      loading.value = false
    }
  }

  async function updateCategory(id: string, updates: CategoryUpdate) {
    loading.value = true
    error.value = null

    try {
      const data = await repository.update(id, updates)
      const index = categories.value.findIndex(c => c.id === id)
      if (index !== -1) {
        categories.value[index] = data
        categories.value.sort((a, b) => a.name.localeCompare(b.name))
      }
      return { data, error: null }
    } catch (err: any) {
      error.value = err.message
      console.error('Error updating category:', err)
      return { data: null, error: err }
    } finally {
      loading.value = false
    }
  }

  async function deleteCategory(id: string) {
    loading.value = true
    error.value = null

    try {
      await repository.delete(id)
      categories.value = categories.value.filter(c => c.id !== id)
      return { error: null }
    } catch (err: any) {
      error.value = err.message
      console.error('Error deleting category:', err)
      return { error: err }
    } finally {
      loading.value = false
    }
  }

  function clearError() {
    error.value = null
  }

  return {
    categories,
    loading,
    error,
    fetchCategories,
    createCategory,
    updateCategory,
    deleteCategory,
    clearError
  }
})
