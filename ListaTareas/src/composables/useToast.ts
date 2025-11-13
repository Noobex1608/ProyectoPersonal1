import { ref } from 'vue'

interface ToastOptions {
  type?: 'success' | 'error' | 'info' | 'warning'
  duration?: number
}

interface Toast {
  id: number
  message: string
  type: 'success' | 'error' | 'info' | 'warning'
}

const toasts = ref<Toast[]>([])
let toastId = 0

export function useToast() {
  const show = (message: string, options: ToastOptions = {}) => {
    const { type = 'info', duration = 3000 } = options
    
    const id = toastId++
    const toast: Toast = { id, message, type }
    
    toasts.value.push(toast)
    
    if (duration > 0) {
      setTimeout(() => {
        remove(id)
      }, duration)
    }
    
    return id
  }

  const success = (message: string, duration?: number) => {
    return show(message, { type: 'success', duration })
  }

  const error = (message: string, duration?: number) => {
    return show(message, { type: 'error', duration })
  }

  const info = (message: string, duration?: number) => {
    return show(message, { type: 'info', duration })
  }

  const warning = (message: string, duration?: number) => {
    return show(message, { type: 'warning', duration })
  }

  const remove = (id: number) => {
    const index = toasts.value.findIndex(t => t.id === id)
    if (index !== -1) {
      toasts.value.splice(index, 1)
    }
  }

  const clear = () => {
    toasts.value = []
  }

  return {
    toasts,
    show,
    success,
    error,
    info,
    warning,
    remove,
    clear
  }
}
