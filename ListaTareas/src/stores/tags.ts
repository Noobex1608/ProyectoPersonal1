import { defineStore } from 'pinia'
import { ref } from 'vue'
import { useAuthStore } from './auth'
import { TagRepository } from '@/repositories'
import type { Tag } from '../interfaces'

export const useTagsStore = defineStore('tags', () => {
  const authStore = useAuthStore()
  const repository = new TagRepository()
  
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
      tags.value = await repository.findAll(authStore.user.id)
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
      const data = await repository.createTag(name, authStore.user.id)
      tags.value.push(data)
      tags.value.sort((a, b) => a.name.localeCompare(b.name))
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
      await repository.delete(id)
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
      await repository.addToTodo(todoId, tagId)
      return { error: null }
    } catch (err: any) {
      return { error: err }
    }
  }

  async function removeTagFromTodo(todoId: string, tagId: string) {
    try {
      await repository.removeFromTodo(todoId, tagId)
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
