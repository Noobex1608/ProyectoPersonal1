import type { Database } from './database.types'

export type Profile = Database['public']['Tables']['profiles']['Row']
export type ProfileInsert = Database['public']['Tables']['profiles']['Insert']
export type ProfileUpdate = Database['public']['Tables']['profiles']['Update']

export type Category = Database['public']['Tables']['categories']['Row']
export type CategoryInsert = Database['public']['Tables']['categories']['Insert']
export type CategoryUpdate = Database['public']['Tables']['categories']['Update']

export type Todo = Database['public']['Tables']['todos']['Row']
export type TodoInsert = Database['public']['Tables']['todos']['Insert']
export type TodoUpdate = Database['public']['Tables']['todos']['Update']

export type Subtask = Database['public']['Tables']['subtasks']['Row']
export type SubtaskInsert = Database['public']['Tables']['subtasks']['Insert']
export type SubtaskUpdate = Database['public']['Tables']['subtasks']['Update']

export type Tag = Database['public']['Tables']['tags']['Row']
export type TagInsert = Database['public']['Tables']['tags']['Insert']
export type TagUpdate = Database['public']['Tables']['tags']['Update']

export type TodoTag = Database['public']['Tables']['todo_tags']['Row']

export type Notification = Database['public']['Tables']['notifications']['Row']
export type NotificationInsert = Database['public']['Tables']['notifications']['Insert']
export type NotificationUpdate = Database['public']['Tables']['notifications']['Update']

export type AIConversation = Database['public']['Tables']['ai_conversations']['Row']
export type AIMessage = Database['public']['Tables']['ai_messages']['Row']
export type AIAction = Database['public']['Tables']['ai_actions']['Row']

// Extended types with relations
export interface TodoWithRelations extends Todo {
  category?: Category
  subtasks?: Subtask[]
  tags?: Tag[]
}

export interface CategoryWithCount extends Category {
  todo_count?: number
}

export type Priority = 'low' | 'medium' | 'high' | 'urgent'
export type TodoStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled'
export type NotificationType = 'reminder' | 'due_soon' | 'overdue' | 'daily_summary'
