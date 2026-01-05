import { supabase } from '@/lib/supabase'
import type { User, Session } from '@supabase/supabase-js'
import type { Profile } from '@/interfaces'

/**
 * AuthRepository - Maneja todas las operaciones de autenticación
 */
export class AuthRepository {
  /**
   * Obtiene la sesión actual
   * @returns Sesión actual o null
   */
  async getSession(): Promise<Session | null> {
    const { data: { session }, error } = await supabase.auth.getSession()
    if (error) throw error
    return session
  }

  /**
   * Obtiene el usuario actual
   * @returns Usuario actual o null
   */
  async getCurrentUser(): Promise<User | null> {
    const session = await this.getSession()
    return session?.user ?? null
  }

  /**
   * Registra un nuevo usuario
   * @param email - Email del usuario
   * @param password - Contraseña
   * @param fullName - Nombre completo (opcional)
   * @returns Usuario creado
   */
  async signUp(email: string, password: string, fullName?: string) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName
        }
      }
    })

    if (error) throw error
    return data
  }

  /**
   * Inicia sesión
   * @param email - Email del usuario
   * @param password - Contraseña
   * @returns Datos de autenticación
   */
  async signIn(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    })

    if (error) throw error
    return data
  }

  /**
   * Cierra sesión
   */
  async signOut(): Promise<void> {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
  }

  /**
   * Obtiene el perfil de un usuario
   * @param userId - ID del usuario
   * @returns Perfil del usuario o null
   */
  async getProfile(userId: string): Promise<Profile | null> {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()

    if (error) throw error
    return data
  }

  /**
   * Actualiza el perfil de un usuario
   * @param userId - ID del usuario
   * @param updates - Datos a actualizar
   * @returns Perfil actualizado
   */
  async updateProfile(userId: string, updates: Partial<Profile>): Promise<Profile> {
    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', userId)
      .select()
      .single()

    if (error) throw error
    return data
  }

  /**
   * Escucha cambios en el estado de autenticación
   * @param callback - Función a ejecutar cuando cambie el estado
   */
  onAuthStateChange(callback: (event: string, session: Session | null) => void) {
    return supabase.auth.onAuthStateChange(callback)
  }
}
