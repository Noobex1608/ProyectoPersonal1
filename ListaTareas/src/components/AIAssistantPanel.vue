<template>
  <div class="ai-assistant-panel">
    <div class="panel-header">
      <div class="header-content">
        <div class="icon-wrapper">
          <svg class="sparkles-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
          </svg>
        </div>
        <h2>Asistente IA</h2>
      </div>
      <button @click="toggleExpanded" class="toggle-button">
        <svg v-if="!isExpanded" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
        </svg>
        <svg v-else fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15l7-7 7 7" />
        </svg>
      </button>
    </div>

    <transition name="slide-fade">
      <div v-if="isExpanded" class="panel-content">
        <div class="features-grid">
          <!-- Análisis de Productividad -->
          <div class="feature-card" @click="activeFeature = 'productivity'">
            <div class="feature-icon productivity">
              <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <h3>Productividad</h3>
            <p>Análisis y tendencias</p>
          </div>

          <!-- Generador de Subtareas -->
          <div class="feature-card" @click="activeFeature = 'subtasks'">
            <div class="feature-icon subtasks">
              <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
            </div>
            <h3>Subtareas</h3>
            <p>Divide tareas complejas</p>
          </div>

          <!-- Resumen Diario -->
          <div class="feature-card" @click="activeFeature = 'summary'">
            <div class="feature-icon summary">
              <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3>Resumen</h3>
            <p>Tu día en resumen</p>
          </div>

          <!-- Detector de Conflictos -->
          <div class="feature-card" @click="activeFeature = 'conflicts'">
            <div class="feature-icon conflicts">
              <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3>Conflictos</h3>
            <p>Detecta sobrecargas</p>
          </div>
        </div>

        <!-- Área de contenido activo -->
        <transition name="fade" mode="out-in">
          <div v-if="activeFeature" class="feature-content">
            <ProductivityChart v-if="activeFeature === 'productivity'" />
            <SubtaskGenerator v-else-if="activeFeature === 'subtasks'" />
            <DailySummary v-else-if="activeFeature === 'summary'" />
            <ConflictDetector v-else-if="activeFeature === 'conflicts'" />
          </div>
        </transition>
      </div>
    </transition>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import ProductivityChart from './ProductivityChart.vue'
import SubtaskGenerator from './SubtaskGenerator.vue'
import DailySummary from './DailySummary.vue'
import ConflictDetector from './ConflictDetector.vue'

const isExpanded = ref(false)
const activeFeature = ref<'productivity' | 'subtasks' | 'summary' | 'conflicts' | null>(null)

const toggleExpanded = () => {
  isExpanded.value = !isExpanded.value
  if (!isExpanded.value) {
    activeFeature.value = null
  }
}
</script>

<style scoped>
.ai-assistant-panel {
  background: linear-gradient(135deg, #F06543 0%, #F09D51 100%);
  border-radius: 16px;
  box-shadow: 0 10px 30px rgba(240, 101, 67, 0.3);
  overflow: hidden;
  margin-bottom: 2rem;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem;
  cursor: pointer;
  user-select: none;
}

.header-content {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.icon-wrapper {
  width: 40px;
  height: 40px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.sparkles-icon {
  width: 24px;
  height: 24px;
  color: white;
  animation: sparkle 2s ease-in-out infinite;
}

@keyframes sparkle {
  0%, 100% { transform: scale(1) rotate(0deg); opacity: 1; }
  50% { transform: scale(1.1) rotate(5deg); opacity: 0.8; }
}

.panel-header h2 {
  color: white;
  font-size: 1.5rem;
  font-weight: 700;
  margin: 0;
}

.toggle-button {
  background: rgba(255, 255, 255, 0.2);
  border: none;
  border-radius: 8px;
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.3s ease;
}

.toggle-button:hover {
  background: rgba(255, 255, 255, 0.3);
  transform: scale(1.05);
}

.toggle-button svg {
  width: 20px;
  height: 20px;
  color: white;
}

.panel-content {
  padding: 0 1.5rem 1.5rem;
}

.features-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.feature-card {
  background: white;
  border-radius: 12px;
  padding: 1.5rem;
  text-align: center;
  cursor: pointer;
  transition: all 0.3s ease;
}

.feature-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15);
}

.feature-icon {
  width: 48px;
  height: 48px;
  margin: 0 auto 0.75rem;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.feature-icon svg {
  width: 28px;
  height: 28px;
  color: white;
}

.feature-icon.productivity {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.feature-icon.subtasks {
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
}

.feature-icon.summary {
  background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
}

.feature-icon.conflicts {
  background: linear-gradient(135deg, #fa709a 0%, #fee140 100%);
}

.feature-card h3 {
  color: #313638;
  font-size: 1rem;
  font-weight: 600;
  margin: 0 0 0.25rem;
}

.feature-card p {
  color: #6c757d;
  font-size: 0.875rem;
  margin: 0;
}

.feature-content {
  background: white;
  border-radius: 12px;
  padding: 1.5rem;
  min-height: 300px;
}

/* Animaciones */
.slide-fade-enter-active {
  transition: all 0.3s ease;
}

.slide-fade-leave-active {
  transition: all 0.2s ease;
}

.slide-fade-enter-from {
  transform: translateY(-20px);
  opacity: 0;
}

.slide-fade-leave-to {
  transform: translateY(-10px);
  opacity: 0;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

@media (max-width: 768px) {
  .features-grid {
    grid-template-columns: repeat(2, 1fr);
  }
  
  .panel-header h2 {
    font-size: 1.25rem;
  }
}
</style>
