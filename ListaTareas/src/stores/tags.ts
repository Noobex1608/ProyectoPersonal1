import { defineStore } from 'pinia'
import { ref } from 'vue'
import { supabase } from '../lib/supabase'
import { useAuthStore } from './auth'
import type { Tag } from '../interfaces'

export const useTagsStore = defineStore('tags', () => {
  const authStore = useAuthStore()
  
  const tags = ref<Tag[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function fetchTags() {
    if (!authStore.user) {
      loading.value = false
      return
    }

    loading.value = true
    error.value = null

    try {
      const { data, error: fetchError } = await supabase
        .from('tags')
        .select('*')
        .eq('user_id', authStore.user.id)
        .order('name')

      if (fetchError) throw fetchError
      tags.value = data || []
    } catch (err: any) {
      error.value = err.message
      console.error('Error fetching tags:', err)
    } finally {
      loading.value = false
    }
  }

  async function createTag(name: string) {
    if (!authStore.user) {
      loading.value = false
      return { data: null, error: new Error('Usuario no autenticado') }
    }

    // Check if tag already exists
    const existingTag = tags.value.find(t => t.name.toLowerCase() === name.toLowerCase())
    if (existingTag) {
      return { data: existingTag, error: null }
    }

    loading.value = true
    error.value = null

    try {
      const { data, error: createError } = await supabase
        .from('tags')
        .insert({
          name,
          user_id: authStore.user.id
        })
        .select()
        .single()

      if (createError) throw createError

      if (data) {
        tags.value.push(data)
        tags.value.sort((a, b) => a.name.localeCompare(b.name))
      }

      return { data, error: null }
    } catch (err: any) {
      error.value = err.message
      console.error('Error creating tag:', err)
      return { data: null, error: err }
    } finally {
      loading.value = false
    }
  }

  async function deleteTag(id: string) {
    loading.value = true
    error.value = null

    try {
      const { error: deleteError } = await supabase
        .from('tags')
        .delete()
        .eq('id', id)

      if (deleteError) throw deleteError

      tags.value = tags.value.filter(t => t.id !== id)
      return { error: null }
    } catch (err: any) {
      error.value = err.message
      console.error('Error deleting tag:', err)
      return { error: err }
    } finally {
      loading.value = false
    }
  }

  async function addTagToTodo(todoId: string, tagId: string) {
    try {
      const { error: insertError } = await supabase
        .from('todo_tags')
        .insert({
          todo_id: todoId,
          tag_id: tagId
        })

      if (insertError) throw insertError
      return { error: null }
    } catch (err: any) {
      return { error: err }
    }
  }

  async function removeTagFromTodo(todoId: string, tagId: string) {
    try {
      const { error: deleteError } = await supabase
        .from('todo_tags')
        .delete()
        .eq('todo_id', todoId)
        .eq('tag_id', tagId)

      if (deleteError) throw deleteError
      return { error: null }
    } catch (err: any) {
      return { error: err }
    }
  }

  function clearError() {
    error.value = null
  }

  return {
    tags,
    loading,
    error,
    fetchTags,
    createTag,
    deleteTag,
    addTagToTodo,
    removeTagFromTodo,
    clearError
  }
})
