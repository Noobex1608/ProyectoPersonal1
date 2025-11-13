import { format, formatDistanceToNow, isToday, isTomorrow, isPast, isThisWeek } from 'date-fns'
import { es } from 'date-fns/locale'

export function useDate() {
  const formatDate = (date: string | Date, formatStr: string = 'PP') => {
    return format(new Date(date), formatStr, { locale: es })
  }

  const formatDateTime = (date: string | Date) => {
    return format(new Date(date), 'PPp', { locale: es })
  }

  const formatTimeAgo = (date: string | Date) => {
    return formatDistanceToNow(new Date(date), { addSuffix: true, locale: es })
  }

  const formatDueDate = (date: string | Date | null) => {
    if (!date) return 'Sin fecha'
    
    const d = new Date(date)
    
    if (isToday(d)) return 'Hoy'
    if (isTomorrow(d)) return 'Mañana'
    if (isThisWeek(d)) return format(d, 'EEEE', { locale: es })
    
    return format(d, 'dd MMM', { locale: es })
  }

  const isDueSoon = (date: string | Date | null, days: number = 3) => {
    if (!date) return false
    
    const d = new Date(date)
    const now = new Date()
    const diffTime = d.getTime() - now.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    
    return diffDays >= 0 && diffDays <= days
  }

  const isOverdue = (date: string | Date | null) => {
    if (!date) return false
    return isPast(new Date(date)) && !isToday(new Date(date))
  }

  return {
    formatDate,
    formatDateTime,
    formatTimeAgo,
    formatDueDate,
    isDueSoon,
    isOverdue
  }
}
