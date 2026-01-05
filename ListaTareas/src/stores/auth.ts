import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { AuthRepository } from '@/repositories'
import type { User, Session } from '@supabase/supabase-js'
import type { Profile } from '../interfaces'

export const useAuthStore = defineStore('auth', () => {
  const repository = new AuthRepository()
  
  const user = ref<User | null>(null)
  const profile = ref<Profile | null>(null)
  const session = ref<Session | null>(null)
  const loading = ref(true)
  const fetchingProfile = ref(false) // Flag para evitar fetch concurrente

  const isAuthenticated = computed(() => !!user.value)

  async function initialize() {
    loading.value = true
    try {
      session.value = await repository.getSession()
      user.value = session.value?.user ?? null

      if (user.value) {
        await fetchProfile()
      }

      // Listen for auth changes
      repository.onAuthStateChange(async (event, newSession) => {
        session.value = newSession
        user.value = newSession?.user ?? null
        
        if (event === 'SIGNED_OUT') {
          profile.value = null
        } else if (event === 'TOKEN_REFRESHED') {
          // No refetch profile, solo actualizar el user
        } else if (event === 'SIGNED_IN') {
          // Solo refetch si no tenemos profile o es diferente
          if (!profile.value || user.value?.id !== profile.value?.id) {
            if (user.value) {
              await fetchProfile()
            }
          }
        } else if (event === 'USER_UPDATED') {
          if (user.value && profile.value) {
            await fetchProfile()
          }
        }
      })
    } catch (error) {
      console.error('Error initializing auth:', error)
    } finally {
      loading.value = false
    }
  }

  async function fetchProfile() {
    if (!user.value) return

    // Si ya está cargando, retornar el profile actual
    if (fetchingProfile.value) {
      return profile.value
    }

    fetchingProfile.value = true
    
    try {
      profile.value = await repository.getProfile(user.value.id)
      return profile.value
    } catch (error) {
      console.error('Error fetching profile:', error)
      profile.value = null
      return null
    } finally {
      fetchingProfile.value = false
    }
  }

  async function signUp(email: string, password: string, fullName?: string) {
    try {
      const data = await repository.signUp(email, password, fullName)
      return { data, error: null }
    } catch (error: any) {
      console.error('Error en signUp:', error)
      return { data: null, error }
    }
  }

  async function signIn(email: string, password: string) {
    try {
      const data = await repository.signIn(email, password)
      return { data, error: null }
    } catch (error: any) {
      return { data: null, error }
    }
  }

  async function signOut() {
    try {
      await repository.signOut()
      user.value = null
      profile.value = null
      session.value = null
    } catch (error) {
      console.error('Error signing out:', error)
      throw error
    }
  }

  async function updateProfile(updates: Partial<Profile>) {
    if (!user.value) return

    try {
      const data = await repository.updateProfile(user.value.id, updates)
      profile.value = data
      return { data, error: null }
    } catch (error: any) {
      return { data: null, error }
    }
  }

  return {
    user,
    profile,
    session,
    loading,
    isAuthenticated,
    initialize,
    fetchProfile,
    signUp,
    signIn,
    signOut,
    updateProfile
  }
})
