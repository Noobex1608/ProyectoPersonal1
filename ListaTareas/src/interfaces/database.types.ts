export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string
          full_name: string | null
          avatar_url: string | null
          notification_enabled: boolean
          notification_time: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          full_name?: string | null
          avatar_url?: string | null
          notification_enabled?: boolean
          notification_time?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          full_name?: string | null
          avatar_url?: string | null
          notification_enabled?: boolean
          notification_time?: string
          created_at?: string
          updated_at?: string
        }
      }
      categories: {
        Row: {
          id: string
          user_id: string | null
          name: string
          color: string
          icon: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          name: string
          color?: string
          icon?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string | null
          name?: string
          color?: string
          icon?: string | null
          created_at?: string
        }
      }
      todos: {
        Row: {
          id: string
          user_id: string | null
          category_id: string | null
          title: string
          description: string | null
          priority: 'low' | 'medium' | 'high' | 'urgent'
          status: 'pending' | 'in_progress' | 'completed' | 'cancelled'
          due_date: string | null
          completed_at: string | null
          reminder_sent: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          category_id?: string | null
          title: string
          description?: string | null
          priority?: 'low' | 'medium' | 'high' | 'urgent'
          status?: 'pending' | 'in_progress' | 'completed' | 'cancelled'
          due_date?: string | null
          completed_at?: string | null
          reminder_sent?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string | null
          category_id?: string | null
          title?: string
          description?: string | null
          priority?: 'low' | 'medium' | 'high' | 'urgent'
          status?: 'pending' | 'in_progress' | 'completed' | 'cancelled'
          due_date?: string | null
          completed_at?: string | null
          reminder_sent?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      subtasks: {
        Row: {
          id: string
          todo_id: string | null
          title: string
          completed: boolean
          position: number
          created_at: string
        }
        Insert: {
          id?: string
          todo_id?: string | null
          title: string
          completed?: boolean
          position?: number
          created_at?: string
        }
        Update: {
          id?: string
          todo_id?: string | null
          title?: string
          completed?: boolean
          position?: number
          created_at?: string
        }
      }
      tags: {
        Row: {
          id: string
          user_id: string | null
          name: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          name: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string | null
          name?: string
          created_at?: string
        }
      }
      todo_tags: {
        Row: {
          todo_id: string
          tag_id: string
        }
        Insert: {
          todo_id: string
          tag_id: string
        }
        Update: {
          todo_id?: string
          tag_id?: string
        }
      }
      notifications: {
        Row: {
          id: string
          user_id: string | null
          todo_id: string | null
          type: 'reminder' | 'due_soon' | 'overdue' | 'daily_summary'
          scheduled_for: string
          sent: boolean
          sent_at: string | null
          email_subject: string | null
          email_body: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          todo_id?: string | null
          type: 'reminder' | 'due_soon' | 'overdue' | 'daily_summary'
          scheduled_for: string
          sent?: boolean
          sent_at?: string | null
          email_subject?: string | null
          email_body?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string | null
          todo_id?: string | null
          type?: 'reminder' | 'due_soon' | 'overdue' | 'daily_summary'
          scheduled_for?: string
          sent?: boolean
          sent_at?: string | null
          email_subject?: string | null
          email_body?: string | null
          created_at?: string
        }
      }
      ai_conversations: {
        Row: {
          id: string
          user_id: string | null
          title: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          title?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string | null
          title?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      ai_messages: {
        Row: {
          id: string
          conversation_id: string | null
          role: 'user' | 'assistant' | 'system'
          content: string
          metadata: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          conversation_id?: string | null
          role: 'user' | 'assistant' | 'system'
          content: string
          metadata?: Json | null
          created_at?: string
        }
        Update: {
          id?: string
          conversation_id?: string | null
          role?: 'user' | 'assistant' | 'system'
          content?: string
          metadata?: Json | null
          created_at?: string
        }
      }
      ai_actions: {
        Row: {
          id: string
          conversation_id: string | null
          message_id: string | null
          action_type: 'create_todo' | 'update_todo' | 'delete_todo' | 'create_category' | 'suggestion'
          todo_id: string | null
          action_data: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          conversation_id?: string | null
          message_id?: string | null
          action_type: 'create_todo' | 'update_todo' | 'delete_todo' | 'create_category' | 'suggestion'
          todo_id?: string | null
          action_data?: Json | null
          created_at?: string
        }
        Update: {
          id?: string
          conversation_id?: string | null
          message_id?: string | null
          action_type?: 'create_todo' | 'update_todo' | 'delete_todo' | 'create_category' | 'suggestion'
          todo_id?: string | null
          action_data?: Json | null
          created_at?: string
        }
      }
    }
  }
}
