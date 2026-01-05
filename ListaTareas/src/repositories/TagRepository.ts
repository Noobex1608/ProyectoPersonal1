import { BaseRepository } from './BaseRepository'
import type { Tag } from '@/interfaces'

/**
 * TagRepository - Maneja todas las operaciones de base de datos para Tags
 */
export class TagRepository extends BaseRepository<Tag> {
  constructor() {
    super('tags')
  }

  /**
   * Obtiene todos los tags de un usuario ordenados por nombre
   * @param userId - ID del usuario
   * @returns Array de tags
   */
  async findAll(userId: string): Promise<Tag[]> {
    const { data, error } = await this.client
      .from(this.tableName)
      .select('*')
      .eq('user_id', userId)
      .order('name')

    if (error) throw error
    return data || []
  }

  /**
   * Busca un tag por nombre
   * @param name - Nombre del tag
   * @param userId - ID del usuario
   * @returns Tag encontrado o null
   */
  async findByName(name: string, userId: string): Promise<Tag | null> {
    const { data, error } = await this.client
      .from(this.tableName)
      .select('*')
      .eq('user_id', userId)
      .ilike('name', name)
      .single()

    if (error && error.code !== 'PGRST116') throw error // PGRST116 = no rows returned
    return data
  }

  /**
   * Crea un nuevo tag
   * @param name - Nombre del tag
   * @param userId - ID del usuario
   * @returns Tag creado
   */
  async createTag(name: string, userId: string): Promise<Tag> {
    const { data, error } = await this.client
      .from(this.tableName)
      .insert({
        name,
        user_id: userId
      })
      .select()
      .single()

    if (error) throw error
    return data
  }

  /**
   * Crea un tag o retorna uno existente si ya existe
   * @param name - Nombre del tag
   * @param userId - ID del usuario
   * @returns Tag creado o existente
   */
  async findOrCreate(name: string, userId: string): Promise<Tag> {
    const existing = await this.findByName(name, userId)
    if (existing) return existing
    return this.createTag(name, userId)
  }

  /**
   * Agrega un tag a un todo
   * @param todoId - ID del todo
   * @param tagId - ID del tag
   */
  async addToTodo(todoId: string, tagId: string): Promise<void> {
    const { error } = await this.client
      .from('todo_tags')
      .insert({
        todo_id: todoId,
        tag_id: tagId
      })

    if (error) throw error
  }

  /**
   * Remueve un tag de un todo
   * @param todoId - ID del todo
   * @param tagId - ID del tag
   */
  async removeFromTodo(todoId: string, tagId: string): Promise<void> {
    const { error } = await this.client
      .from('todo_tags')
      .delete()
      .eq('todo_id', todoId)
      .eq('tag_id', tagId)

    if (error) throw error
  }
}
