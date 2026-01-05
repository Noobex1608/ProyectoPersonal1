import { BaseRepository } from './BaseRepository'
import type { Category, CategoryInsert, CategoryUpdate } from '@/interfaces'

/**
 * CategoryRepository - Maneja todas las operaciones de base de datos para Categories
 */
export class CategoryRepository extends BaseRepository<Category> {
  constructor() {
    super('categories')
  }

  /**
   * Obtiene todas las categorías de un usuario ordenadas por nombre
   * @param userId - ID del usuario
   * @returns Array de categorías
   */
  async findAll(userId: string): Promise<Category[]> {
    const { data, error } = await this.client
      .from(this.tableName)
      .select('*')
      .eq('user_id', userId)
      .order('name')

    if (error) throw error
    return data || []
  }

  /**
   * Crea una nueva categoría
   * @param categoryData - Datos de la categoría
   * @param userId - ID del usuario
   * @returns Categoría creada
   */
  async createCategory(categoryData: Omit<CategoryInsert, 'user_id'>, userId: string): Promise<Category> {
    const { data, error } = await this.client
      .from(this.tableName)
      .insert({
        ...categoryData,
        user_id: userId
      })
      .select()
      .single()

    if (error) throw error
    return data
  }

  /**
   * Actualiza una categoría existente
   * @param id - ID de la categoría
   * @param updates - Datos a actualizar
   * @returns Categoría actualizada
   */
  async update(id: string, updates: CategoryUpdate): Promise<Category> {
    const { data, error } = await this.client
      .from(this.tableName)
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data
  }
}
