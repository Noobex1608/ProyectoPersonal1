<template>
  <nav class="navbar">
    <div class="nav-container">
      <div class="nav-brand">
        <router-link to="/">
          <ClipboardDocumentListIcon class="logo-icon" />
          <h1>Lista de Tareas</h1>
        </router-link>
      </div>

      <div class="nav-menu" :class="{ active: menuOpen }">
        <router-link to="/" class="nav-link" @click="closeMenu">
          <ChartBarIcon class="nav-icon" />
          Dashboard
        </router-link>
        <router-link to="/todos" class="nav-link" @click="closeMenu">
          <CheckCircleIcon class="nav-icon" />
          Tareas
        </router-link>
        <router-link to="/study-mode" class="nav-link" @click="closeMenu">
          <AcademicCapIcon class="nav-icon" />
          Modo Estudio
        </router-link>
        <router-link to="/categories" class="nav-link" @click="closeMenu">
          <FolderIcon class="nav-icon" />
          Categorías
        </router-link>
        <router-link to="/profile" class="nav-link" @click="closeMenu">
          <UserCircleIcon class="nav-icon" />
          Perfil
        </router-link>
      </div>

      <div class="nav-actions">
        <button v-if="user" @click="handleSignOut" class="btn-signout">
          <ArrowRightOnRectangleIcon class="btn-icon" />
          Cerrar Sesión
        </button>
        <button class="menu-toggle" @click="toggleMenu">
          <Bars3Icon v-if="!menuOpen" class="menu-icon" />
          <XMarkIcon v-else class="menu-icon" />
        </button>
      </div>
    </div>
  </nav>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { useToast } from '../composables/useToast'
import { 
  ClipboardDocumentListIcon,
  ChartBarIcon,
  CheckCircleIcon,
  FolderIcon,
  AcademicCapIcon,
  UserCircleIcon,
  ArrowRightOnRectangleIcon,
  Bars3Icon,
  XMarkIcon
} from '@heroicons/vue/24/outline'

const router = useRouter()
const authStore = useAuthStore()
const { success, error } = useToast()

const menuOpen = ref(false)

const user = computed(() => authStore.user)

function toggleMenu() {
  menuOpen.value = !menuOpen.value
}

function closeMenu() {
  menuOpen.value = false
}

async function handleSignOut() {
  try {
    await authStore.signOut()
    success('Sesión cerrada exitosamente')
    router.push('/login')
  } catch (err) {
    error('Error al cerrar sesión')
  }
}
</script>

<style scoped>
.navbar {
  background: white;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  position: sticky;
  top: 0;
  z-index: 100;
}

.nav-container {
  max-width: 1400px;
  margin: 0 auto;
  padding: 0.75rem 2rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 2rem;
}

.nav-brand {
  flex-shrink: 0;
}

.nav-brand h1 {
  margin: 0;
  font-size: 1.25rem;
  color: #1f2937;
  white-space: nowrap;
}

.nav-brand a {
  text-decoration: none;
  color: inherit;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.logo-icon {
  width: 1.75rem;
  height: 1.75rem;
  color: var(--color-primary);
}

.nav-menu {
  display: flex;
  gap: 0.5rem;
  align-items: center;
  flex: 1;
  justify-content: center;
}

.nav-link {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  text-decoration: none;
  color: #6b7280;
  font-weight: 500;
  font-size: 0.9rem;
  transition: all 0.2s;
  padding: 0.625rem 0.875rem;
  border-radius: 0.5rem;
  white-space: nowrap;
}

.nav-link:hover {
  color: #3b82f6;
  background: #eff6ff;
}

.nav-link.router-link-active {
  color: #3b82f6;
  background: #eff6ff;
}

.nav-icon {
  width: 1.25rem;
  height: 1.25rem;
}

.nav-actions {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.btn-signout {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.625rem 1rem;
  background: #ef4444;
  color: white;
  border: none;
  border-radius: 0.5rem;
  font-weight: 500;
  font-size: 0.9rem;
  cursor: pointer;
  transition: background 0.2s;
  white-space: nowrap;
  flex-shrink: 0;
}

.btn-signout:hover {
  background: #dc2626;
}

.btn-icon {
  width: 1.25rem;
  height: 1.25rem;
}

.menu-toggle {
  display: none;
  background: none;
  border: none;
  cursor: pointer;
  padding: 0.5rem;
}

.menu-icon {
  width: 1.75rem;
  height: 1.75rem;
  color: var(--color-gray-900);
}

@media (max-width: 1024px) {
  .nav-menu {
    gap: 0.25rem;
  }

  .nav-link {
    padding: 0.5rem 0.75rem;
    font-size: 0.85rem;
  }

  .nav-brand h1 {
    font-size: 1.1rem;
  }

  .btn-signout {
    padding: 0.5rem 0.875rem;
    font-size: 0.85rem;
  }
}

@media (max-width: 768px) {
  .nav-container {
    padding: 1rem;
  }

  .menu-toggle {
    display: flex;
  }

  .nav-menu {
    position: absolute;
    top: 100%;
    left: 0;
    right: 0;
    background: white;
    flex-direction: column;
    padding: 1rem;
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
    transform: translateY(-100%);
    opacity: 0;
    pointer-events: none;
    transition: all 0.3s;
  }

  .nav-menu.active {
    transform: translateY(0);
    opacity: 1;
    pointer-events: all;
  }

  .nav-link {
    width: 100%;
    justify-content: flex-start;
  }

  .btn-signout {
    display: none;
  }

  .nav-menu.active ~ .nav-actions .btn-signout {
    display: block;
    width: 100%;
    margin-top: 1rem;
  }
}
</style>
