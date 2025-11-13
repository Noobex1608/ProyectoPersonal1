import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('⚠️ Faltan las credenciales de Supabase. Por favor, configura VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY en tu archivo .env')
}

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co', 
  supabaseAnonKey || 'placeholder-key',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storage: typeof window !== 'undefined' ? window.localStorage : undefined,
      flowType: 'pkce', // Más seguro para SPAs
    },
    db: {
      schema: 'public',
    },
    global: {
      headers: {
        'X-Client-Info': 'lista-tareas@1.0.0',
      },
    },
    // Timeout reducido para operaciones
    realtime: {
      timeout: 10000,
    },
  }
)

// Manejar cambios de visibilidad de la pestaña para refrescar sesión
if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', async () => {
    if (!document.hidden) {
      try {
        await supabase.auth.refreshSession()
        
        // Recargar todos si hay usuario autenticado
        const { data: { session } } = await supabase.auth.getSession()
        if (session) {
          // Importar dinámicamente para evitar dependencias circulares
          const { useTodosStore } = await import('../stores/todos')
          const todosStore = useTodosStore()
          if (!todosStore.loading) {
            await todosStore.fetchTodos()
          }
        }
      } catch (err) {
        console.error('Error refrescando sesión:', err)
      }
    }
  })
}

