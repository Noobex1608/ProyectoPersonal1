import { supabase } from '@/lib/supabase'
import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * BaseRepository - Clase base para todos los repositories
 * Proporciona operaciones CRUD genéricas y acceso al cliente de Supabase
 */
export abstract class BaseRepository<T = any> {
  protected client: SupabaseClient
  protected tableName: string

  constructor(tableName: string) {
    this.client = supabase
    this.tableName = tableName
  }

  /**
   * Obtiene todos los registros de la tabla
   * @param userId - ID del usuario para filtrar (opcional)
   * @returns Array de registros
   */
  async findAll(userId?: string): Promise<T[]> {
    let query = this.client
      .from(this.tableName)
      .select('*')
      .order('created_at', { ascending: false })

    if (userId) {
      query = query.eq('user_id', userId)
    }

    const { data, error } = await query

    if (error) throw error
    return data || []
  }

  /**
   * Obtiene un registro por ID
   * @param id - ID del registro
   * @returns Registro encontrado o null
   */
  async findById(id: string): Promise<T | null> {
    const { data, error } = await this.client
      .from(this.tableName)
      .select('*')
      .eq('id', id)
      .single()

    if (error) throw error
    return data
  }

  /**
   * Crea un nuevo registro
   * @param record - Datos del registro a crear
   * @returns Registro creado
   */
  async create(record: Partial<T>): Promise<T> {
    const { data, error } = await this.client
      .from(this.tableName)
      .insert(record)
      .select()
      .single()

    if (error) throw error
    return data
  }

  /**
   * Actualiza un registro existente
   * @param id - ID del registro a actualizar
   * @param updates - Datos a actualizar
   * @returns Registro actualizado
   */
  async update(id: string, updates: Partial<T>): Promise<T> {
    const { data, error } = await this.client
      .from(this.tableName)
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data
  }

  /**
   * Elimina un registro
   * @param id - ID del registro a eliminar
   */
  async delete(id: string): Promise<void> {
    const { error } = await this.client
      .from(this.tableName)
      .delete()
      .eq('id', id)

    if (error) throw error
  }

  /**
   * Verifica si la sesión del usuario es válida
   * @returns true si la sesión es válida, false en caso contrario
   */
  protected async checkSession(): Promise<boolean> {
    try {
      const { data: { session }, error } = await this.client.auth.getSession()
      if (error || !session) {
        console.warn('⚠️ Sesión inválida o expirada')
        return false
      }
      return true
    } catch (err) {
      console.error('❌ Error verificando sesión:', err)
      return false
    }
  }
}
