import { BaseRepository } from './BaseRepository'
import type { TodoInsert, TodoUpdate, TodoWithRelations, Subtask } from '@/interfaces'

/**
 * TodoRepository - Maneja todas las operaciones de base de datos para Todos
 */
export class TodoRepository extends BaseRepository<TodoWithRelations> {
  constructor() {
    super('todos')
  }

  /**
   * Obtiene todos los todos de un usuario con relaciones (category, tags, subtasks)
   * @param userId - ID del usuario
   * @returns Array de todos con relaciones
   */
  async findAllWithRelations(userId: string): Promise<TodoWithRelations[]> {
    const { data, error } = await this.client
      .from(this.tableName)
      .select(`
        *,
        category:categories(*),
        subtasks(*),
        tags:todo_tags(tag:tags(*))
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) throw error

    // Transform the data to flatten tags
    return data?.map(todo => ({
      ...todo,
      tags: todo.tags?.map((t: any) => t.tag).filter(Boolean) || []
    })) || []
  }

  /**
   * Obtiene un todo por ID con todas sus relaciones
   * @param id - ID del todo
   * @returns Todo con relaciones o null
   */
  async findByIdWithRelations(id: string): Promise<TodoWithRelations | null> {
    const { data, error } = await this.client
      .from(this.tableName)
      .select(`
        *,
        category:categories(*),
        subtasks(*),
        tags:todo_tags(tag:tags(*))
      `)
      .eq('id', id)
      .single()

    if (error) throw error

    if (!data) return null

    return {
      ...data,
      tags: data.tags?.map((t: any) => t.tag).filter(Boolean) || []
    }
  }

  /**
   * Crea un nuevo todo con tags opcionales
   * @param todoData - Datos del todo a crear
   * @param userId - ID del usuario
   * @returns Todo creado con relaciones
   */
  async createWithTags(
    todoData: TodoInsert,
    userId: string,
    tagIds?: string[]
  ): Promise<TodoWithRelations> {
    // Verificar sesión antes de operación crítica
    const sessionValid = await this.checkSession()
    if (!sessionValid) {
      throw new Error('Sesión expirada. Por favor, inicia sesión nuevamente.')
    }

    // Crear el todo
    const { data: todo, error: createError } = await this.client
      .from(this.tableName)
      .insert({
        ...todoData,
        user_id: userId
      })
      .select()
      .single()

    if (createError) throw createError

    // Si hay tags, crear las relaciones
    if (todo && tagIds && tagIds.length > 0) {
      const todoTagsInserts = tagIds.map(tagId => ({
        todo_id: todo.id,
        tag_id: tagId
      }))

      const { error: tagsError } = await this.client
        .from('todo_tags')
        .insert(todoTagsInserts)

      if (tagsError) console.error('Error adding tags:', tagsError)
    }

    // Obtener el todo completo con relaciones
    const fullTodo = await this.findByIdWithRelations(todo.id)
    if (!fullTodo) throw new Error('Error fetching created todo')

    return fullTodo
  }

  /**
   * Actualiza un todo existente con tags opcionales
   * @param id - ID del todo
   * @param updates - Datos a actualizar
   * @param tagIds - IDs de tags a asociar (opcional)
   * @returns Todo actualizado con relaciones
   */
  async updateWithTags(
    id: string,
    updates: TodoUpdate,
    tagIds?: string[]
  ): Promise<TodoWithRelations> {
    // Verificar sesión antes de operación crítica
    const sessionValid = await this.checkSession()
    if (!sessionValid) {
      throw new Error('Sesión expirada. Por favor, inicia sesión nuevamente.')
    }

    // Actualizar el todo
    const { error: updateError } = await this.client
      .from(this.tableName)
      .update(updates)
      .eq('id', id)

    if (updateError) throw updateError

    // Si se proporcionaron tags, actualizar las relaciones
    if (tagIds !== undefined) {
      // Eliminar las tags existentes
      await this.client
        .from('todo_tags')
        .delete()
        .eq('todo_id', id)

      // Insertar las nuevas tags
      if (tagIds.length > 0) {
        const todoTagsInserts = tagIds.map(tagId => ({
          todo_id: id,
          tag_id: tagId
        }))

        const { error: tagsError } = await this.client
          .from('todo_tags')
          .insert(todoTagsInserts)

        if (tagsError) console.error('Error updating tags:', tagsError)
      }
    }

    // Obtener el todo completo con relaciones
    const fullTodo = await this.findByIdWithRelations(id)
    if (!fullTodo) throw new Error('Error fetching updated todo')

    return fullTodo
  }

  /**
   * Elimina un todo
   * @param id - ID del todo a eliminar
   */
  async delete(id: string): Promise<void> {
    // Verificar sesión antes de eliminar
    const sessionValid = await this.checkSession()
    if (!sessionValid) {
      throw new Error('Sesión expirada. Por favor, inicia sesión nuevamente.')
    }

    await super.delete(id)
  }

  /**
   * Obtiene todos pendientes de un usuario
   * @param userId - ID del usuario
   * @returns Array de todos pendientes
   */
  async findPending(userId: string): Promise<TodoWithRelations[]> {
    const { data, error } = await this.client
      .from(this.tableName)
      .select(`
        *,
        category:categories(*),
        subtasks(*),
        tags:todo_tags(tag:tags(*))
      `)
      .eq('user_id', userId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })

    if (error) throw error

    return data?.map(todo => ({
      ...todo,
      tags: todo.tags?.map((t: any) => t.tag).filter(Boolean) || []
    })) || []
  }

  /**
   * Obtiene todos en progreso de un usuario
   * @param userId - ID del usuario
   * @returns Array de todos en progreso
   */
  async findInProgress(userId: string): Promise<TodoWithRelations[]> {
    const { data, error } = await this.client
      .from(this.tableName)
      .select(`
        *,
        category:categories(*),
        subtasks(*),
        tags:todo_tags(tag:tags(*))
      `)
      .eq('user_id', userId)
      .eq('status', 'in_progress')
      .order('created_at', { ascending: false })

    if (error) throw error

    return data?.map(todo => ({
      ...todo,
      tags: todo.tags?.map((t: any) => t.tag).filter(Boolean) || []
    })) || []
  }

  /**
   * Obtiene todos completados de un usuario
   * @param userId - ID del usuario
   * @returns Array de todos completados
   */
  async findCompleted(userId: string): Promise<TodoWithRelations[]> {
    const { data, error } = await this.client
      .from(this.tableName)
      .select(`
        *,
        category:categories(*),
        subtasks(*),
        tags:todo_tags(tag:tags(*))
      `)
      .eq('user_id', userId)
      .eq('status', 'completed')
      .order('created_at', { ascending: false })

    if (error) throw error

    return data?.map(todo => ({
      ...todo,
      tags: todo.tags?.map((t: any) => t.tag).filter(Boolean) || []
    })) || []
  }

  // ========== SUBTASKS ==========

  /**
   * Agrega una subtarea a un todo
   * @param todoId - ID del todo
   * @param title - Título de la subtarea
   * @returns Subtarea creada
   */
  async addSubtask(todoId: string, title: string): Promise<Subtask> {
    const { data, error } = await this.client
      .from('subtasks')
      .insert({
        todo_id: todoId,
        title
      })
      .select()
      .single()

    if (error) throw error
    return data
  }

  /**
   * Actualiza el estado de una subtarea
   * @param subtaskId - ID de la subtarea
   * @param completed - Nuevo estado
   */
  async toggleSubtask(subtaskId: string, completed: boolean): Promise<void> {
    const { error } = await this.client
      .from('subtasks')
      .update({ completed })
      .eq('id', subtaskId)

    if (error) throw error
  }

  /**
   * Elimina una subtarea
   * @param subtaskId - ID de la subtarea
   */
  async deleteSubtask(subtaskId: string): Promise<void> {
    const { error } = await this.client
      .from('subtasks')
      .delete()
      .eq('id', subtaskId)

    if (error) throw error
  }
}
