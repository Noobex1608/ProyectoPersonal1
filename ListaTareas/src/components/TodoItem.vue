<template>
  <div class="todo-item" :class="[`priority-${todo.priority}`, { completed: todo.status === 'completed' }]">
    <div class="todo-header">
      <div class="todo-checkbox">
        <input 
          type="checkbox" 
          :checked="todo.status === 'completed'" 
          @change="$emit('toggle', todo.id)"
          :id="`todo-${todo.id}`"
        />
        <label :for="`todo-${todo.id}`"></label>
      </div>
      
      <div class="todo-content" @click="$emit('edit', todo)">
        <h3 class="todo-title">{{ todo.title }}</h3>
        <p v-if="todo.description" class="todo-description">{{ todo.description }}</p>
        
        <div class="todo-meta">
          <span v-if="todo.category" class="category-badge" :style="{ backgroundColor: todo.category.color }">
            <span v-if="todo.category.icon">{{ todo.category.icon }}</span>
            {{ todo.category.name }}
          </span>
          
          <span v-if="todo.due_date" class="due-date" :class="dueDateClass">
            <CalendarIcon class="meta-icon" />
            {{ formatDueDate(todo.due_date) }}
          </span>
          
          <span class="priority-badge">{{ priorityLabel }}</span>
        </div>

        <div v-if="todo.tags && todo.tags.length" class="tags">
          <span v-for="tag in todo.tags" :key="tag.id" class="tag">
            #{{ tag.name }}
          </span>
        </div>

        <div v-if="todo.subtasks && todo.subtasks.length" class="subtasks-progress">
          <span>{{ completedSubtasks }}/{{ todo.subtasks.length }} subtareas</span>
          <div class="progress-bar">
            <div class="progress-fill" :style="{ width: subtasksProgress + '%' }"></div>
          </div>
        </div>
      </div>

      <div class="todo-actions">
        <button @click="$emit('edit', todo)" class="btn-icon" title="Editar">
          <PencilIcon class="action-icon" />
        </button>
        <button @click="$emit('delete', todo.id)" class="btn-icon btn-danger" title="Eliminar">
          <TrashIcon class="action-icon" />
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { TodoWithRelations } from '../interfaces'
import { useDate } from '../composables/useDate'
import { PencilIcon, TrashIcon, CalendarIcon } from '@heroicons/vue/24/outline'

interface Props {
  todo: TodoWithRelations
}

const props = defineProps<Props>()

defineEmits<{
  toggle: [id: string]
  edit: [todo: TodoWithRelations]
  delete: [id: string]
}>()

const { formatDueDate, isOverdue, isDueSoon } = useDate()

const priorityLabel = computed(() => {
  const labels = {
    low: 'Baja',
    medium: 'Media',
    high: 'Alta',
    urgent: 'Urgente'
  }
  return labels[props.todo.priority]
})

const dueDateClass = computed(() => {
  if (!props.todo.due_date) return ''
  if (isOverdue(props.todo.due_date)) return 'overdue'
  if (isDueSoon(props.todo.due_date)) return 'due-soon'
  return ''
})

const completedSubtasks = computed(() => {
  return props.todo.subtasks?.filter(s => s.completed).length || 0
})

const subtasksProgress = computed(() => {
  if (!props.todo.subtasks || props.todo.subtasks.length === 0) return 0
  return (completedSubtasks.value / props.todo.subtasks.length) * 100
})
</script>

<style scoped>
.todo-item {
  background: white;
  border-radius: 8px;
  padding: 1rem;
  margin-bottom: 0.75rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  transition: all 0.2s;
  border-left: 4px solid;
}

.todo-item:hover {
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.15);
  transform: translateY(-2px);
}

.todo-item.completed {
  opacity: 0.7;
}

.todo-item.priority-low { border-left-color: #10b981; }
.todo-item.priority-medium { border-left-color: #f59e0b; }
.todo-item.priority-high { border-left-color: #ef4444; }
.todo-item.priority-urgent { border-left-color: #dc2626; }

.todo-header {
  display: flex;
  gap: 1rem;
  align-items: flex-start;
}

.todo-checkbox {
  flex-shrink: 0;
  margin-top: 0.25rem;
}

.todo-checkbox input[type="checkbox"] {
  width: 20px;
  height: 20px;
  cursor: pointer;
}

.todo-content {
  flex: 1;
  cursor: pointer;
}

.todo-title {
  font-size: 1.1rem;
  font-weight: 600;
  margin: 0 0 0.25rem 0;
  color: #1f2937;
}

.completed .todo-title {
  text-decoration: line-through;
  color: #9ca3af;
}

.todo-description {
  font-size: 0.9rem;
  color: #6b7280;
  margin: 0.25rem 0 0.5rem 0;
}

.todo-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-top: 0.5rem;
}

.category-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.25rem 0.75rem;
  border-radius: 9999px;
  font-size: 0.75rem;
  font-weight: 500;
  color: white;
}

.due-date {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.25rem 0.75rem;
  border-radius: 9999px;
  font-size: 0.75rem;
  background: #e5e7eb;
  color: #374151;
}

.meta-icon {
  width: 0.875rem;
  height: 0.875rem;
}

.due-date.overdue {
  background: #fee2e2;
  color: #dc2626;
}

.due-date.due-soon {
  background: #fef3c7;
  color: #f59e0b;
}

.priority-badge {
  padding: 0.25rem 0.75rem;
  border-radius: 9999px;
  font-size: 0.75rem;
  background: #f3f4f6;
  color: #4b5563;
}

.tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-top: 0.5rem;
}

.tag {
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-size: 0.75rem;
  background: #dbeafe;
  color: #1e40af;
}

.subtasks-progress {
  margin-top: 0.75rem;
  font-size: 0.875rem;
  color: #6b7280;
}

.progress-bar {
  width: 100%;
  height: 6px;
  background: #e5e7eb;
  border-radius: 3px;
  margin-top: 0.25rem;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: #3b82f6;
  transition: width 0.3s;
}

.todo-actions {
  display: flex;
  gap: 0.5rem;
  flex-shrink: 0;
}

.btn-icon {
  background: none;
  border: none;
  padding: 0.5rem;
  cursor: pointer;
  border-radius: 4px;
  transition: background 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.action-icon {
  width: 1.25rem;
  height: 1.25rem;
  color: var(--color-gray-600);
}

.btn-icon:hover {
  background: #f3f4f6;
}

.btn-danger:hover {
  background: #fee2e2;
}

.btn-danger .action-icon {
  color: #ef4444;
}
</style>
