import { defineStore } from 'pinia'
import { ref } from 'vue'
import { supabase } from '../lib/supabase'
import { useAuthStore } from './auth'
import type { Category, CategoryInsert, CategoryUpdate } from '../interfaces'

export const useCategoriesStore = defineStore('categories', () => {
  const authStore = useAuthStore()
  
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
      const { data, error: fetchError } = await supabase
        .from('categories')
        .select('*')
        .eq('user_id', authStore.user.id)
        .order('name')

      if (fetchError) throw fetchError
      categories.value = data || []
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
      const { data, error: createError } = await supabase
        .from('categories')
        .insert({
          ...categoryData,
          user_id: authStore.user.id
        })
        .select()
        .single()

      if (createError) throw createError

      if (data) {
        categories.value.push(data)
        categories.value.sort((a, b) => a.name.localeCompare(b.name))
      }

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
      const { data, error: updateError } = await supabase
        .from('categories')
        .update(updates)
        .eq('id', id)
        .select()
        .single()

      if (updateError) throw updateError

      if (data) {
        const index = categories.value.findIndex(c => c.id === id)
        if (index !== -1) {
          categories.value[index] = data
          categories.value.sort((a, b) => a.name.localeCompare(b.name))
        }
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
      const { error: deleteError } = await supabase
        .from('categories')
        .delete()
        .eq('id', id)

      if (deleteError) throw deleteError

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
